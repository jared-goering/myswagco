import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendOrderConfirmationEmail } from '@/lib/email'
import { calculateQuote, calculateTotalQuantityFromColors } from '@/lib/pricing'

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
        const pendingOrderId = paymentIntent.metadata.pending_order_id
        const paymentType = paymentIntent.metadata.payment_type
        
        // Handle new order from pending_orders table
        if (pendingOrderId && paymentType === 'deposit') {
          try {
            // Fetch the pending order
            const { data: pendingOrder, error: fetchError } = await supabaseAdmin
              .from('pending_orders')
              .select('*')
              .eq('id', pendingOrderId)
              .single()
            
            if (fetchError || !pendingOrder) {
              console.error('Pending order not found:', pendingOrderId)
              break
            }
            
            // Calculate pricing
            const totalQuantity = calculateTotalQuantityFromColors(pendingOrder.color_size_quantities)
            const quote = await calculateQuote(
              pendingOrder.garment_id,
              totalQuantity,
              pendingOrder.print_config
            )
            
            // Create the actual order
            const { data: newOrder, error: orderError } = await supabaseAdmin
              .from('orders')
              .insert({
                customer_id: pendingOrder.customer_id,
                customer_name: pendingOrder.customer_name,
                email: pendingOrder.email,
                phone: pendingOrder.phone,
                shipping_address: pendingOrder.shipping_address,
                organization_name: pendingOrder.organization_name,
                need_by_date: pendingOrder.need_by_date,
                garment_id: pendingOrder.garment_id,
                garment_color: Object.keys(pendingOrder.color_size_quantities || {})[0] || '',
                size_quantities: {},
                color_size_quantities: pendingOrder.color_size_quantities,
                selected_garments: pendingOrder.selected_garments,
                total_quantity: totalQuantity,
                print_config: pendingOrder.print_config,
                total_cost: quote.total,
                deposit_amount: quote.deposit_amount,
                deposit_paid: true,
                balance_due: quote.balance_due,
                status: 'pending_art_review',
                stripe_payment_intent_id: paymentIntent.id
              })
              .select()
              .single()
            
            if (orderError) {
              console.error('Error creating order:', orderError)
              break
            }
            
            // Handle artwork if stored in pending order
            if (pendingOrder.artwork_data) {
              // Artwork references are stored - they'll be uploaded by the confirmation page
              // using the files from the client's Zustand store
            }
            
            // Log order creation
            await supabaseAdmin
              .from('order_activity')
              .insert({
                order_id: newOrder.id,
                activity_type: 'status_change',
                description: 'Order created after successful payment',
                performed_by: 'system'
              })
            
            // Log payment received
            await supabaseAdmin
              .from('order_activity')
              .insert({
                order_id: newOrder.id,
                activity_type: 'payment_received',
                description: `Deposit payment of $${(paymentIntent.amount / 100).toFixed(2)} received`,
                performed_by: 'system',
                metadata: { payment_intent_id: paymentIntent.id }
              })
            
            // Send confirmation email
            await sendOrderConfirmationEmail(
              newOrder.email,
              newOrder.customer_name,
              newOrder.id,
              newOrder.total_cost,
              newOrder.deposit_amount
            )
            
            // Update payment intent metadata with the new order ID
            await stripe.paymentIntents.update(paymentIntent.id, {
              metadata: {
                ...paymentIntent.metadata,
                order_id: newOrder.id
              }
            })
            
            // Delete the pending order
            await supabaseAdmin
              .from('pending_orders')
              .delete()
              .eq('id', pendingOrderId)
              
          } catch (err) {
            console.error('Error processing pending order:', err)
          }
        } else if (orderId) {
          // Existing order flow (for balance payments or legacy)
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
        // You could add error logging here
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

