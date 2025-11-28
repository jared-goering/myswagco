import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase/server'
import { defaultTemplates, EmailTemplateId } from '@/lib/email-templates'
import { generateEmailHtml } from '@/lib/email'
import { addBusinessDays, format } from 'date-fns'

// Disable caching for this route
export const dynamic = 'force-dynamic'

const resend = new Resend(process.env.RESEND_API_KEY)
const fromAddress = process.env.EMAIL_FROM_ADDRESS || 'onboarding@resend.dev'

// Get sample data for test emails (some values are dynamic)
function getSampleData(templateId: EmailTemplateId, template: { estimated_ship_days?: number }): Record<string, string> {
  const baseData: Record<EmailTemplateId, Record<string, string>> = {
    order_confirmation: {
      customer_name: 'Test Customer',
      order_id: 'ABC12345',
      total_cost: '450.00',
      deposit_amount: '225.00',
      balance_due: '225.00'
    },
    art_approved: {
      customer_name: 'Test Customer',
      order_id: 'ABC12345',
      estimated_ship_date: format(
        addBusinessDays(new Date(), template.estimated_ship_days || 14),
        'MMMM d, yyyy'
      )
    },
    balance_due: {
      customer_name: 'Test Customer',
      order_id: 'ABC12345',
      balance_due: '225.00',
      payment_link: 'https://example.com/pay'
    },
    balance_paid: {
      customer_name: 'Test Customer',
      order_id: 'ABC12345',
      amount_paid: '225.00'
    },
    art_revision_needed: {
      customer_name: 'Test Customer',
      order_id: 'ABC12345',
      revision_notes: 'The logo resolution is too low for quality printing. Please provide a vector file (AI, EPS, or SVG) or a high-resolution PNG (at least 300 DPI).'
    },
    shipped: {
      customer_name: 'Test Customer',
      order_id: 'ABC12345',
      tracking_number: '1Z999AA10123456784',
      carrier: 'UPS',
      tracking_url: 'https://www.ups.com/track?tracknum=1Z999AA10123456784'
    }
  }
  return baseData[templateId]
}

// POST /api/email-templates/[id]/test - Send test email
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const templateId = params.id as EmailTemplateId

  // Check if valid template ID
  if (!defaultTemplates[templateId]) {
    return NextResponse.json(
      { error: 'Invalid template ID' },
      { status: 404 }
    )
  }

  try {
    const body = await request.json()
    const testEmail = body.email

    if (!testEmail || !testEmail.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email address required' },
        { status: 400 }
      )
    }

    // Fetch template from database or use defaults
    const { data: dbTemplate } = await supabaseAdmin
      .from('email_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    const template = dbTemplate || defaultTemplates[templateId]
    const variables = getSampleData(templateId, template)

    // Generate email HTML
    const html = generateEmailHtml(template, variables)
    
    // Interpolate subject
    let subject = template.subject
    Object.entries(variables).forEach(([key, value]) => {
      subject = subject.replace(new RegExp(`{{${key}}}`, 'g'), value)
    })
    subject = `[TEST] ${subject}`

    // Check if Resend is configured
    if (!process.env.RESEND_API_KEY) {
      console.log('Test email would be sent (no RESEND_API_KEY configured):', { 
        to: testEmail, 
        subject,
        templateId 
      })
      return NextResponse.json({
        success: true,
        message: 'Test email logged (no RESEND_API_KEY configured)',
        preview: true
      })
    }

    // Send test email
    const { data, error } = await resend.emails.send({
      from: `My Swag Co <${fromAddress}>`,
      to: testEmail,
      subject,
      html
    })

    if (error) {
      console.error('Error sending test email:', error)
      return NextResponse.json(
        { error: 'Failed to send test email', details: error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${testEmail}`,
      emailId: data?.id
    })

  } catch (error) {
    console.error('Error sending test email:', error)
    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 }
    )
  }
}

