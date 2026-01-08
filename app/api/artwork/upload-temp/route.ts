import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const location = formData.get('location') as string
    const transformStr = formData.get('transform') as string | null
    const isVectorized = formData.get('is_vectorized') === 'true'
    
    if (!file || !location) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Validate file type
    const allowedTypes = [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'application/pdf',
      'application/postscript',
      'image/svg+xml'
    ]
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type' },
        { status: 400 }
      )
    }
    
    // Generate unique filename with timestamp
    const timestamp = Date.now()
    const fileExt = file.name.split('.').pop()
    const fileName = `temp_${timestamp}_${location}.${fileExt}`
    const filePath = `temp-artwork/${fileName}`
    
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from('artwork')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false
      })
    
    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      )
    }
    
    // Get public URL
    const { data: urlData } = supabaseAdmin
      .storage
      .from('artwork')
      .getPublicUrl(filePath)
    
    // Parse transform if provided
    let transform = null
    if (transformStr) {
      try {
        transform = JSON.parse(transformStr)
      } catch (e) {
        // Continue without transform
      }
    }
    
    return NextResponse.json({
      file_url: urlData.publicUrl,
      file_name: file.name,
      file_size: file.size,
      location,
      transform,
      is_vectorized: isVectorized
    })
  } catch (error) {
    console.error('Error uploading temp artwork:', error)
    return NextResponse.json(
      { error: 'Failed to upload artwork' },
      { status: 500 }
    )
  }
}





