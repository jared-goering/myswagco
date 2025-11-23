import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const orderId = formData.get('order_id') as string
    const location = formData.get('location') as string
    const transformStr = formData.get('transform') as string | null
    
    if (!file || !orderId || !location) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
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
    
    return NextResponse.json(artworkFile)
  } catch (error) {
    console.error('Error in artwork upload:', error)
    return NextResponse.json(
      { error: 'Failed to upload artwork' },
      { status: 500 }
    )
  }
}

