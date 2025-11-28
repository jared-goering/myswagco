import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

export async function POST(request: NextRequest) {
  try {
    const { amount, orderId, pendingOrderId, customerEmail, customerName, paymentType = 'deposit' } = await request.json()
    
    if (!amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Build metadata based on whether this is a new order or existing order
    const metadata: Record<string, string> = {
      payment_type: paymentType
    }
    
    let stripeCustomerId: string | undefined
    
    if (orderId) {
      // Existing order (for balance payments)
      metadata.order_id = orderId
      
      // For balance payments, try to get the existing Stripe Customer
      if (paymentType === 'balance') {
        const { data: order } = await supabaseAdmin
          .from('orders')
          .select('stripe_customer_id, email, customer_name')
          .eq('id', orderId)
          .single()
        
        if (order?.stripe_customer_id) {
          stripeCustomerId = order.stripe_customer_id
        } else if (order?.email) {
          // Create a Stripe customer if one doesn't exist
          const customer = await stripe.customers.create({
            email: order.email,
            name: order.customer_name || undefined,
            metadata: { order_id: orderId }
          })
          stripeCustomerId = customer.id
          
          // Store the customer ID on the order
          await supabaseAdmin
            .from('orders')
            .update({ stripe_customer_id: customer.id })
            .eq('id', orderId)
        }
      }
    } else if (pendingOrderId) {
      // New order - reference the pending order
      metadata.pending_order_id = pendingOrderId
      
      // Update pending order with payment intent reference
      await supabaseAdmin
        .from('pending_orders')
        .update({ stripe_payment_intent_id: 'pending' })
        .eq('id', pendingOrderId)
      
      // For deposit payments, create a Stripe Customer to save the payment method
      if (paymentType === 'deposit' && customerEmail) {
        const customer = await stripe.customers.create({
          email: customerEmail,
          name: customerName || undefined,
          metadata: { pending_order_id: pendingOrderId }
        })
        stripeCustomerId = customer.id
        metadata.stripe_customer_id = customer.id
      }
    } else {
      return NextResponse.json(
        { error: 'Either orderId or pendingOrderId is required' },
        { status: 400 }
      )
    }
    
    // Create payment intent with setup_future_usage to save the card
    const paymentIntentData: Stripe.PaymentIntentCreateParams = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      metadata,
      receipt_email: customerEmail || undefined
    }
    
    // Attach customer and save payment method for future use
    if (stripeCustomerId) {
      paymentIntentData.customer = stripeCustomerId
      paymentIntentData.setup_future_usage = 'off_session' // Save the card for later
    }
    
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentData)
    
    // Update pending order with actual payment intent ID
    if (pendingOrderId) {
      await supabaseAdmin
        .from('pending_orders')
        .update({ stripe_payment_intent_id: paymentIntent.id })
        .eq('id', pendingOrderId)
    }
    
    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      stripeCustomerId
    })
  } catch (error: any) {
    console.error('Error creating payment intent:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}

