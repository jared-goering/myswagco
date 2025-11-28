import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

// Force dynamic rendering for routes using cookies/auth
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

// Helper to create Supabase client with auth
function createAuthClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.delete({ name, ...options })
        },
      },
    }
  )
}

// GET - Get a single order draft by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAuthClient()
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Fetch the draft with garment details
    const { data: draft, error } = await supabase
      .from('order_drafts')
      .select(`
        *,
        garment:garments(id, name, brand, thumbnail_url, available_colors, color_images)
      `)
      .eq('id', params.id)
      .eq('customer_id', user.id)
      .single()
    
    if (error || !draft) {
      return NextResponse.json(
        { error: 'Draft not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(draft)
  } catch (error) {
    console.error('Error in GET /api/order-drafts/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete an order draft
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAuthClient()
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // First verify the draft exists and belongs to user
    const { data: draft, error: fetchError } = await supabase
      .from('order_drafts')
      .select('id')
      .eq('id', params.id)
      .eq('customer_id', user.id)
      .single()
    
    if (fetchError || !draft) {
      return NextResponse.json(
        { error: 'Draft not found' },
        { status: 404 }
      )
    }
    
    // Delete the draft using admin client
    const { error: deleteError } = await supabaseAdmin
      .from('order_drafts')
      .delete()
      .eq('id', params.id)
      .eq('customer_id', user.id)
    
    if (deleteError) {
      console.error('Error deleting draft:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete draft' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/order-drafts/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

