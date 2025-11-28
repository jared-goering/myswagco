import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { defaultTemplates, EmailTemplateId } from '../route'

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

// GET /api/email-templates/[id] - Get single template
export async function GET(
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
    const supabase = getSupabaseAdmin()
    // Fetch from database
    const { data: dbTemplate, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching email template:', error)
    }

    // Return DB template merged with defaults, or just defaults
    const defaultTemplate = defaultTemplates[templateId]
    
    if (dbTemplate) {
      return NextResponse.json({
        ...defaultTemplate,
        ...dbTemplate,
        // Use default for null values
        order_details_template: dbTemplate.order_details_template ?? defaultTemplate.order_details_template,
        variables: defaultTemplate.variables
      })
    }

    return NextResponse.json(defaultTemplate)
  } catch (error) {
    console.error('Error in email template API:', error)
    return NextResponse.json(defaultTemplates[templateId])
  }
}

// PUT /api/email-templates/[id] - Update template
export async function PUT(
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
    
    const updateData: Record<string, unknown> = {
      id: templateId,
      subject: body.subject,
      heading: body.heading,
      body_intro: body.body_intro,
      body_details: body.body_details || null,
      cta_text: body.cta_text || null,
      footer_text: body.footer_text || null,
      header_color: body.header_color || '#0284c7',
      order_details_template: body.order_details_template || null
    }

    // Add estimated_ship_days for art_approved template
    if (templateId === 'art_approved' && body.estimated_ship_days !== undefined) {
      updateData.estimated_ship_days = body.estimated_ship_days
    }

    const supabase = getSupabaseAdmin()

    // Check if template exists
    const { data: existing } = await supabase
      .from('email_templates')
      .select('id')
      .eq('id', templateId)
      .single()

    let data
    let error

    if (existing) {
      // Update existing record
      const result = await supabase
        .from('email_templates')
        .update(updateData)
        .eq('id', templateId)
        .select()
        .single()
      data = result.data
      error = result.error
    } else {
      // Insert new record
      const result = await supabase
        .from('email_templates')
        .insert(updateData)
        .select()
        .single()
      data = result.data
      error = result.error
    }

    if (error) {
      console.error('Error updating email template:', error)
      return NextResponse.json(
        { error: 'Failed to update template', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ...data,
      variables: defaultTemplates[templateId].variables
    })
  } catch (error) {
    console.error('Error in email template update:', error)
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    )
  }
}

