import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

// GET - Get campaign statistics (public)
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params
    
    // Get the campaign
    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('id, status, payment_style')
      .eq('slug', slug)
      .single()
    
    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }
    
    // Get orders - for 'everyone_pays' only count paid orders
    // For 'organizer_pays' count all non-cancelled orders
    let ordersQuery = supabaseAdmin
      .from('campaign_orders')
      .select('size, color, quantity, amount_paid, status')
      .eq('campaign_id', campaign.id)
    
    if (campaign.payment_style === 'everyone_pays') {
      // Only count paid orders
      ordersQuery = ordersQuery.eq('status', 'paid')
    } else {
      // Count all non-cancelled orders
      ordersQuery = ordersQuery.not('status', 'eq', 'cancelled')
    }
    
    const { data: orders } = await ordersQuery
    
    if (!orders || orders.length === 0) {
      return NextResponse.json({
        order_count: 0,
        total_quantity: 0,
        size_breakdown: {},
        color_breakdown: {},
        total_revenue: 0,
      })
    }
    
    // Calculate breakdowns
    const sizeBreakdown: Record<string, number> = {}
    const colorBreakdown: Record<string, number> = {}
    let totalQuantity = 0
    let totalRevenue = 0
    
    orders.forEach(order => {
      sizeBreakdown[order.size] = (sizeBreakdown[order.size] || 0) + order.quantity
      colorBreakdown[order.color] = (colorBreakdown[order.color] || 0) + order.quantity
      totalQuantity += order.quantity
      totalRevenue += order.amount_paid || 0
    })
    
    return NextResponse.json({
      order_count: orders.length,
      total_quantity: totalQuantity,
      size_breakdown: sizeBreakdown,
      color_breakdown: colorBreakdown,
      total_revenue: campaign.payment_style === 'everyone_pays' ? totalRevenue : undefined,
    })
  } catch (error: any) {
    console.error('Error fetching campaign stats:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

