import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import {
  sendOrderConfirmationEmail,
  sendArtApprovedEmail,
  sendBalanceDueEmail,
  sendArtRevisionNeededEmail,
  sendShippingNotificationEmail
} from '@/lib/email'
import { addBusinessDays, format } from 'date-fns'

export type EmailType = 
  | 'order_confirmation'
  | 'art_approved'
  | 'balance_due'
  | 'art_revision_needed'
  | 'shipped'

interface SendEmailRequest {
  email_type: EmailType
  tracking_number?: string
  carrier?: string
  revision_notes?: string
  payment_link?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id
    const body: SendEmailRequest = await request.json()
    const { email_type, tracking_number, carrier, revision_notes, payment_link } = body

    // Fetch the order with customer info
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    if (!order.email) {
      return NextResponse.json(
        { error: 'Order has no customer email' },
        { status: 400 }
      )
    }

    let result
    const customerName = order.customer_name || 'Customer'

    switch (email_type) {
      case 'order_confirmation':
        result = await sendOrderConfirmationEmail(
          order.email,
          customerName,
          orderId,
          order.total_cost,
          order.deposit_amount
        )
        break

      case 'art_approved':
        // Fetch template to get configured ship days
        const { data: artTemplate } = await supabaseAdmin
          .from('email_templates')
          .select('estimated_ship_days')
          .eq('id', 'art_approved')
          .single()
        
        const shipDays = artTemplate?.estimated_ship_days || 14
        const estimatedShipDate = format(
          addBusinessDays(new Date(), shipDays),
          'MMMM d, yyyy'
        )
        result = await sendArtApprovedEmail(
          order.email,
          customerName,
          orderId,
          estimatedShipDate
        )
        break

      case 'balance_due':
        // Generate payment link - this should point to a balance payment page
        const balancePaymentLink = payment_link || 
          `${process.env.NEXT_PUBLIC_APP_URL || 'https://myswagco.com'}/custom-shirts/orders/${orderId}/pay-balance`
        result = await sendBalanceDueEmail(
          order.email,
          customerName,
          orderId,
          order.balance_due,
          balancePaymentLink
        )
        break

      case 'art_revision_needed':
        if (!revision_notes) {
          return NextResponse.json(
            { error: 'Revision notes are required for art revision emails' },
            { status: 400 }
          )
        }
        result = await sendArtRevisionNeededEmail(
          order.email,
          customerName,
          orderId,
          revision_notes
        )
        break

      case 'shipped':
        // Tracking info is optional - send email with or without it
        // Extract shipping address from order (uses line1, line2, city, state, postal_code)
        const shippingAddr = order.shipping_address as { line1?: string; line2?: string; city?: string; state?: string; postal_code?: string } | null
        const shippingAddress = shippingAddr?.line1 ? {
          street: shippingAddr.line2 
            ? `${shippingAddr.line1}, ${shippingAddr.line2}` 
            : shippingAddr.line1,
          city: shippingAddr.city || '',
          state: shippingAddr.state || '',
          zip: shippingAddr.postal_code || ''
        } : undefined
        
        result = await sendShippingNotificationEmail(
          order.email,
          customerName,
          orderId,
          tracking_number || '',
          carrier || '',
          shippingAddress
        )
        break

      default:
        return NextResponse.json(
          { error: 'Invalid email type' },
          { status: 400 }
        )
    }

    // Log the email sending activity
    await supabaseAdmin
      .from('order_activity')
      .insert({
        order_id: orderId,
        activity_type: 'email_sent',
        description: `${email_type.replace(/_/g, ' ')} email sent to ${order.email}`,
        performed_by: 'admin',
        metadata: { 
          email_type,
          recipient: order.email,
          success: result?.success ?? true
        }
      })

    return NextResponse.json({
      success: true,
      message: `${email_type} email sent successfully`,
      data: result
    })

  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}

