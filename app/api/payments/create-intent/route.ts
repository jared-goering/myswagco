import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

export async function POST(request: NextRequest) {
  try {
    const { amount, orderId, pendingOrderId, customerEmail } = await request.json()
    
    if (!amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Build metadata based on whether this is a new order or existing order
    const metadata: Record<string, string> = {
      payment_type: 'deposit'
    }
    
    if (orderId) {
      // Existing order (for balance payments)
      metadata.order_id = orderId
    } else if (pendingOrderId) {
      // New order - reference the pending order
      metadata.pending_order_id = pendingOrderId
      
      // Update pending order with payment intent reference
      await supabaseAdmin
        .from('pending_orders')
        .update({ stripe_payment_intent_id: 'pending' })
        .eq('id', pendingOrderId)
    } else {
      return NextResponse.json(
        { error: 'Either orderId or pendingOrderId is required' },
        { status: 400 }
      )
    }
    
    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      metadata,
      receipt_email: customerEmail || undefined
    })
    
    // Update pending order with actual payment intent ID
    if (pendingOrderId) {
      await supabaseAdmin
        .from('pending_orders')
        .update({ stripe_payment_intent_id: paymentIntent.id })
        .eq('id', pendingOrderId)
    }
    
    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    })
  } catch (error: any) {
    console.error('Error creating payment intent:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}

