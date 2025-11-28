import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { calculateQuote, calculateTotalQuantityFromColors, calculateGarmentCost, calculatePrintCost } from '@/lib/pricing'
import { sendOrderConfirmationEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { pendingOrderId, paymentIntentId } = await request.json()

    if (!pendingOrderId) {
      return NextResponse.json(
        { error: 'Missing pending order ID' },
        { status: 400 }
      )
    }

    // Check if order already exists for this payment intent
    if (paymentIntentId) {
      const { data: existingOrder } = await supabaseAdmin
        .from('orders')
        .select('id')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .single()

      if (existingOrder) {
        return NextResponse.json(existingOrder)
      }
    }

    // Atomically fetch AND delete the pending order to prevent race conditions
    // If another request already processed it, this will return no data
    const { data: pendingOrder, error: fetchError } = await supabaseAdmin
      .from('pending_orders')
      .delete()
      .eq('id', pendingOrderId)
      .select('*')
      .single()

    if (fetchError || !pendingOrder) {
      // Pending order was already processed by another request, or doesn't exist
      // Check if the order was already created
      if (paymentIntentId) {
        const { data: existingOrder } = await supabaseAdmin
          .from('orders')
          .select('id')
          .eq('stripe_payment_intent_id', paymentIntentId)
          .single()

        if (existingOrder) {
          return NextResponse.json(existingOrder)
        }
      }
      
      return NextResponse.json(
        { error: 'Pending order not found or already processed' },
        { status: 404 }
      )
    }

    // Calculate pricing
    const totalQuantity = calculateTotalQuantityFromColors(pendingOrder.color_size_quantities)
    const quote = await calculateQuote(
      pendingOrder.garment_id,
      totalQuantity,
      pendingOrder.print_config
    )

    // Calculate pricing breakdown for storage
    let pricingBreakdown: {
      garment_cost_per_shirt: number
      print_cost_per_shirt: number
      setup_fees: number
      total_screens: number
      per_shirt_total: number
      garment_breakdown?: { garment_id: string; name: string; quantity: number; cost_per_shirt: number; total: number }[]
    }
    
    // Check if this is a multi-garment order
    if (pendingOrder.selected_garments && Object.keys(pendingOrder.selected_garments).length > 0) {
      const garmentBreakdown: { garment_id: string; name: string; quantity: number; cost_per_shirt: number; total: number }[] = []
      let totalGarmentCost = 0
      
      const garmentIds = Object.keys(pendingOrder.selected_garments)
      const { data: garmentsData } = await supabaseAdmin
        .from('garments')
        .select('id, name')
        .in('id', garmentIds)
      const garmentNames = Object.fromEntries((garmentsData || []).map((g: any) => [g.id, g.name]))
      
      for (const [garmentId, selection] of Object.entries(pendingOrder.selected_garments)) {
        const sel = selection as { colorSizeQuantities: Record<string, Record<string, number>> }
        let garmentQty = 0
        Object.values(sel.colorSizeQuantities || {}).forEach((sizeQty: any) => {
          Object.values(sizeQty).forEach((qty: any) => { garmentQty += qty || 0 })
        })
        
        if (garmentQty > 0) {
          const { totalCost, costPerShirt } = await calculateGarmentCost(garmentId, garmentQty)
          garmentBreakdown.push({
            garment_id: garmentId,
            name: garmentNames[garmentId] || 'Unknown',
            quantity: garmentQty,
            cost_per_shirt: costPerShirt,
            total: totalCost
          })
          totalGarmentCost += totalCost
        }
      }
      
      const printResult = await calculatePrintCost(totalQuantity, pendingOrder.print_config)
      const avgGarmentCostPerShirt = totalGarmentCost / totalQuantity
      
      pricingBreakdown = {
        garment_cost_per_shirt: avgGarmentCostPerShirt,
        print_cost_per_shirt: printResult.costPerShirt,
        setup_fees: printResult.setupFees,
        total_screens: printResult.totalScreens,
        per_shirt_total: (totalGarmentCost + printResult.totalCost) / totalQuantity,
        garment_breakdown: garmentBreakdown
      }
    } else {
      pricingBreakdown = {
        garment_cost_per_shirt: quote.garment_cost_per_shirt,
        print_cost_per_shirt: quote.print_cost_per_shirt,
        setup_fees: quote.setup_fees,
        total_screens: quote.total_screens,
        per_shirt_total: quote.per_shirt_price
      }
    }

    // Calculate actual total - for multi-garment orders, use the breakdown calculation
    let actualTotal = quote.total
    if (pricingBreakdown.garment_breakdown && pricingBreakdown.garment_breakdown.length > 0) {
      const totalGarmentCost = pricingBreakdown.garment_breakdown.reduce((sum, g) => sum + g.total, 0)
      const printResult = await calculatePrintCost(totalQuantity, pendingOrder.print_config)
      actualTotal = totalGarmentCost + printResult.totalCost
    }
    
    // Apply discount if one was used
    const discountAmount = pendingOrder.discount_amount || 0
    const discountedTotal = Math.max(0, actualTotal - discountAmount)
    const depositRatio = quote.deposit_amount / quote.total
    const discountedDeposit = Math.round(discountedTotal * depositRatio * 100) / 100
    const discountedBalance = discountedTotal - discountedDeposit

    // Create the actual order
    const { data: newOrder, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        customer_id: pendingOrder.customer_id,
        customer_name: pendingOrder.customer_name,
        email: pendingOrder.email,
        phone: pendingOrder.phone,
        shipping_address: pendingOrder.shipping_address,
        organization_name: pendingOrder.organization_name,
        need_by_date: pendingOrder.need_by_date,
        garment_id: pendingOrder.garment_id,
        garment_color: Object.keys(pendingOrder.color_size_quantities || {})[0] || '',
        size_quantities: {},
        color_size_quantities: pendingOrder.color_size_quantities,
        selected_garments: pendingOrder.selected_garments,
        total_quantity: totalQuantity,
        print_config: pendingOrder.print_config,
        total_cost: discountedTotal,
        deposit_amount: discountedDeposit,
        deposit_paid: true,
        balance_due: discountedBalance,
        discount_code_id: pendingOrder.discount_code_id || null,
        discount_amount: discountAmount > 0 ? discountAmount : null,
        pricing_breakdown: pricingBreakdown,
        status: 'pending_art_review',
        stripe_payment_intent_id: paymentIntentId || null
      })
      .select()
      .single()

    if (orderError) {
      console.error('Error creating order:', orderError)
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      )
    }

    // Log order creation
    await supabaseAdmin
      .from('order_activity')
      .insert({
        order_id: newOrder.id,
        activity_type: 'status_change',
        description: 'Order created after successful payment',
        performed_by: 'system'
      })

    // Log payment received
    await supabaseAdmin
      .from('order_activity')
      .insert({
        order_id: newOrder.id,
        activity_type: 'payment_received',
        description: `Deposit payment received`,
        performed_by: 'system',
        metadata: { payment_intent_id: paymentIntentId }
      })

    // Create artwork_files records from uploaded temp files
    if (pendingOrder.artwork_data && Array.isArray(pendingOrder.artwork_data)) {
      for (const artwork of pendingOrder.artwork_data) {
        if (artwork.file_url) {
          const isVector = artwork.file_name?.toLowerCase().endsWith('.svg') || 
                          artwork.file_name?.toLowerCase().endsWith('.ai') ||
                          artwork.file_name?.toLowerCase().endsWith('.eps')
          
          await supabaseAdmin
            .from('artwork_files')
            .insert({
              order_id: newOrder.id,
              location: artwork.location,
              file_url: artwork.file_url,
              file_name: artwork.file_name || 'artwork',
              file_size: 0,
              is_vector: isVector,
              vectorization_status: isVector ? 'not_needed' : 'pending',
              transform: artwork.transform || null
            })
        }
      }
    }

    // Send confirmation email
    try {
      await sendOrderConfirmationEmail(
        newOrder.email,
        newOrder.customer_name,
        newOrder.id,
        newOrder.total_cost,
        newOrder.deposit_amount
      )
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError)
      // Don't fail the order creation if email fails
    }

    // Pending order was already deleted atomically at the start
    return NextResponse.json(newOrder)
  } catch (error: any) {
    console.error('Error creating order from pending:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create order' },
      { status: 500 }
    )
  }
}
