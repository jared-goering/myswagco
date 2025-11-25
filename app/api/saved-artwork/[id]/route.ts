import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

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

// GET - Get a single saved artwork by ID
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
    
    // Fetch the artwork (RLS will ensure user can only access their own)
    const { data: artwork, error } = await supabase
      .from('saved_artwork')
      .select('*')
      .eq('id', params.id)
      .eq('customer_id', user.id)
      .single()
    
    if (error || !artwork) {
      return NextResponse.json(
        { error: 'Artwork not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(artwork)
  } catch (error) {
    console.error('Error in GET /api/saved-artwork/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Update saved artwork (e.g., rename)
export async function PATCH(
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
    
    const body = await request.json()
    const { name, metadata } = body
    
    // Build update object
    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (metadata !== undefined) updates.metadata = metadata
    
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No updates provided' },
        { status: 400 }
      )
    }
    
    // Update the artwork (RLS will ensure user can only update their own)
    const { data: artwork, error } = await supabase
      .from('saved_artwork')
      .update(updates)
      .eq('id', params.id)
      .eq('customer_id', user.id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating artwork:', error)
      return NextResponse.json(
        { error: 'Failed to update artwork' },
        { status: 500 }
      )
    }
    
    if (!artwork) {
      return NextResponse.json(
        { error: 'Artwork not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(artwork)
  } catch (error) {
    console.error('Error in PATCH /api/saved-artwork/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete saved artwork
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
    
    // First, get the artwork to find the image URL
    const { data: artwork, error: fetchError } = await supabase
      .from('saved_artwork')
      .select('image_url')
      .eq('id', params.id)
      .eq('customer_id', user.id)
      .single()
    
    if (fetchError || !artwork) {
      return NextResponse.json(
        { error: 'Artwork not found' },
        { status: 404 }
      )
    }
    
    // Delete the image from storage
    try {
      const url = new URL(artwork.image_url)
      const pathParts = url.pathname.split('/saved-artwork/')
      if (pathParts[1]) {
        await supabase.storage
          .from('saved-artwork')
          .remove([pathParts[1]])
      }
    } catch (e) {
      console.warn('Could not delete image from storage:', e)
    }
    
    // Delete from database
    const { error: deleteError } = await supabase
      .from('saved_artwork')
      .delete()
      .eq('id', params.id)
      .eq('customer_id', user.id)
    
    if (deleteError) {
      console.error('Error deleting artwork:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete artwork' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/saved-artwork/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

