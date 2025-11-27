import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

export async function GET(request: NextRequest) {
  try {
    const paymentIntentId = request.nextUrl.searchParams.get('payment_intent_id')
    
    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Missing payment_intent_id' },
        { status: 400 }
      )
    }

    // Get the payment intent from Stripe to check for order_id in metadata
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    
    if (paymentIntent.metadata?.order_id) {
      return NextResponse.json({
        orderId: paymentIntent.metadata.order_id,
        status: paymentIntent.status
      })
    }

    // If no order_id in metadata, check if order exists by payment intent ID
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single()

    if (order) {
      return NextResponse.json({
        orderId: order.id,
        status: paymentIntent.status
      })
    }

    return NextResponse.json({
      orderId: null,
      status: paymentIntent.status,
      message: 'Order not yet created'
    })
  } catch (error: any) {
    console.error('Error checking order:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check order' },
      { status: 500 }
    )
  }
}

