import { NextResponse } from 'next/server'
import { defaultTemplates, EmailTemplateId } from '@/lib/email-templates'

// Disable caching for this route
export const dynamic = 'force-dynamic'

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
