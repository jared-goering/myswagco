import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { imageBase64 } = body as { imageBase64: string }

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.REMOVE_BG_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Background removal API key not configured. Please add REMOVE_BG_API_KEY to your environment variables.' },
        { status: 500 }
      )
    }

    // Parse the base64 data URL
    let imageData: string
    let mimeType = 'image/png'
    
    if (imageBase64.startsWith('data:')) {
      const commaIndex = imageBase64.indexOf(',')
      if (commaIndex > 0) {
        const header = imageBase64.substring(0, commaIndex)
        const mimeMatch = header.match(/data:([^;]+)/)
        if (mimeMatch) {
          mimeType = mimeMatch[1]
        }
        imageData = imageBase64.substring(commaIndex + 1)
      } else {
        return NextResponse.json(
          { error: 'Invalid image data format' },
          { status: 400 }
        )
      }
    } else {
      imageData = imageBase64
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(imageData, 'base64')

    // Call remove.bg API
    const formData = new FormData()
    formData.append('image_file', new Blob([imageBuffer], { type: mimeType }), 'image.png')
    formData.append('size', 'auto')
    formData.append('format', 'png')

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('remove.bg API error:', errorText)
      
      if (response.status === 402) {
        return NextResponse.json(
          { error: 'Background removal credits exhausted. Please check your remove.bg account.' },
          { status: 402 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to remove background. Please try again.' },
        { status: response.status }
      )
    }

    // Get the result as buffer and convert to base64
    const resultBuffer = await response.arrayBuffer()
    const resultBase64 = Buffer.from(resultBuffer).toString('base64')
    const resultDataUrl = `data:image/png;base64,${resultBase64}`

    return NextResponse.json({
      success: true,
      image: resultDataUrl,
      message: 'Background removed successfully',
    })

  } catch (error) {
    console.error('Error removing background:', error)
    return NextResponse.json(
      { error: 'Failed to remove background. Please try again.' },
      { status: 500 }
    )
  }
}

