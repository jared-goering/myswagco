import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase/server'

// Force dynamic rendering for routes using cookies/auth
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

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

// GET - List orders for a campaign (organizer only for detailed view)
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params
    
    // Get the campaign
    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('id, organizer_id, garment_configs')
      .eq('slug', slug)
      .single()
    
    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }
    
    const user = await getCurrentUser()
    const isOwner = user?.id === campaign.organizer_id
    
    // If not owner, only return aggregate data
    if (!isOwner) {
      const { data: orders } = await supabaseAdmin
        .from('campaign_orders')
        .select('size, color, quantity, garment_id')
        .eq('campaign_id', campaign.id)
        .not('status', 'eq', 'cancelled')
      
      const sizeBreakdown: Record<string, number> = {}
      const colorBreakdown: Record<string, number> = {}
      const garmentBreakdown: Record<string, number> = {}
      let totalQuantity = 0
      
      orders?.forEach(order => {
        sizeBreakdown[order.size] = (sizeBreakdown[order.size] || 0) + order.quantity
        colorBreakdown[order.color] = (colorBreakdown[order.color] || 0) + order.quantity
        if (order.garment_id) {
          garmentBreakdown[order.garment_id] = (garmentBreakdown[order.garment_id] || 0) + order.quantity
        }
        totalQuantity += order.quantity
      })
      
      return NextResponse.json({
        total_orders: orders?.length || 0,
        total_quantity: totalQuantity,
        size_breakdown: sizeBreakdown,
        color_breakdown: colorBreakdown,
        garment_breakdown: garmentBreakdown,
      })
    }
    
    // Owner gets full order list with garment info
    const { data: orders, error } = await supabaseAdmin
      .from('campaign_orders')
      .select(`
        *,
        garments(id, name, brand, thumbnail_url)
      `)
      .eq('campaign_id', campaign.id)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching orders:', error)
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      )
    }
    
    // Transform garments to garment for consistency
    const ordersWithGarment = orders?.map(order => ({
      ...order,
      garment: order.garments,
      garments: undefined,
    }))
    
    return NextResponse.json(ordersWithGarment)
  } catch (error: any) {
    console.error('Error in campaign orders list:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// POST - Create a new order (participant checkout)
// Supports both single-item and multi-item orders
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params
    const body = await request.json()
    
    // Validate required fields
    if (!body.participant_name || !body.participant_email) {
      return NextResponse.json(
        { error: 'Missing required fields: participant_name, participant_email' },
        { status: 400 }
      )
    }
    
    // Get the campaign with garment configs
    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('id, status, payment_style, price_per_shirt, selected_colors, garment_id, garment_configs')
      .eq('slug', slug)
      .single()
    
    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }
    
    // Check if campaign is active
    if (campaign.status !== 'active') {
      return NextResponse.json(
        { error: 'This campaign is no longer accepting orders' },
        { status: 400 }
      )
    }
    
    // Determine initial status based on payment style
    let initialStatus = 'pending'
    if (campaign.payment_style === 'organizer_pays') {
      initialStatus = 'confirmed'
    }
    
    // Check if this is a multi-item order (array of items) or single item
    const items = body.items || [body] // Support both formats
    const isMultiItem = Array.isArray(body.items) && body.items.length > 0
    
    // Validate and create orders for each item
    const createdOrders = []
    let totalAmountDue = 0
    
    for (const item of items) {
      // Validate required item fields
      if (!item.size || !item.color) {
        return NextResponse.json(
          { error: 'Each item must have size and color' },
          { status: 400 }
        )
      }
      
      const quantity = item.quantity || 1
      let garmentId = item.garment_id || campaign.garment_id
      let pricePerShirt = campaign.price_per_shirt
      let validColors = campaign.selected_colors
      
      // If garment_id is specified and garment_configs exists, use that garment's config
      if (item.garment_id && campaign.garment_configs) {
        const garmentConfig = campaign.garment_configs[item.garment_id]
        if (!garmentConfig) {
          return NextResponse.json(
            { error: `Invalid garment selection: ${item.garment_id}` },
            { status: 400 }
          )
        }
        pricePerShirt = garmentConfig.price
        validColors = garmentConfig.colors
        garmentId = item.garment_id
      }
      
      // Validate color is valid for the selected garment
      if (!validColors.includes(item.color)) {
        return NextResponse.json(
          { error: `Invalid color selection: ${item.color}` },
          { status: 400 }
        )
      }
      
      // Create the order
      const { data: order, error } = await supabaseAdmin
        .from('campaign_orders')
        .insert({
          campaign_id: campaign.id,
          participant_name: body.participant_name,
          participant_email: body.participant_email,
          garment_id: garmentId,
          size: item.size,
          color: item.color,
          quantity,
          amount_paid: 0,
          status: initialStatus,
        })
        .select()
        .single()
      
      if (error) {
        console.error('Error creating order:', error)
        return NextResponse.json(
          { error: 'Failed to create order' },
          { status: 500 }
        )
      }
      
      createdOrders.push({
        ...order,
        price_per_shirt: pricePerShirt,
        item_total: pricePerShirt * quantity,
      })
      
      totalAmountDue += pricePerShirt * quantity
    }
    
    // For single item orders, return the order directly (backwards compatibility)
    if (!isMultiItem && createdOrders.length === 1) {
      const order = createdOrders[0]
      if (campaign.payment_style === 'everyone_pays') {
        return NextResponse.json({
          ...order,
          requires_payment: true,
          amount_due: order.item_total,
        })
      }
      return NextResponse.json({
        ...order,
        requires_payment: false,
      })
    }
    
    // For multi-item orders, return all orders with combined payment info
    if (campaign.payment_style === 'everyone_pays') {
      return NextResponse.json({
        orders: createdOrders,
        requires_payment: true,
        amount_due: totalAmountDue,
        // Use first order ID as the primary for payment (orders are linked by email)
        primary_order_id: createdOrders[0].id,
      })
    }
    
    return NextResponse.json({
      orders: createdOrders,
      requires_payment: false,
    })
  } catch (error: any) {
    console.error('Error in campaign order creation:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

