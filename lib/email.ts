// Email service using Resend
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase/server'
import { defaultTemplates, EmailTemplate, EmailTemplateId } from '@/lib/email-templates'

const resend = new Resend(process.env.RESEND_API_KEY)
const fromAddress = process.env.EMAIL_FROM_ADDRESS || 'onboarding@resend.dev'

interface EmailOptions {
  to: string
  subject: string
  html: string
}

// Re-export for use in other files
export { defaultTemplates }
export type { EmailTemplate }

// Export getTemplate for use in send-email route
export async function getTemplate(templateId: string): Promise<EmailTemplate> {
  try {
    const { data, error } = await supabaseAdmin
      .from('email_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    const validTemplateId = templateId as EmailTemplateId
    if (error || !data) {
      return defaultTemplates[validTemplateId] || defaultTemplates.order_confirmation
    }

    return data as EmailTemplate
  } catch {
    const validTemplateId = templateId as EmailTemplateId
    return defaultTemplates[validTemplateId] || defaultTemplates.order_confirmation
  }
}

// Interpolate variables in text
function interpolate(text: string, variables: Record<string, string>): string {
  let result = text
  Object.entries(variables).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value)
  })
  return result
}

// Generate a darker shade of a color for gradient
function darkenColor(hex: string): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, (num >> 16) - 20)
  const g = Math.max(0, ((num >> 8) & 0x00FF) - 20)
  const b = Math.max(0, (num & 0x0000FF) - 20)
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`
}

// Generate email HTML from template and variables
export function generateEmailHtml(
  template: EmailTemplate,
  variables: Record<string, string>,
  extraContent?: {
    orderDetails?: string
    ctaUrl?: string
    badge?: { text: string; color: string }
    revisionNotes?: string
  }
): string {
  const heading = interpolate(template.heading, variables)
  const bodyIntro = interpolate(template.body_intro, variables)
  const bodyDetails = template.body_details ? interpolate(template.body_details, variables) : null
  const footerText = template.footer_text ? interpolate(template.footer_text, variables) : null
  const headerColor = template.header_color || '#0284c7'
  const headerColorDark = darkenColor(headerColor)

  // Convert numbered list in body_details to HTML
  let detailsHtml = ''
  if (bodyDetails) {
    const lines = bodyDetails.split('\n').filter(l => l.trim())
    const isNumberedList = lines.some(l => /^\d+\./.test(l.trim()))
    
    if (isNumberedList) {
      detailsHtml = `
        <h2 style="color: #111827; font-size: 18px; margin-top: 30px;">What's Next?</h2>
        <ol style="padding-left: 20px; color: #4b5563;">
          ${lines.map(line => `<li style="margin-bottom: 10px;">${line.replace(/^\d+\.\s*/, '')}</li>`).join('')}
        </ol>
      `
    } else {
      detailsHtml = `<p style="color: #4b5563; white-space: pre-line;">${bodyDetails}</p>`
    }
  }

  // Badge section
  let badgeHtml = ''
  if (extraContent?.badge) {
    badgeHtml = `
      <div style="text-align: center; margin-bottom: 25px;">
        <span style="display: inline-block; background: ${extraContent.badge.color}20; color: ${extraContent.badge.color}; padding: 8px 16px; border-radius: 20px; font-weight: 600;">${extraContent.badge.text}</span>
      </div>
    `
  }

  // Order details box - use template's order_details_template or fallback to extraContent
  let orderDetailsHtml = ''
  if (template.order_details_template) {
    const orderDetailsContent = interpolate(template.order_details_template, variables)
    const lines = orderDetailsContent.split('\n').filter(l => l.trim())
    const formattedLines = lines.map(line => {
      // Split on first colon to separate label from value
      const colonIndex = line.indexOf(':')
      if (colonIndex > 0) {
        const label = line.substring(0, colonIndex + 1)
        const value = line.substring(colonIndex + 1).trim()
        return `<p style="margin: 0 0 10px 0;"><strong>${label}</strong> ${value}</p>`
      }
      return `<p style="margin: 0 0 10px 0;">${line}</p>`
    }).join('')
    
    orderDetailsHtml = `
      <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        ${formattedLines}
      </div>
    `
  } else if (extraContent?.orderDetails) {
    orderDetailsHtml = `
      <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        ${extraContent.orderDetails}
      </div>
    `
  }

  // Revision notes box
  let revisionNotesHtml = ''
  if (extraContent?.revisionNotes) {
    revisionNotesHtml = `
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 10px 0; color: #991b1b;">Notes from our team:</h3>
        <p style="margin: 0; color: #7f1d1d; white-space: pre-line;">${extraContent.revisionNotes}</p>
      </div>
    `
  }

  // CTA button
  let ctaHtml = ''
  if (template.cta_text && extraContent?.ctaUrl) {
    ctaHtml = `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${extraContent.ctaUrl}" style="display: inline-block; background: linear-gradient(135deg, ${headerColor} 0%, ${headerColorDark} 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">${template.cta_text}</a>
      </div>
    `
  }

  // Icon for shipped emails
  let iconHtml = ''
  if (template.id === 'shipped') {
    iconHtml = `
      <div style="text-align: center; margin-bottom: 25px;">
        <span style="display: inline-block; font-size: 48px;">📦</span>
      </div>
    `
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, ${headerColor} 0%, ${headerColorDark} 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">${heading}</h1>
      </div>
      
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        ${iconHtml}
        ${badgeHtml}
        
        <p style="font-size: 16px; margin-bottom: 20px;">${bodyIntro}</p>
        
        ${orderDetailsHtml}
        ${revisionNotesHtml}
        ${detailsHtml}
        ${ctaHtml}
        
        ${footerText ? `
        <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280;">
          ${footerText}
        </p>
        ` : ''}
        
        <p style="margin-top: 20px; color: #374151;">
          Best regards,<br>
          <strong>The My Swag Co Team</strong>
        </p>
      </div>
    </body>
    </html>
  `
}

