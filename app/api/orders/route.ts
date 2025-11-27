import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { orderCreationSchema } from '@/lib/schemas'
import { calculateQuote, calculateTotalQuantity, calculateTotalQuantityFromColors } from '@/lib/pricing'
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
    
    // Get quote to calculate pricing
    const quote = await calculateQuote(
      validatedData.garment_id,
      totalQuantity,
      validatedData.print_config
    )
    
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

