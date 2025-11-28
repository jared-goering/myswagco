import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Force dynamic rendering for routes using cookies/auth
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

// Helper to get authenticated user (optional - returns null if not logged in)
async function getAuthenticatedUser() {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
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
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const orderId = formData.get('order_id') as string
    const location = formData.get('location') as string
    const transformStr = formData.get('transform') as string | null
    const userId = formData.get('user_id') as string | null // Optional: passed from client
    const userEmail = formData.get('user_email') as string | null
    const userName = formData.get('user_name') as string | null
    
    if (!file || !orderId || !location) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Try to get user from cookies first, fall back to passed user_id
    let user = await getAuthenticatedUser()
    
    // If no user from cookies but user_id was passed, create a minimal user object
    if (!user && userId) {
      user = { id: userId, email: userEmail, user_metadata: { name: userName } } as any
      console.log(`Using user_id from request: ${userId}`)
    }
    
    // Parse transform data if provided
    let transform = null
    if (transformStr) {
      try {
        transform = JSON.parse(transformStr)
      } catch (e) {
        console.error('Error parsing transform data:', e)
        // Continue without transform data - it's optional
      }
    }
    
    // Validate file type
    const allowedTypes = [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'application/pdf',
      'application/postscript', // AI/EPS
      'image/svg+xml'
    ]
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: PNG, JPG, PDF, AI, EPS, SVG' },
        { status: 400 }
      )
    }
    
    // Determine if file is vector format
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    const vectorExtensions = ['svg', 'ai', 'eps']
    const isVector = vectorExtensions.includes(fileExtension || '')
    
    // Set vectorization status based on file type
    const vectorizationStatus = isVector ? 'not_needed' : 'pending'
    
    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024 // 50MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 50MB' },
        { status: 400 }
      )
    }
    
    // Generate unique filename
    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `${orderId}/${location}_${timestamp}_${safeName}`
    
    // Upload to Supabase Storage
    const fileBuffer = await file.arrayBuffer()
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from('artwork')
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false
      })
    
    if (uploadError) {
      console.error('Error uploading file:', uploadError)
      throw uploadError
    }
    
    // Get public URL
    const { data: urlData } = supabaseAdmin
      .storage
      .from('artwork')
      .getPublicUrl(fileName)
    
    // Save artwork file record
    const { data: artworkFile, error: dbError } = await supabaseAdmin
      .from('artwork_files')
      .insert({
        order_id: orderId,
        location: location,
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_size: file.size,
        is_vector: isVector,
        vectorization_status: vectorizationStatus,
        transform: transform
      })
      .select()
      .single()
    
    if (dbError) {
      console.error('Error saving artwork record:', dbError)
      throw dbError
    }
    
    // If user is authenticated, also save to their saved_artwork collection
    if (user) {
      try {
        console.log(`Attempting to auto-save artwork for user: ${user.id} (${user.email})`)
        
        // First, ensure customer record exists (create if not)
        const { data: existingCustomer } = await supabaseAdmin
          .from('customers')
          .select('id')
          .eq('id', user.id)
          .single()
        
        if (!existingCustomer) {
          console.log(`Creating customer record for user ${user.id}`)
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
            // Don't fail - continue without saving to account
            return NextResponse.json(artworkFile)
          }
        }
        
        // Check if this artwork already exists in saved_artwork (by file URL)
        const { data: existingArtwork } = await supabaseAdmin
          .from('saved_artwork')
          .select('id')
          .eq('customer_id', user.id)
          .eq('image_url', urlData.publicUrl)
          .single()
        
        // Only save if it doesn't already exist
        if (!existingArtwork) {
          const artworkName = file.name.replace(/\.[^/.]+$/, '') // Remove extension
          
          const { data: savedArtwork, error: saveError } = await supabaseAdmin
            .from('saved_artwork')
            .insert({
              customer_id: user.id,
              name: artworkName,
              image_url: urlData.publicUrl,
              thumbnail_url: urlData.publicUrl,
              is_ai_generated: false,
              metadata: {
                original_filename: file.name,
                file_size: file.size,
                location: location,
                is_vector: isVector,
                auto_saved_from_order: true
              }
            })
            .select()
            .single()
          
          if (saveError) {
            console.error('Error saving artwork to user account:', saveError)
          } else {
            console.log(`Auto-saved artwork "${artworkName}" to user ${user.id}'s account (id: ${savedArtwork?.id})`)
          }
        } else {
          console.log(`Artwork already exists in user's saved artwork (id: ${existingArtwork.id})`)
        }
      } catch (saveError) {
        // Don't fail the upload if saving to account fails - just log it
        console.error('Error auto-saving artwork to user account:', saveError)
      }
    } else {
      console.log('No authenticated user - skipping auto-save to account')
    }
    
    return NextResponse.json(artworkFile)
  } catch (error) {
    console.error('Error in artwork upload:', error)
    return NextResponse.json(
      { error: 'Failed to upload artwork' },
      { status: 500 }
    )
  }
}