async function sendEmail({ to, subject, html }: EmailOptions) {
  // If no API key configured, just log (for development)
  if (!process.env.RESEND_API_KEY) {
    console.log('Email would be sent (no RESEND_API_KEY configured):', { to, subject })
    return { success: true, data: null }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `My Swag Co <${fromAddress}>`,
      to,
      subject,
      html
    })

    if (error) {
      console.error('Error sending email:', error)
      return { success: false, error }
    }

    console.log('Email sent successfully:', { to, subject, id: data?.id })
    return { success: true, data }
  } catch (err) {
    console.error('Failed to send email:', err)
    return { success: false, error: err }
  }
}

export async function sendOrderConfirmationEmail(
  customerEmail: string,
  customerName: string,
  orderId: string,
  totalCost: number,
  depositAmount: number
) {
  const template = await getTemplate('order_confirmation')
  const variables = {
    customer_name: customerName,
    order_id: orderId.slice(0, 8).toUpperCase(),
    total_cost: totalCost.toFixed(2),
    deposit_amount: depositAmount.toFixed(2),
    balance_due: (totalCost - depositAmount).toFixed(2)
  }

  const html = generateEmailHtml(template, variables)
  const subject = interpolate(template.subject, variables)

  return sendEmail({ to: customerEmail, subject, html })
}

export async function sendArtApprovedEmail(
  customerEmail: string,
  customerName: string,
  orderId: string,
  estimatedShipDate: string
) {
  const template = await getTemplate('art_approved')
  const variables = {
    customer_name: customerName,
    order_id: orderId.slice(0, 8).toUpperCase(),
    estimated_ship_date: estimatedShipDate
  }

  const html = generateEmailHtml(template, variables, { 
    badge: { text: '✓ Artwork Approved', color: '#065f46' }
  })
  const subject = interpolate(template.subject, variables)

  return sendEmail({ to: customerEmail, subject, html })
}

