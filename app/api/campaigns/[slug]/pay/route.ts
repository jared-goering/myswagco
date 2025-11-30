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

// POST - Create payment intent for organizer to pay for entire campaign
export async function POST(
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
    
    // Get the campaign
    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('id, name, organizer_id, payment_style, price_per_shirt, organizer_email, status')
      .eq('slug', slug)
      .single()
    
    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }
    
    // Verify ownership
    if (campaign.organizer_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      )
    }
    
    // Only allow payment for organizer_pays campaigns
    if (campaign.payment_style !== 'organizer_pays') {
      return NextResponse.json(
        { error: 'This campaign does not require organizer payment' },
        { status: 400 }
      )
    }
    
    // Campaign must be active to end it
    if (campaign.status !== 'active') {
      return NextResponse.json(
        { error: 'Campaign is not active' },
        { status: 400 }
      )
    }
    
    // Get all confirmed orders for this campaign
    const { data: orders } = await supabaseAdmin
      .from('campaign_orders')
      .select('id, quantity')
      .eq('campaign_id', campaign.id)
      .eq('status', 'confirmed')
    
    if (!orders || orders.length === 0) {
      return NextResponse.json(
        { error: 'No confirmed orders to pay for' },
        { status: 400 }
      )
    }
    
    // Calculate total quantity and amount
    const totalQuantity = orders.reduce((sum, order) => sum + order.quantity, 0)
    const totalAmount = campaign.price_per_shirt * totalQuantity
    const amountInCents = Math.round(totalAmount * 100)
    
    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      metadata: {
        type: 'campaign_organizer_payment',
        campaign_id: campaign.id,
        campaign_slug: slug,
        campaign_name: campaign.name,
        total_quantity: totalQuantity.toString(),
        order_count: orders.length.toString(),
      },
      receipt_email: campaign.organizer_email || user.email || undefined,
      description: `${campaign.name} - ${totalQuantity} shirts`,
    })
    
    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      amount: totalAmount,
      totalQuantity,
      orderCount: orders.length,
    })
  } catch (error: any) {
    console.error('Error creating organizer payment intent:', error)
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    )
  }
}

// PATCH - Confirm payment and close campaign
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
    const { paymentIntentId } = body
    
    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Payment intent ID required' },
        { status: 400 }
      )
    }
    
    // Get the campaign
    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('id, organizer_id, payment_style, status')
      .eq('slug', slug)
      .single()
    
    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }
    
    // Verify ownership
    if (campaign.organizer_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      )
    }
    
    // Verify this is an organizer_pays campaign
    if (campaign.payment_style !== 'organizer_pays') {
      return NextResponse.json(
        { error: 'This campaign does not require organizer payment' },
        { status: 400 }
      )
    }
    
    // Verify payment succeeded
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    
    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400 }
      )
    }
    
    // Verify this payment is for this campaign
    if (paymentIntent.metadata.campaign_id !== campaign.id) {
      return NextResponse.json(
        { error: 'Payment does not match campaign' },
        { status: 400 }
      )
    }
    
    // Close the campaign
    const { error: updateError } = await supabaseAdmin
      .from('campaigns')
      .update({ status: 'closed' })
      .eq('id', campaign.id)
    
    if (updateError) {
      console.error('Error closing campaign:', updateError)
      return NextResponse.json(
        { error: 'Failed to close campaign' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error confirming organizer payment:', error)
    return NextResponse.json(
      { error: 'Failed to confirm payment' },
      { status: 500 }
    )
  }
}


