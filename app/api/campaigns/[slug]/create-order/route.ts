import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { createOrderFromCampaign } from '@/lib/campaign-order'
import { ShippingAddress } from '@/types'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

// POST - Create production order from campaign (admin only)
// Used for everyone_pays campaigns or manual order creation
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params
    const body = await request.json()
    const { shipping_address } = body as { shipping_address: ShippingAddress }
    
    // Validate shipping address
    if (!shipping_address || !shipping_address.line1 || !shipping_address.city || 
        !shipping_address.state || !shipping_address.postal_code) {
      return NextResponse.json(
        { error: 'Shipping address is required' },
        { status: 400 }
      )
    }
    
    // Get the campaign
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .select('id, name, organizer_id, organizer_name, organizer_email, payment_style, status, final_order_id')
      .eq('slug', slug)
      .single()
    
    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }
    
    // Check if order already created
    if (campaign.final_order_id) {
      return NextResponse.json(
        { error: 'Production order already exists for this campaign', orderId: campaign.final_order_id },
        { status: 400 }
      )
    }
    
    // Campaign must be closed or completed to create order manually
    if (campaign.status !== 'closed' && campaign.status !== 'active') {
      return NextResponse.json(
        { error: 'Campaign must be closed or active to create production order' },
        { status: 400 }
      )
    }
    
    // Check for valid orders
    // For everyone_pays: look for 'paid' orders
    // For organizer_pays: look for 'confirmed' orders
    const validStatuses = campaign.payment_style === 'everyone_pays' 
      ? ['paid'] 
      : ['confirmed']
    
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('campaign_orders')
      .select('id, quantity')
      .eq('campaign_id', campaign.id)
      .in('status', validStatuses)
    
    if (ordersError || !orders || orders.length === 0) {
      return NextResponse.json(
        { error: `No ${validStatuses.join(' or ')} orders found for this campaign` },
        { status: 400 }
      )
    }
    
    // Get organizer info
    const { data: organizer } = await supabaseAdmin
      .from('customers')
      .select('id, name, email')
      .eq('id', campaign.organizer_id)
      .single()
    
    // Create the production order
    const orderResult = await createOrderFromCampaign({
      campaignId: campaign.id,
      campaignSlug: slug,
      shippingAddress: shipping_address,
      organizerName: campaign.organizer_name || organizer?.name || 'Campaign Organizer',
      organizerEmail: campaign.organizer_email || organizer?.email || '',
      organizerId: campaign.organizer_id,
      paymentIntentId: undefined, // No payment intent for admin-created orders
      isFullyPaid: campaign.payment_style === 'everyone_pays' // Everyone_pays campaigns are fully paid
    })
    
    if (!orderResult.success) {
      console.error('Error creating order from campaign:', orderResult.error)
      return NextResponse.json(
        { error: orderResult.error || 'Failed to create production order' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      orderId: orderResult.orderId
    })
  } catch (error: any) {
    console.error('Error creating order from campaign:', error)
    return NextResponse.json(
      { error: 'Failed to create production order' },
      { status: 500 }
    )
  }
}

