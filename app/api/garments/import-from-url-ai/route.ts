import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SUPPORTED_SUPPLIERS = ['ssactivewear.com', 'ascolour.com']

interface ImportedGarmentData {
  name: string
  brand: string
  description: string
  available_colors: string[]
  size_range: string[]
  thumbnail_url: string | null
  base_cost: number | null
  color_images?: { [color: string]: string }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    // Validate URL is from a supported supplier
    const isSupported = SUPPORTED_SUPPLIERS.some(supplier => 
      url.toLowerCase().includes(supplier)
    )

    if (!isSupported) {
      return NextResponse.json(
        { 
          error: `Unsupported supplier. Currently supporting: ${SUPPORTED_SUPPLIERS.join(', ')}` 
        },
        { status: 400 }
      )
    }

    // Validate it's a proper URL
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    const isAsColour = url.toLowerCase().includes('ascolour.com')

    console.log('Starting AI-powered web scraping for:', url)

    // Use Claude with browser tools to intelligently scrape the page
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      tools: [
        {
          type: "browser_20241022" as any,
          name: "browser",
        }
      ],
      messages: [
        {
          role: 'user',
          content: `I need you to extract product information from this garment supplier website: ${url}

This is a product page for a t-shirt or apparel item. I need you to:

1. Navigate to the URL
2. Look at the page and identify:
   - Product name (e.g., "Staple Tee - 5001")
   - Brand name (e.g., "AS Colour")
   - Description (fabric, weight, fit, features)
   - Base/wholesale price (if visible)
   - All available sizes
   
3. **MOST IMPORTANTLY**: Find ALL available color options. There are usually 50-80+ colors.
   
4. For AS Colour specifically: There are color swatch buttons/circles. I need you to:
   - Click on EACH color swatch one by one
   - After clicking each swatch, capture the main product image URL that appears
   - Record the mapping: color name → image URL
   
5. Be thorough - don't stop at just a few colors, get ALL of them.

Return your findings as a JSON object with this exact structure:
{
  "name": "Product Name",
  "brand": "Brand Name",
  "description": "Detailed description...",
  "available_colors": ["Color1", "Color2", "Color3", ...],
  "size_range": ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
  "thumbnail_url": "https://...",
  "base_cost": 14.50,
  "color_images": {
    "Color1": "https://image-url-1.jpg",
    "Color2": "https://image-url-2.jpg",
    ...
  }
}

Important notes:
- Get EVERY single color - there should be 50+ colors for AS Colour products
- For color_images, each key should be the color name, and value should be the product image URL for that color
- If you can't find base_cost, use null
- Be patient and thorough when clicking through colors

Start by navigating to the page and taking a snapshot to see what we're working with.`
        }
      ]
    })

    console.log('Claude is interacting with the page...')
    console.log('Stop reason:', message.stop_reason)
    console.log('Content blocks:', message.content.length)

    // Extract the text response from Claude
    let extractedData: ImportedGarmentData | null = null
    let conversationMessages = [
      { role: 'user' as const, content: message.content[0].type === 'text' ? message.content[0].text : '' },
    ]

    // Handle tool use loop
    let currentMessage = message
    let iterations = 0
    const maxIterations = 50 // Allow up to 50 tool calls (for clicking through many colors)

    while (currentMessage.stop_reason === 'tool_use' && iterations < maxIterations) {
      iterations++
      console.log(`Tool use iteration ${iterations}...`)

      // This is where the browser tool calls would be handled
      // In a real implementation, these would be executed by your MCP server
      // For now, we'll just acknowledge we received tool use
      
      // Extract any text content
      const textContent = currentMessage.content.find(block => block.type === 'text')
      if (textContent && 'text' in textContent) {
        console.log('Claude says:', textContent.text.substring(0, 200))
      }

      // In production, you'd execute the tool calls and send results back
      // For now, we'll break and provide a helpful error
      break
    }

    // Try to find JSON in the response
    for (const block of currentMessage.content) {
      if (block.type === 'text') {
        const text = block.text
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try {
            extractedData = JSON.parse(jsonMatch[0])
            break
          } catch (e) {
            console.error('Failed to parse JSON from Claude response')
          }
        }
      }
    }

    if (!extractedData) {
      return NextResponse.json(
        { 
          error: 'AI browser automation is not fully configured yet. Please use standard import or browser automation (Puppeteer) method instead.',
          details: 'This endpoint requires MCP browser server to be running. See documentation for setup.'
        },
        { status: 501 }
      )
    }

    // Validate the extracted data
    if (!extractedData.name || !extractedData.brand) {
      return NextResponse.json(
        { error: 'Failed to extract required product information (name and brand)' },
        { status: 500 }
      )
    }

    console.log('Successfully extracted data:', {
      ...extractedData,
      color_count: extractedData.available_colors.length,
      color_images_count: Object.keys(extractedData.color_images || {}).length
    })

    return NextResponse.json(extractedData)

  } catch (error) {
    console.error('Error in AI import:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to import product data' 
      },
      { status: 500 }
    )
  }
}

