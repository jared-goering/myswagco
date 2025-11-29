import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

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

// GET - Fetch campaign by slug (public access for active/closed campaigns)
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params
    
    // Fetch campaign with primary garment info
    const { data: campaign, error } = await supabaseAdmin
      .from('campaigns')
      .select(`
        *,
        garments(id, name, brand, description, thumbnail_url, available_colors, size_range, color_images, color_back_images, base_cost)
      `)
      .eq('slug', slug)
      .single()
    
    if (error || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }
    
    // Check if campaign is accessible (active or closed for public, or owner can view draft/deleted)
    const user = await getCurrentUser()
    const isOwner = user?.id === campaign.organizer_id
    
    if ((campaign.status === 'draft' || campaign.status === 'deleted') && !isOwner) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }
    
    // Fetch all garments for multi-garment campaigns
    let garments: any[] = []
    if (campaign.garment_configs && Object.keys(campaign.garment_configs).length > 0) {
      const garmentIds = Object.keys(campaign.garment_configs)
      const { data: allGarments } = await supabaseAdmin
        .from('garments')
        .select('id, name, brand, description, thumbnail_url, available_colors, size_range, color_images, color_back_images, base_cost')
        .in('id', garmentIds)
      
      if (allGarments) {
        garments = allGarments
      }
    }
    
    // Get order count - for 'everyone_pays' only count paid orders
    let countQuery = supabaseAdmin
      .from('campaign_orders')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaign.id)
    
    if (campaign.payment_style === 'everyone_pays') {
      countQuery = countQuery.eq('status', 'paid')
    } else {
      countQuery = countQuery.not('status', 'eq', 'cancelled')
    }
    
    const { count: orderCount } = await countQuery
    
    // Get size breakdown with same filter
    let ordersQuery = supabaseAdmin
      .from('campaign_orders')
      .select('size, quantity, garment_id')
      .eq('campaign_id', campaign.id)
    
    if (campaign.payment_style === 'everyone_pays') {
      ordersQuery = ordersQuery.eq('status', 'paid')
    } else {
      ordersQuery = ordersQuery.not('status', 'eq', 'cancelled')
    }
    
    const { data: orders } = await ordersQuery
    
    const sizeBreakdown: Record<string, number> = {}
    orders?.forEach(order => {
      sizeBreakdown[order.size] = (sizeBreakdown[order.size] || 0) + order.quantity
    })
    
    return NextResponse.json({
      ...campaign,
      garment: campaign.garments, // Legacy single garment (for backwards compatibility)
      garments: garments.length > 0 ? garments : (campaign.garments ? [campaign.garments] : []), // All garments for multi-style campaigns
      order_count: orderCount || 0,
      size_breakdown: sizeBreakdown,
      is_owner: isOwner,
    })
  } catch (error: any) {
    console.error('Error fetching campaign:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// PATCH - Update campaign (organizer only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const { slug } = params
    const body = await request.json()
    
    // Verify ownership
    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('id, organizer_id, status')
      .eq('slug', slug)
      .single()
    
    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }
    
    if (campaign.organizer_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to update this campaign' },
        { status: 403 }
      )
    }
    
    // Handle restore from deleted status
    if (body.action === 'restore' && campaign.status === 'deleted') {
      const { data: restoredCampaign, error } = await supabaseAdmin
        .from('campaigns')
        .update({ 
          status: 'closed', 
          deleted_at: null 
        })
        .eq('id', campaign.id)
        .select()
        .single()
      
      if (error) {
        console.error('Error restoring campaign:', error)
        return NextResponse.json(
          { error: 'Failed to restore campaign' },
          { status: 500 }
        )
      }
      
      return NextResponse.json(restoredCampaign)
    }
    
    // Only allow updating certain fields
    const allowedFields = ['name', 'deadline', 'status']
    const updates: Record<string, any> = {}
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }
    
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }
    
    const { data: updatedCampaign, error } = await supabaseAdmin
      .from('campaigns')
      .update(updates)
      .eq('id', campaign.id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating campaign:', error)
      return NextResponse.json(
        { error: 'Failed to update campaign' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(updatedCampaign)
  } catch (error: any) {
    console.error('Error in campaign update:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// DELETE - Soft delete campaign (organizer only)
// Accepts optional query param: refund_orders=true to refund all paid orders
export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const { slug } = params
    const searchParams = request.nextUrl.searchParams
    const refundOrders = searchParams.get('refund_orders') === 'true'
    
    // Verify ownership
    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('id, organizer_id, status, payment_style, price_per_shirt')
      .eq('slug', slug)
      .single()
    
    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }
    
    if (campaign.organizer_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to delete this campaign' },
        { status: 403 }
      )
    }
    
    // Already deleted
    if (campaign.status === 'deleted') {
      return NextResponse.json(
        { error: 'Campaign is already deleted' },
        { status: 400 }
      )
    }
    
    // Track refund results
    const refundResults: { orderId: string; success: boolean; error?: string }[] = []
    
    // If refund requested, process refunds for paid orders
    if (refundOrders && campaign.payment_style === 'everyone_pays') {
      // Get all paid orders with payment intent IDs
      const { data: paidOrders } = await supabaseAdmin
        .from('campaign_orders')
        .select('id, stripe_payment_intent_id, quantity, amount_paid')
        .eq('campaign_id', campaign.id)
        .eq('status', 'paid')
        .not('stripe_payment_intent_id', 'is', null)
      
      if (paidOrders && paidOrders.length > 0) {
        // Process refunds
        for (const order of paidOrders) {
          try {
            if (order.stripe_payment_intent_id) {
              // Create refund via Stripe
              await stripe.refunds.create({
                payment_intent: order.stripe_payment_intent_id,
              })
              
              // Update order status to cancelled
              await supabaseAdmin
                .from('campaign_orders')
                .update({ status: 'cancelled' })
                .eq('id', order.id)
              
              refundResults.push({ orderId: order.id, success: true })
            }
          } catch (refundError: any) {
            console.error(`Failed to refund order ${order.id}:`, refundError)
            refundResults.push({ 
              orderId: order.id, 
              success: false, 
              error: refundError.message 
            })
          }
        }
      }
    }
    
    // Soft delete the campaign (set status to 'deleted')
    const { error } = await supabaseAdmin
      .from('campaigns')
      .update({ 
        status: 'deleted',
        deleted_at: new Date().toISOString()
      })
      .eq('id', campaign.id)
    
    if (error) {
      console.error('Error deleting campaign:', error)
      return NextResponse.json(
        { error: 'Failed to delete campaign' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ 
      success: true,
      refunds_processed: refundResults.length > 0,
      refund_results: refundResults
    })
  } catch (error: any) {
    console.error('Error in campaign deletion:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

