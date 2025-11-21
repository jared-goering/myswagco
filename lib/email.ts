// Email service using Resend
// Install with: npm install resend

interface EmailOptions {
  to: string
  subject: string
  html: string
}

async function sendEmail({ to, subject, html }: EmailOptions) {
  // For now, this is a placeholder. In production, you would use Resend or similar
  console.log('Email would be sent:', { to, subject })
  
  // Uncomment when you have RESEND_API_KEY configured:
  /*
  const resend = new Resend(process.env.RESEND_API_KEY!)
  
  await resend.emails.send({
    from: 'orders@myswagco.com',
    to,
    subject,
    html
  })
  */
}

export async function sendOrderConfirmationEmail(
  customerEmail: string,
  customerName: string,
  orderId: string,
  totalCost: number,
  depositAmount: number
) {
  const subject = 'Order Confirmation - My Swag Co'
  const html = `
    <h1>Thanks for your order, ${customerName}!</h1>
    <p>Your custom screen printing order has been received.</p>
    <p><strong>Order ID:</strong> ${orderId}</p>
    <p><strong>Total Cost:</strong> $${totalCost.toFixed(2)}</p>
    <p><strong>Deposit Paid:</strong> $${depositAmount.toFixed(2)}</p>
    <p><strong>Balance Due:</strong> $${(totalCost - depositAmount).toFixed(2)}</p>
    
    <h2>What's Next?</h2>
    <p>Our team will review your artwork within 1-2 business days. If everything looks good, your order will be approved automatically and move into production.</p>
    <p>Most orders ship in ~14 business days after art approval.</p>
    
    <p>If you have any questions, please reply to this email.</p>
    
    <p>Best regards,<br>The My Swag Co Team</p>
  `
  
  await sendEmail({ to: customerEmail, subject, html })
}

export async function sendArtApprovedEmail(
  customerEmail: string,
  customerName: string,
  orderId: string,
  estimatedShipDate: string
) {
  const subject = 'Artwork Approved - Order Moving to Production'
  const html = `
    <h1>Great news, ${customerName}!</h1>
    <p>Your artwork has been approved and we've moved your order into production.</p>
    <p><strong>Order ID:</strong> ${orderId}</p>
    <p><strong>Estimated Ship Date:</strong> ${estimatedShipDate}</p>
    
    <p>We'll send you another email when your order ships with tracking information.</p>
    
    <p>Best regards,<br>The My Swag Co Team</p>
  `
  
  await sendEmail({ to: customerEmail, subject, html })
}

export async function sendBalanceDueEmail(
  customerEmail: string,
  customerName: string,
  orderId: string,
  balanceDue: number,
  paymentLink: string
) {
  const subject = 'Balance Due - Order Ready to Ship'
  const html = `
    <h1>Hi ${customerName},</h1>
    <p>Your order is ready to ship! Before we send it out, we need to collect the remaining balance.</p>
    <p><strong>Order ID:</strong> ${orderId}</p>
    <p><strong>Balance Due:</strong> $${balanceDue.toFixed(2)}</p>
    
    <p><a href="${paymentLink}" style="background-color: #0284c7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Pay Balance</a></p>
    
    <p>Once payment is received, we'll ship your order immediately.</p>
    
    <p>Best regards,<br>The My Swag Co Team</p>
  `
  
  await sendEmail({ to: customerEmail, subject, html })
}

export async function sendArtRevisionNeededEmail(
  customerEmail: string,
  customerName: string,
  orderId: string,
  revisionNotes: string
) {
  const subject = 'Artwork Revision Needed'
  const html = `
    <h1>Hi ${customerName},</h1>
    <p>We've reviewed your artwork and need to discuss a few things before we can proceed with production.</p>
    <p><strong>Order ID:</strong> ${orderId}</p>
    
    <h2>Notes:</h2>
    <p>${revisionNotes}</p>
    
    <p>Please reply to this email or give us a call to discuss. We'll help you get everything sorted out quickly.</p>
    
    <p>Best regards,<br>The My Swag Co Team</p>
  `
  
  await sendEmail({ to: customerEmail, subject, html })
}

export async function sendShippingNotificationEmail(
  customerEmail: string,
  customerName: string,
  orderId: string,
  trackingNumber: string,
  carrier: string
) {
  const subject = 'Your Order Has Shipped!'
  const html = `
    <h1>Great news, ${customerName}!</h1>
    <p>Your custom screen printing order has shipped and is on its way to you.</p>
    <p><strong>Order ID:</strong> ${orderId}</p>
    <p><strong>Carrier:</strong> ${carrier}</p>
    <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
    
    <p>You can track your shipment at the carrier's website.</p>
    
    <p>Thank you for your business!</p>
    
    <p>Best regards,<br>The My Swag Co Team</p>
  `
  
  await sendEmail({ to: customerEmail, subject, html })
}