export async function sendBalanceDueEmail(
  customerEmail: string,
  customerName: string,
  orderId: string,
  balanceDue: number,
  paymentLink: string
) {
  const template = await getTemplate('balance_due')
  const variables = {
    customer_name: customerName,
    order_id: orderId.slice(0, 8).toUpperCase(),
    balance_due: balanceDue.toFixed(2),
    payment_link: paymentLink
  }

  const html = generateEmailHtml(template, variables, { 
    ctaUrl: paymentLink
  })
  const subject = interpolate(template.subject, variables)

  return sendEmail({ to: customerEmail, subject, html })
}

export async function sendBalancePaidEmail(
  customerEmail: string,
  customerName: string,
  orderId: string,
  amountPaid: number
) {
  const template = await getTemplate('balance_paid')
  const variables = {
    customer_name: customerName,
    order_id: orderId.slice(0, 8).toUpperCase(),
    amount_paid: amountPaid.toFixed(2)
  }

  const html = generateEmailHtml(template, variables, { 
    badge: { text: '✓ Payment Confirmed', color: '#065f46' }
  })
  const subject = interpolate(template.subject, variables)

  return sendEmail({ to: customerEmail, subject, html })
}

export async function sendArtRevisionNeededEmail(
  customerEmail: string,
  customerName: string,
  orderId: string,
  revisionNotes: string
) {
  const template = await getTemplate('art_revision_needed')
  const variables = {
    customer_name: customerName,
    order_id: orderId.slice(0, 8).toUpperCase(),
    revision_notes: revisionNotes
  }

  const html = generateEmailHtml(template, variables, { 
    revisionNotes
  })
  const subject = interpolate(template.subject, variables)

  return sendEmail({ to: customerEmail, subject, html })
}

export async function sendShippingNotificationEmail(
  customerEmail: string,
  customerName: string,
  orderId: string,
  trackingNumber: string,
  carrier: string,
  shippingAddress?: { street: string; city: string; state: string; zip: string }
) {
  // Generate tracking URL based on carrier (only if tracking info provided)
  let trackingUrl = ''
  const hasTracking = trackingNumber && carrier
  if (hasTracking) {
    const carrierLower = carrier.toLowerCase()
    if (carrierLower.includes('ups')) {
      trackingUrl = `https://www.ups.com/track?tracknum=${trackingNumber}`
    } else if (carrierLower.includes('fedex')) {
      trackingUrl = `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`
    } else if (carrierLower.includes('usps')) {
      trackingUrl = `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`
    } else if (carrierLower.includes('dhl')) {
      trackingUrl = `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`
    } else {
      trackingUrl = '#'
    }
  }

  const template = await getTemplate('shipped')
  
  // Build order details dynamically based on what info we have
  let orderDetailsLines = [`Order ID: {{order_id}}`]
  if (hasTracking) {
    orderDetailsLines.push(`Carrier: {{carrier}}`)
    orderDetailsLines.push(`Tracking Number: {{tracking_number}}`)
  }
  if (shippingAddress) {
    orderDetailsLines.push(``) // Empty line for spacing
    orderDetailsLines.push(`Shipping To:`)
    orderDetailsLines.push(`${shippingAddress.street}`)
    orderDetailsLines.push(`${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zip}`)
  }

  const variables = {
    customer_name: customerName,
    order_id: orderId.slice(0, 8).toUpperCase(),
    tracking_number: trackingNumber || '',
    carrier: carrier || '',
    tracking_url: trackingUrl || '#'
  }

  // Create a custom template with dynamic order details
  const customTemplate = {
    ...template,
    order_details_template: orderDetailsLines.join('\n')
  }

  // Only include CTA button if we have a valid tracking URL
  const html = generateEmailHtml(customTemplate, variables, hasTracking ? { 
    ctaUrl: trackingUrl
  } : undefined)
  const subject = interpolate(template.subject, variables)

  return sendEmail({ to: customerEmail, subject, html })
}
