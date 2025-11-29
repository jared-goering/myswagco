import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import Stripe from 'stripe'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

// PATCH - Confirm payment completed (called after Stripe payment succeeds)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { slug: string; orderId: string } }
) {
  try {
    const { slug, orderId } = params
    
    // Get the campaign
    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('id, payment_style, price_per_shirt')
      .eq('slug', slug)
      .single()
    
    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }
    
    // Get the order
    const { data: order } = await supabaseAdmin
      .from('campaign_orders')
      .select('*')
      .eq('id', orderId)
      .eq('campaign_id', campaign.id)
      .single()
    
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }
    
    // If already paid, just return success
    if (order.status === 'paid') {
      return NextResponse.json({ success: true, already_paid: true })
    }
    
    // Verify payment with Stripe if we have a payment intent
    if (order.stripe_payment_intent_id) {
      const paymentIntent = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id)
      
      if (paymentIntent.status !== 'succeeded') {
        return NextResponse.json(
          { error: 'Payment not completed' },
          { status: 400 }
        )
      }
    }
    
    // Update order status to paid
    const amountPaid = campaign.price_per_shirt * order.quantity
    
    const { error } = await supabaseAdmin
      .from('campaign_orders')
      .update({
        status: 'paid',
        amount_paid: amountPaid,
      })
      .eq('id', order.id)
    
    if (error) {
      console.error('Error updating order status:', error)
      return NextResponse.json(
        { error: 'Failed to update order' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error confirming payment:', error)
    return NextResponse.json(
      { error: 'Failed to confirm payment' },
      { status: 500 }
    )
  }
}

// POST - Create payment intent for campaign order
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string; orderId: string } }
) {
  try {
    const { slug, orderId } = params
    
    // Get the campaign
    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('id, name, payment_style, price_per_shirt')
      .eq('slug', slug)
      .single()
    
    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }
    
    // Only allow payment for everyone_pays campaigns
    if (campaign.payment_style !== 'everyone_pays') {
      return NextResponse.json(
        { error: 'Payment not required for this campaign' },
        { status: 400 }
      )
    }
    
    // Get the order
    const { data: order } = await supabaseAdmin
      .from('campaign_orders')
      .select('*')
      .eq('id', orderId)
      .eq('campaign_id', campaign.id)
      .single()
    
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }
    
    // Check if already paid
    if (order.status === 'paid') {
      return NextResponse.json(
        { error: 'Order already paid' },
        { status: 400 }
      )
    }
    
    // Calculate amount
    const amount = Math.round(campaign.price_per_shirt * order.quantity * 100) // Convert to cents
    
    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      metadata: {
        campaign_id: campaign.id,
        campaign_order_id: order.id,
        campaign_name: campaign.name,
      },
      receipt_email: order.participant_email,
      description: `${campaign.name} - ${order.size} x${order.quantity}`,
    })
    
    // Update order with payment intent ID
    await supabaseAdmin
      .from('campaign_orders')
      .update({
        stripe_payment_intent_id: paymentIntent.id,
      })
      .eq('id', order.id)
    
    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      amount: amount / 100,
    })
  } catch (error: any) {
    console.error('Error creating payment intent:', error)
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    )
  }
}

