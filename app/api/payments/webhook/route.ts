import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendOrderConfirmationEmail } from '@/lib/email'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')!
    
    let event: Stripe.Event
    
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }
    
    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const orderId = paymentIntent.metadata.order_id
        const paymentType = paymentIntent.metadata.payment_type
        
        if (orderId) {
          if (paymentType === 'deposit') {
            // Update order deposit status
            const { data: order, error } = await supabaseAdmin
              .from('orders')
              .update({
                deposit_paid: true,
                stripe_payment_intent_id: paymentIntent.id
              })
              .eq('id', orderId)
              .select()
              .single()
            
            if (!error && order) {
              // Log payment received
              await supabaseAdmin
                .from('order_activity')
                .insert({
                  order_id: orderId,
                  activity_type: 'payment_received',
                  description: `Deposit payment of $${(paymentIntent.amount / 100).toFixed(2)} received`,
                  performed_by: 'system',
                  metadata: { payment_intent_id: paymentIntent.id }
                })
              
              // Send confirmation email
              await sendOrderConfirmationEmail(
                order.email,
                order.customer_name,
                order.id,
                order.total_cost,
                order.deposit_amount
              )
            }
          } else if (paymentType === 'balance') {
            // Update order balance status
            await supabaseAdmin
              .from('orders')
              .update({
                balance_due: 0,
                status: 'ready_to_ship',
                stripe_balance_payment_intent_id: paymentIntent.id
              })
              .eq('id', orderId)
            
            // Log payment received
            await supabaseAdmin
              .from('order_activity')
              .insert({
                order_id: orderId,
                activity_type: 'payment_received',
                description: `Balance payment of $${(paymentIntent.amount / 100).toFixed(2)} received`,
                performed_by: 'system',
                metadata: { payment_intent_id: paymentIntent.id }
              })
          }
        }
        break
      
      case 'payment_intent.payment_failed':
        const failedIntent = event.data.object as Stripe.PaymentIntent
        console.error('Payment failed:', failedIntent.id)
        // You could add error logging to the order here
        break
      
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
    
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

