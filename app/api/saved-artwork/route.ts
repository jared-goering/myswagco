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

// GET - Retrieve all saved artwork for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const supabase = createAuthClient()
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('[saved-artwork GET] Auth check:', { 
      hasUser: !!user, 
      email: user?.email,
      authError: authError?.message,
      // Log cookie names present (not values for security)
      cookieNames: request.cookies.getAll().map(c => c.name)
    })
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', details: authError?.message },
        { status: 401 }
      )
    }
    
    // Fetch saved artwork for this user
    const { data: artwork, error } = await supabase
      .from('saved_artwork')
      .select('*')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching saved artwork:', error)
      return NextResponse.json(
        { error: 'Failed to fetch saved artwork' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(artwork)
  } catch (error) {
    console.error('Error in GET /api/saved-artwork:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Save new artwork
export async function POST(request: NextRequest) {
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
    const { name, image_data, prompt, is_ai_generated, metadata } = body
    
    if (!name || !image_data) {
      return NextResponse.json(
        { error: 'Name and image_data are required' },
        { status: 400 }
      )
    }
    
    // Upload the image to Supabase Storage
    const imageBuffer = Buffer.from(image_data.split(',')[1], 'base64')
    const fileName = `${user.id}/${Date.now()}-${name.replace(/[^a-zA-Z0-9]/g, '_')}.png`
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('saved-artwork')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        cacheControl: '3600',
      })
    
    if (uploadError) {
      console.error('Error uploading image:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload image' },
        { status: 500 }
      )
    }
    
    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('saved-artwork')
      .getPublicUrl(fileName)
    
    // Create thumbnail (same as main image for now)
    const thumbnailUrl = publicUrl
    
    // Save to database
    const { data: artwork, error: dbError } = await supabase
      .from('saved_artwork')
      .insert({
        customer_id: user.id,
        name,
        image_url: publicUrl,
        thumbnail_url: thumbnailUrl,
        prompt: prompt || null,
        is_ai_generated: is_ai_generated || false,
        metadata: metadata || null,
      })
      .select()
      .single()
    
    if (dbError) {
      console.error('Error saving artwork to database:', dbError)
      return NextResponse.json(
        { error: 'Failed to save artwork' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(artwork, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/saved-artwork:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

