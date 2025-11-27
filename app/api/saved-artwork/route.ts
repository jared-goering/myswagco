import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

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
    
    // Detect content type from base64 data URL
    let contentType = 'image/png'
    let fileExtension = 'png'
    
    if (image_data.startsWith('data:')) {
      const mimeMatch = image_data.match(/^data:([^;]+);/)
      if (mimeMatch) {
        contentType = mimeMatch[1]
        // Map MIME type to extension
        const extensionMap: Record<string, string> = {
          'image/png': 'png',
          'image/jpeg': 'jpg',
          'image/jpg': 'jpg',
          'image/svg+xml': 'svg',
          'image/webp': 'webp',
          'image/gif': 'gif',
        }
        fileExtension = extensionMap[contentType] || 'png'
      }
    }
    
    // Upload the image to Supabase Storage (using 'artwork' bucket with 'saved/' prefix)
    const imageBuffer = Buffer.from(image_data.split(',')[1], 'base64')
    const fileName = `saved/${user.id}/${Date.now()}-${name.replace(/[^a-zA-Z0-9]/g, '_')}.${fileExtension}`
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('artwork')
      .upload(fileName, imageBuffer, {
        contentType: contentType,
        cacheControl: '3600',
        upsert: false
      })
    
    if (uploadError) {
      console.error('Error uploading image:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload image' },
        { status: 500 }
      )
    }
    
    // Get the public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('artwork')
      .getPublicUrl(fileName)
    
    // Create thumbnail (same as main image for now)
    const thumbnailUrl = publicUrl
    
    // Ensure customer record exists (using admin client to bypass RLS)
    const { data: existingCustomer } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('id', user.id)
      .single()
    
    if (!existingCustomer) {
      console.log(`[saved-artwork POST] Creating customer record for user ${user.id}`)
      const { error: customerError } = await supabaseAdmin
        .from('customers')
        .insert({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.user_metadata?.name || null,
          avatar_url: user.user_metadata?.avatar_url || null
        })
      
      if (customerError) {
        console.error('Error creating customer record:', customerError)
        return NextResponse.json(
          { error: 'Failed to create customer record' },
          { status: 500 }
        )
      }
    }
    
    // Save to database (using admin client to ensure insert works)
    const { data: artwork, error: dbError } = await supabaseAdmin
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

