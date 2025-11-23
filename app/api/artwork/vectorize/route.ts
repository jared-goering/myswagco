import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { artwork_file_id } = await request.json()
    
    if (!artwork_file_id) {
      return NextResponse.json(
        { error: 'Missing artwork_file_id' },
        { status: 400 }
      )
    }

    // Check for API key
    const apiKey = process.env.VECTORIZER_AI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Vectorizer.ai API key not configured' },
        { status: 500 }
      )
    }

    // Fetch artwork file record
    const { data: artworkFile, error: fetchError } = await supabaseAdmin
      .from('artwork_files')
      .select('*')
      .eq('id', artwork_file_id)
      .single()

    if (fetchError || !artworkFile) {
      return NextResponse.json(
        { error: 'Artwork file not found' },
        { status: 404 }
      )
    }

    // Check if already vector or already vectorized
    if (artworkFile.is_vector) {
      return NextResponse.json(
        { error: 'File is already a vector format' },
        { status: 400 }
      )
    }

    if (artworkFile.vectorization_status === 'completed' && artworkFile.vectorized_file_url) {
      return NextResponse.json({
        success: true,
        vectorized_file_url: artworkFile.vectorized_file_url,
        status: 'completed'
      })
    }

    // Update status to processing
    await supabaseAdmin
      .from('artwork_files')
      .update({ vectorization_status: 'processing' })
      .eq('id', artwork_file_id)

    // Extract the storage path from the file URL
    const urlParts = artworkFile.file_url.split('/storage/v1/object/public/artwork/')
    if (urlParts.length < 2) {
      throw new Error('Invalid file URL format')
    }
    const storagePath = urlParts[1]

    // Download the original file from Supabase storage
    const { data: fileData, error: downloadError } = await supabaseAdmin
      .storage
      .from('artwork')
      .download(storagePath)

    if (downloadError || !fileData) {
      console.error('Error downloading file:', downloadError)
      await supabaseAdmin
        .from('artwork_files')
        .update({ vectorization_status: 'failed' })
        .eq('id', artwork_file_id)
      throw new Error('Failed to download file from storage')
    }

    // Convert blob to buffer
    const arrayBuffer = await fileData.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Call Vectorizer.ai API
    const formData = new FormData()
    formData.append('image', new Blob([buffer], { type: fileData.type }), artworkFile.file_name)
    
    // Vectorizer.ai API options
    formData.append('mode', 'production') // Use production mode for best quality
    
    const vectorizerResponse = await fetch('https://vectorizer.ai/api/v1/vectorize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    })

    if (!vectorizerResponse.ok) {
      const errorText = await vectorizerResponse.text()
      console.error('Vectorizer.ai API error:', errorText)
      await supabaseAdmin
        .from('artwork_files')
        .update({ vectorization_status: 'failed' })
        .eq('id', artwork_file_id)
      
      return NextResponse.json(
        { error: `Vectorization failed: ${errorText}` },
        { status: vectorizerResponse.status }
      )
    }

    // Get the SVG result
    const svgBuffer = await vectorizerResponse.arrayBuffer()
    
    // Generate filename for vectorized file
    const timestamp = Date.now()
    const originalName = artworkFile.file_name.replace(/\.[^/.]+$/, '') // Remove extension
    const vectorizedFileName = `${artworkFile.order_id}/${artworkFile.location}_vectorized_${timestamp}_${originalName}.svg`

    // Upload vectorized SVG to Supabase storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from('artwork')
      .upload(vectorizedFileName, svgBuffer, {
        contentType: 'image/svg+xml',
        upsert: false
      })

    if (uploadError) {
      console.error('Error uploading vectorized file:', uploadError)
      await supabaseAdmin
        .from('artwork_files')
        .update({ vectorization_status: 'failed' })
        .eq('id', artwork_file_id)
      throw uploadError
    }

    // Get public URL for vectorized file
    const { data: urlData } = supabaseAdmin
      .storage
      .from('artwork')
      .getPublicUrl(vectorizedFileName)

    // Update artwork file record with vectorized URL and status
    const { data: updatedFile, error: updateError } = await supabaseAdmin
      .from('artwork_files')
      .update({
        vectorized_file_url: urlData.publicUrl,
        vectorization_status: 'completed'
      })
      .eq('id', artwork_file_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating artwork record:', updateError)
      throw updateError
    }

    return NextResponse.json({
      success: true,
      vectorized_file_url: urlData.publicUrl,
      status: 'completed',
      artwork_file: updatedFile
    })

  } catch (error) {
    console.error('Error in vectorization:', error)
    return NextResponse.json(
      { error: 'Failed to vectorize artwork' },
      { status: 500 }
    )
  }
}

