import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

// GET - List ALL campaigns for admin monitoring
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    
    // Build query for all campaigns (not filtered by organizer)
    let query = supabaseAdmin
      .from('campaigns')
      .select(`
        *,
        garments(id, name, brand, thumbnail_url)
      `)
      .is('deleted_at', null) // Exclude soft-deleted campaigns
      .order('created_at', { ascending: false })
    
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    
    const { data: campaigns, error } = await query
    
    if (error) {
      console.error('Error fetching campaigns:', error)
      return NextResponse.json(
        { error: 'Failed to fetch campaigns' },
        { status: 500 }
      )
    }
    
    // Collect all garment IDs from garment_configs for multi-garment campaigns
    const allGarmentIds = new Set<string>()
    campaigns.forEach(campaign => {
      if (campaign.garment_configs) {
        Object.keys(campaign.garment_configs).forEach(id => allGarmentIds.add(id))
      }
      if (campaign.garment_id) {
        allGarmentIds.add(campaign.garment_id)
      }
    })
    
    // Fetch all garments at once
    let garmentsMap: Record<string, any> = {}
    if (allGarmentIds.size > 0) {
      const { data: garments } = await supabaseAdmin
        .from('garments')
        .select('id, name, brand, thumbnail_url')
        .in('id', Array.from(allGarmentIds))
      
      if (garments) {
        garments.forEach(g => { garmentsMap[g.id] = g })
      }
    }
    
    // Attach garments array to campaigns with garment_configs
    campaigns.forEach(campaign => {
      if (campaign.garment_configs && Object.keys(campaign.garment_configs).length > 0) {
        campaign.garments = Object.keys(campaign.garment_configs)
          .map(id => garmentsMap[id])
          .filter(Boolean)
      }
      // Ensure single garment is also populated
      if (campaign.garment_id && garmentsMap[campaign.garment_id]) {
        campaign.garment = garmentsMap[campaign.garment_id]
      }
    })
    
    // Get order stats for all campaigns
    const campaignIds = campaigns.map(c => c.id)
    
    if (campaignIds.length > 0) {
      // Fetch all campaign orders
      const { data: allOrders } = await supabaseAdmin
        .from('campaign_orders')
        .select('campaign_id, status, quantity, amount_paid, stripe_payment_intent_id')
        .in('campaign_id', campaignIds)
      
      // Build a map of campaign id to payment_style for quick lookup
      const paymentStyleMap: Record<string, string> = {}
      campaigns.forEach(c => {
        paymentStyleMap[c.id] = c.payment_style
      })
      
      // Aggregate stats per campaign
      const statsMap: Record<string, { 
        order_count: number
        total_quantity: number
        total_revenue: number
        pending_count: number
      }> = {}
      
      allOrders?.forEach(order => {
        const paymentStyle = paymentStyleMap[order.campaign_id]
        
        if (!statsMap[order.campaign_id]) {
          statsMap[order.campaign_id] = {
            order_count: 0,
            total_quantity: 0,
            total_revenue: 0,
            pending_count: 0
          }
        }
        
        const stats = statsMap[order.campaign_id]
        
        // For 'everyone_pays' only count paid orders for main stats
        // For 'organizer_pays' count all non-cancelled orders
        const isPaid = order.status === 'paid'
        const shouldCountForMain = paymentStyle === 'everyone_pays'
          ? isPaid
          : order.status !== 'cancelled'
        
        if (shouldCountForMain) {
          stats.order_count++
          stats.total_quantity += order.quantity || 0
        }
        
        // Track pending orders for everyone_pays
        if (paymentStyle === 'everyone_pays' && order.status === 'pending') {
          stats.pending_count++
        }
        
        // Track revenue from paid orders
        if (isPaid && order.amount_paid) {
          stats.total_revenue += order.amount_paid
        }
      })
      
      // Add stats to campaigns
      campaigns.forEach(campaign => {
        const stats = statsMap[campaign.id] || {
          order_count: 0,
          total_quantity: 0,
          total_revenue: 0,
          pending_count: 0
        }
        campaign.order_count = stats.order_count
        campaign.total_quantity = stats.total_quantity
        campaign.total_revenue = stats.total_revenue
        campaign.pending_count = stats.pending_count
      })
    }
    
    return NextResponse.json(campaigns)
  } catch (error: any) {
    console.error('Error in admin campaigns list:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

