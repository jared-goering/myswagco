import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendOrderConfirmationEmail, sendBalancePaidEmail } from '@/lib/email'
import { calculateQuote, calculateTotalQuantityFromColors, calculateGarmentCost, calculatePrintCost } from '@/lib/pricing'

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
            
            // Calculate pricing breakdown for storage
            let pricingBreakdown: {
              garment_cost_per_shirt: number
              print_cost_per_shirt: number
              setup_fees: number
              total_screens: number
              per_shirt_total: number
              garment_breakdown?: { garment_id: string; name: string; quantity: number; cost_per_shirt: number; total: number }[]
            }
            
            // Check if this is a multi-garment order
            if (pendingOrder.selected_garments && Object.keys(pendingOrder.selected_garments).length > 0) {
              const garmentBreakdown: { garment_id: string; name: string; quantity: number; cost_per_shirt: number; total: number }[] = []
              let totalGarmentCost = 0
              
              const garmentIds = Object.keys(pendingOrder.selected_garments)
              const { data: garmentsData } = await supabaseAdmin
                .from('garments')
                .select('id, name')
                .in('id', garmentIds)
              const garmentNames = Object.fromEntries((garmentsData || []).map((g: any) => [g.id, g.name]))
              
              for (const [garmentId, selection] of Object.entries(pendingOrder.selected_garments)) {
                const sel = selection as { colorSizeQuantities: Record<string, Record<string, number>> }
                let garmentQty = 0
                Object.values(sel.colorSizeQuantities || {}).forEach((sizeQty: any) => {
                  Object.values(sizeQty).forEach((qty: any) => { garmentQty += qty || 0 })
                })
                
                if (garmentQty > 0) {
                  const { totalCost, costPerShirt } = await calculateGarmentCost(garmentId, garmentQty)
                  garmentBreakdown.push({
                    garment_id: garmentId,
                    name: garmentNames[garmentId] || 'Unknown',
                    quantity: garmentQty,
                    cost_per_shirt: costPerShirt,
                    total: totalCost
                  })
                  totalGarmentCost += totalCost
                }
              }
              
              const printResult = await calculatePrintCost(totalQuantity, pendingOrder.print_config)
              const avgGarmentCostPerShirt = totalGarmentCost / totalQuantity
              
              pricingBreakdown = {
                garment_cost_per_shirt: avgGarmentCostPerShirt,
                print_cost_per_shirt: printResult.costPerShirt,
                setup_fees: printResult.setupFees,
                total_screens: printResult.totalScreens,
                per_shirt_total: (totalGarmentCost + printResult.totalCost) / totalQuantity,
                garment_breakdown: garmentBreakdown
              }
            } else {
              pricingBreakdown = {
                garment_cost_per_shirt: quote.garment_cost_per_shirt,
                print_cost_per_shirt: quote.print_cost_per_shirt,
                setup_fees: quote.setup_fees,
                total_screens: quote.total_screens,
                per_shirt_total: quote.per_shirt_price
              }
            }
            
            // Get Stripe customer ID from metadata if available
            const stripeCustomerId = paymentIntent.metadata.stripe_customer_id || 
              (paymentIntent.customer ? String(paymentIntent.customer) : null)
            
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
                pricing_breakdown: pricingBreakdown,
                status: 'pending_art_review',
                stripe_payment_intent_id: paymentIntent.id,
                stripe_customer_id: stripeCustomerId
              })
              .select()
              .single()
            
            if (orderError) {
              console.error('Error creating order:', orderError)
              break
            }
            
            // Create artwork_files records from uploaded temp files
            if (pendingOrder.artwork_data && Array.isArray(pendingOrder.artwork_data)) {
              for (const artwork of pendingOrder.artwork_data as any[]) {
                if (artwork.file_url) {
                  const isVector = artwork.file_name?.toLowerCase().endsWith('.svg') || 
                                  artwork.file_name?.toLowerCase().endsWith('.ai') ||
                                  artwork.file_name?.toLowerCase().endsWith('.eps')
                  
                  await supabaseAdmin
                    .from('artwork_files')
                    .insert({
                      order_id: newOrder.id,
                      location: artwork.location,
                      file_url: artwork.file_url,
                      file_name: artwork.file_name || 'artwork',
                      file_size: 0,
                      is_vector: isVector,
                      vectorization_status: isVector ? 'not_needed' : 'pending',
                      transform: artwork.transform || null
                    })
                }
              }
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
            // Fetch order first to get customer info
            const { data: order, error: fetchError } = await supabaseAdmin
              .from('orders')
              .select('*')
              .eq('id', orderId)
              .single()
            
            if (fetchError || !order) {
              console.error('Order not found for balance payment:', orderId)
              break
            }
            
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
            
            // Send balance paid confirmation email
            await sendBalancePaidEmail(
              order.email,
              order.customer_name,
              orderId,
              paymentIntent.amount / 100
            )
            
            // Log email sent
            await supabaseAdmin
              .from('order_activity')
              .insert({
                order_id: orderId,
                activity_type: 'email_sent',
                description: `Balance paid confirmation email sent to ${order.email}`,
                performed_by: 'system',
                metadata: { email_type: 'balance_paid', recipient: order.email }
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

