import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { calculateQuote, calculateTotalQuantityFromColors } from '@/lib/pricing'
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
        total_cost: quote.total,
        deposit_amount: quote.deposit_amount,
        deposit_paid: true,
        balance_due: quote.balance_due,
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
