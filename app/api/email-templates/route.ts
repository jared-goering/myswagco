import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Disable caching for this route
export const dynamic = 'force-dynamic'

// Create a fresh client for each request to avoid replica lag
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      db: { schema: 'public' }
    }
  )
}

// Default templates for fallback
export const defaultTemplates = {
  order_confirmation: {
    id: 'order_confirmation',
    subject: 'Order Confirmation - My Swag Co',
    heading: 'Thanks for your order, {{customer_name}}!',
    body_intro: 'Your custom screen printing order has been received and we\'re excited to get started!',
    body_details: `1. Our team will review your artwork within 1-2 business days.
2. Once approved, your order moves into production.
3. Most orders ship within ~14 business days after art approval.
4. We'll collect the remaining balance before shipping.`,
    cta_text: null,
    footer_text: 'If you have any questions, simply reply to this email.',
    header_color: '#0284c7',
    order_details_template: 'Order ID: {{order_id}}\nTotal Cost: ${{total_cost}}\nDeposit Paid: ${{deposit_amount}}\nBalance Due: ${{balance_due}}',
    variables: ['customer_name', 'order_id', 'total_cost', 'deposit_amount', 'balance_due']
  },
  art_approved: {
    id: 'art_approved',
    subject: 'Artwork Approved - Order Moving to Production!',
    heading: 'Great news, {{customer_name}}!',
    body_intro: 'Your artwork has been approved and we\'ve moved your order into production!',
    body_details: null,
    cta_text: null,
    footer_text: 'We\'ll send you another email when your order is ready to ship with payment instructions for the remaining balance.',
    header_color: '#059669',
    estimated_ship_days: 14,
    order_details_template: 'Order ID: {{order_id}}\nEstimated Ship Date: {{estimated_ship_date}}',
    variables: ['customer_name', 'order_id', 'estimated_ship_date']
  },
  balance_due: {
    id: 'balance_due',
    subject: 'Balance Due - Your Order is Ready!',
    heading: 'Your order is ready, {{customer_name}}!',
    body_intro: 'Your custom screen printing order is complete and ready to ship! Before we send it out, we need to collect the remaining balance.',
    body_details: null,
    cta_text: 'Pay Balance Now',
    footer_text: 'Once payment is received, we\'ll ship your order right away!',
    header_color: '#d97706',
    order_details_template: 'Order ID: {{order_id}}\nBalance Due: ${{balance_due}}',
    variables: ['customer_name', 'order_id', 'balance_due', 'payment_link']
  },
  balance_paid: {
    id: 'balance_paid',
    subject: 'Payment Received - Order Shipping Soon!',
    heading: 'Payment Received!',
    body_intro: 'Thanks, {{customer_name}}! We\'ve received your final payment and your order is now ready to ship.',
    body_details: null,
    cta_text: null,
    footer_text: 'We\'ll send you tracking information as soon as your order ships!',
    header_color: '#059669',
    order_details_template: 'Order ID: {{order_id}}\nAmount Paid: ${{amount_paid}}',
    variables: ['customer_name', 'order_id', 'amount_paid']
  },
  art_revision_needed: {
    id: 'art_revision_needed',
    subject: 'Artwork Revision Needed - Action Required',
    heading: 'Artwork Review Update',
    body_intro: 'Hi {{customer_name}}, we\'ve reviewed your artwork and need to discuss a few things before we can proceed with production.',
    body_details: null,
    cta_text: null,
    footer_text: 'Please reply to this email or give us a call to discuss. We\'ll help you get everything sorted out quickly!',
    header_color: '#dc2626',
    order_details_template: 'Order ID: {{order_id}}',
    variables: ['customer_name', 'order_id', 'revision_notes']
  },
  shipped: {
    id: 'shipped',
    subject: 'Your Order Has Shipped!',
    heading: 'Your order is on its way!',
    body_intro: 'Great news, {{customer_name}}! Your custom screen printing order has shipped and is on its way to you.',
    body_details: null,
    cta_text: 'Track Your Package',
    footer_text: 'Thank you for your business! We hope you love your custom shirts.',
    header_color: '#7c3aed',
    order_details_template: 'Order ID: {{order_id}}\nCarrier: {{carrier}}\nTracking Number: {{tracking_number}}',
    variables: ['customer_name', 'order_id', 'tracking_number', 'carrier', 'tracking_url']
  }
}

export type EmailTemplateId = keyof typeof defaultTemplates

export interface EmailTemplate {
  id: string
  subject: string
  heading: string
  body_intro: string
  body_details: string | null
  cta_text: string | null
  footer_text: string | null
  header_color: string
  estimated_ship_days?: number
  order_details_template: string | null
  variables: string[]
  updated_at?: string
}

// GET /api/email-templates - List all templates
export async function GET() {
  try {
    // Use direct REST API call to bypass any client caching issues
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/email_templates?select=*`,
      {
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      }
    )
    
    if (!response.ok) {
      console.error('REST API error:', response.status, await response.text())
      return NextResponse.json(Object.values(defaultTemplates))
    }
    
    const dbTemplates = await response.json()

    // Merge DB templates with defaults (DB takes precedence, but use defaults for null values)
    const templates = Object.keys(defaultTemplates).map(id => {
      const dbTemplate = dbTemplates?.find((t: Record<string, unknown>) => t.id === id)
      const defaultTemplate = defaultTemplates[id as EmailTemplateId]
      
      if (dbTemplate) {
        return {
          ...defaultTemplate,
          ...dbTemplate,
          // Use default for null values
          order_details_template: dbTemplate.order_details_template ?? defaultTemplate.order_details_template,
          variables: defaultTemplate.variables
        }
      }
      return defaultTemplate
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Error in email templates API:', error)
    return NextResponse.json(Object.values(defaultTemplates))
  }
}

