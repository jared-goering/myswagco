import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { orderCreationSchema } from '@/lib/schemas'

// Force dynamic rendering for routes using cookies/auth
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
import { calculateQuote, calculateGarmentCost, calculatePrintCost, calculateTotalQuantity, calculateTotalQuantityFromColors, getDepositPercentage } from '@/lib/pricing'
import { supabaseAdmin } from '@/lib/supabase/server'

// Helper to get current user
async function getCurrentUser() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.delete({ name, ...options })
        },
      },
    }
  )
  
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Check if user is authenticated
    const user = await getCurrentUser()
    
    // Validate request
    const validatedData = orderCreationSchema.parse(body)
    
    // Calculate total quantity (supports both legacy and multi-color)
    let totalQuantity: number
    if (validatedData.color_size_quantities) {
      totalQuantity = calculateTotalQuantityFromColors(validatedData.color_size_quantities)
    } else if (validatedData.size_quantities) {
      totalQuantity = calculateTotalQuantity(validatedData.size_quantities as Record<string, number>)
    } else {
      return NextResponse.json(
        { error: 'Size quantities are required' },
        { status: 400 }
      )
    }
    
    // Validate minimum quantity
    if (totalQuantity < 24) {
      return NextResponse.json(
        { error: 'Minimum order quantity is 24 pieces' },
        { status: 400 }
      )
    }
    
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
    if (validatedData.selected_garments && Object.keys(validatedData.selected_garments).length > 0) {
      // Multi-garment order - calculate breakdown for each garment
      const garmentBreakdown: { garment_id: string; name: string; quantity: number; cost_per_shirt: number; total: number }[] = []
      let totalGarmentCost = 0
      
      // Fetch garment names
      const garmentIds = Object.keys(validatedData.selected_garments)
      const { data: garmentsData } = await supabaseAdmin
        .from('garments')
        .select('id, name')
        .in('id', garmentIds)
      const garmentNames = Object.fromEntries((garmentsData || []).map(g => [g.id, g.name]))
      
      for (const [garmentId, selection] of Object.entries(validatedData.selected_garments)) {
        const sel = selection as { colorSizeQuantities: Record<string, Record<string, number>> }
        let garmentQty = 0
        Object.values(sel.colorSizeQuantities || {}).forEach(sizeQty => {
          Object.values(sizeQty).forEach(qty => { garmentQty += qty || 0 })
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
      
      // Calculate print costs based on total quantity
      const printResult = await calculatePrintCost(totalQuantity, validatedData.print_config)
      
      // Calculate per-shirt averages
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
      // Single-garment order
      const quote = await calculateQuote(
        validatedData.garment_id,
        totalQuantity,
        validatedData.print_config
      )
      
      pricingBreakdown = {
        garment_cost_per_shirt: quote.garment_cost_per_shirt,
        print_cost_per_shirt: quote.print_cost_per_shirt,
        setup_fees: quote.setup_fees,
        total_screens: quote.total_screens,
        per_shirt_total: quote.per_shirt_price
      }
    }
    
    // Get quote to calculate final pricing
    const quote = await calculateQuote(
      validatedData.garment_id,
      totalQuantity,
      validatedData.print_config
    )
    
    // For multi-garment orders, recalculate total based on actual garment breakdown
    let finalTotal = quote.total
    if (pricingBreakdown.garment_breakdown && pricingBreakdown.garment_breakdown.length > 0) {
      const totalGarmentCost = pricingBreakdown.garment_breakdown.reduce((sum, g) => sum + g.total, 0)
      const printResult = await calculatePrintCost(totalQuantity, validatedData.print_config)
      finalTotal = totalGarmentCost + printResult.totalCost
    }
    
    // Apply discount if provided
    const discountAmount = validatedData.discount_amount || 0
    const discountedTotal = Math.max(0, finalTotal - discountAmount)
    const depositPercentage = await getDepositPercentage()
    const discountedDeposit = Math.round((discountedTotal * (depositPercentage / 100)) * 100) / 100
    const discountedBalance = discountedTotal - discountedDeposit
    
    // Create order (link to customer account if logged in)
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .insert({
        customer_id: user?.id || null, // Link to customer if authenticated
        customer_name: validatedData.customer_name,
        email: validatedData.email,
        phone: validatedData.phone,
        shipping_address: validatedData.shipping_address,
        organization_name: validatedData.organization_name,
        need_by_date: validatedData.need_by_date,
        garment_id: validatedData.garment_id,
        garment_color: validatedData.garment_color || (validatedData.color_size_quantities ? Object.keys(validatedData.color_size_quantities)[0] : ''),
        size_quantities: validatedData.size_quantities || {},
        color_size_quantities: validatedData.color_size_quantities,
        selected_garments: validatedData.selected_garments || null,
        total_quantity: totalQuantity,
        print_config: validatedData.print_config,
        total_cost: discountedTotal,
        deposit_amount: discountedDeposit,
        deposit_paid: false,
        balance_due: discountedBalance,
        discount_code_id: validatedData.discount_code_id || null,
        discount_amount: discountAmount,
        pricing_breakdown: pricingBreakdown,
        status: 'pending_art_review'
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating order:', error)
      throw error
    }
    
    // Log order creation activity
    await supabaseAdmin
      .from('order_activity')
      .insert({
        order_id: order.id,
        activity_type: 'status_change',
        description: 'Order created and awaiting art review',
        performed_by: 'system'
      })
    
    // If user is authenticated, update their customer profile with checkout info for faster future checkouts
    if (user?.id) {
      try {
        // Build update object with only the fields that have values
        const customerUpdates: Record<string, any> = {}
        
        if (validatedData.customer_name) {
          customerUpdates.name = validatedData.customer_name
        }
        
        if (validatedData.phone) {
          customerUpdates.phone = validatedData.phone
        }
        
        if (validatedData.organization_name) {
          customerUpdates.organization_name = validatedData.organization_name
        }
        
        // Update shipping address if provided
        if (validatedData.shipping_address && validatedData.shipping_address.line1) {
          customerUpdates.default_shipping_address = validatedData.shipping_address
        }
        
        // Only update if we have something to update
        if (Object.keys(customerUpdates).length > 0) {
          const { error: updateError } = await supabaseAdmin
            .from('customers')
            .update({
              ...customerUpdates,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id)
          
          if (updateError) {
            // Log but don't fail the order - this is a nice-to-have
            console.error('Error updating customer profile:', updateError)
          } else {
            console.log(`Updated customer profile for user ${user.id} with checkout info`)
          }
        }
      } catch (updateErr) {
        // Log but don't fail the order
        console.error('Error in customer profile update:', updateErr)
      }
    }
    
    return NextResponse.json(order)
  } catch (error: any) {
    console.error('Error creating order:', error)
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid order data', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    
    let query = supabaseAdmin
      .from('orders')
      .select('*, garments(name, brand)')
      .order('created_at', { ascending: false })
    
    if (status) {
      query = query.eq('status', status)
    }
    
    const { data: orders, error } = await query
    
    if (error) {
      throw error
    }
    
    return NextResponse.json(orders)
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

