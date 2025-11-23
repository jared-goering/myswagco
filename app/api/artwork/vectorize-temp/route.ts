import { NextRequest, NextResponse } from 'next/server'

// Helper function to count unique colors in SVG
function countSvgColors(svgText: string): number {
  const colors = new Set<string>()
  
  // Match fill and stroke attributes with color values
  const fillMatches = svgText.matchAll(/fill=["']([^"']+)["']/g)
  const strokeMatches = svgText.matchAll(/stroke=["']([^"']+)["']/g)
  
  // Also check for style attributes
  const styleMatches = svgText.matchAll(/style=["']([^"']+)["']/g)
  
  for (const match of fillMatches) {
    const color = match[1].toLowerCase()
    if (color !== 'none' && color !== 'transparent') {
      colors.add(normalizeColor(color))
    }
  }
  
  for (const match of strokeMatches) {
    const color = match[1].toLowerCase()
    if (color !== 'none' && color !== 'transparent') {
      colors.add(normalizeColor(color))
    }
  }
  
  for (const match of styleMatches) {
    const style = match[1]
    const fillMatch = style.match(/fill:\s*([^;]+)/)
    const strokeMatch = style.match(/stroke:\s*([^;]+)/)
    
    if (fillMatch) {
      const color = fillMatch[1].trim().toLowerCase()
      if (color !== 'none' && color !== 'transparent') {
        colors.add(normalizeColor(color))
      }
    }
    
    if (strokeMatch) {
      const color = strokeMatch[1].trim().toLowerCase()
      if (color !== 'none' && color !== 'transparent') {
        colors.add(normalizeColor(color))
      }
    }
  }
  
  return colors.size
}

// Normalize color values to handle different formats (hex, rgb, named colors)
function normalizeColor(color: string): string {
  color = color.trim().toLowerCase()
  
  // Convert rgb/rgba to hex for comparison
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0')
    const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0')
    const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0')
    return `#${r}${g}${b}`
  }
  
  return color
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'Missing file' },
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

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only PNG and JPG files can be vectorized' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Call Vectorizer.ai API
    const vectorizerFormData = new FormData()
    vectorizerFormData.append('image', new Blob([buffer], { type: file.type }), file.name)
    vectorizerFormData.append('mode', 'production') // Use production mode for best quality
    
    const vectorizerResponse = await fetch('https://vectorizer.ai/api/v1/vectorize', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(apiKey).toString('base64')}`,
      },
      body: vectorizerFormData,
    })

    if (!vectorizerResponse.ok) {
      const errorText = await vectorizerResponse.text()
      console.error('Vectorizer.ai API error:', errorText)
      
      return NextResponse.json(
        { error: `Vectorization failed: ${errorText}` },
        { status: vectorizerResponse.status }
      )
    }

    // Get the SVG result
    const svgBuffer = await vectorizerResponse.arrayBuffer()
    const svgBlob = new Blob([svgBuffer], { type: 'image/svg+xml' })
    
    // Create a data URL for immediate preview
    const svgBase64 = Buffer.from(svgBuffer).toString('base64')
    const svgDataUrl = `data:image/svg+xml;base64,${svgBase64}`
    
    // Parse SVG to count unique colors
    const svgText = Buffer.from(svgBuffer).toString('utf-8')
    const colorCount = countSvgColors(svgText)

    return NextResponse.json({
      success: true,
      svg_data_url: svgDataUrl,
      svg_size: svgBuffer.byteLength,
      color_count: colorCount,
      message: 'Vectorization successful. SVG will be uploaded with order at checkout.'
    })

  } catch (error) {
    console.error('Error in vectorization:', error)
    return NextResponse.json(
      { error: 'Failed to vectorize artwork' },
      { status: 500 }
    )
  }
}

