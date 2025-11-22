import { NextRequest, NextResponse } from 'next/server'
import { orderCreationSchema } from '@/lib/schemas'
import { calculateQuote, calculateTotalQuantity, calculateTotalQuantityFromColors } from '@/lib/pricing'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
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
    
    // Get quote to calculate pricing
    const quote = await calculateQuote(
      validatedData.garment_id,
      totalQuantity,
      validatedData.print_config
    )
    
    // Create order
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .insert({
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
        total_quantity: totalQuantity,
        print_config: validatedData.print_config,
        total_cost: quote.total,
        deposit_amount: quote.deposit_amount,
        deposit_paid: false,
        balance_due: quote.balance_due,
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

