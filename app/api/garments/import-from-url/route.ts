import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SUPPORTED_SUPPLIERS = ['ssactivewear.com', 'ascolour.com']

// S&S Activewear API Configuration
const SSACTIVEWEAR_API_BASE = 'https://api.ssactivewear.com/v2'
const SSACTIVEWEAR_CDN_BASE = 'https://cdn.ssactivewear.com'
const SSACTIVEWEAR_API_KEY = process.env.SSACTIVEWEAR_API_KEY
const SSACTIVEWEAR_ACCOUNT_NUMBER = process.env.SSACTIVEWEAR_ACCOUNT_NUMBER

interface ImportedGarmentData {
  name: string
  brand: string
  description: string
  available_colors: string[]
  size_range: string[]
  thumbnail_url: string | null
  base_cost: number | null
  color_images: Record<string, string> // Required now - maps color name to image URL
}

async function fetchFromSSActivewearAPI(url: string): Promise<ImportedGarmentData | null> {
  // Extract style ID from URL (e.g., /p/bella/3001cvc -> 3001cvc)
  const styleMatch = url.match(/\/p\/([^\/]+)\/([^\/\?]+)/)
  if (!styleMatch) {
    console.error('Could not extract style ID from S&S URL:', url)
    return null
  }

  const brand = styleMatch[1]
  const styleId = styleMatch[2].toUpperCase()

  console.log('Fetching from S&S API:', { brand, styleId })

  try {
    // S&S API uses Basic Auth with Account Number as username and API Key as password
    const credentials = SSACTIVEWEAR_ACCOUNT_NUMBER 
      ? `${SSACTIVEWEAR_ACCOUNT_NUMBER}:${SSACTIVEWEAR_API_KEY}`
      : `${SSACTIVEWEAR_API_KEY}:`
    
    const authHeader = `Basic ${Buffer.from(credentials).toString('base64')}`
    
    console.log('S&S API Auth:', { 
      hasAccountNumber: !!SSACTIVEWEAR_ACCOUNT_NUMBER,
      apiKeyLength: SSACTIVEWEAR_API_KEY?.length 
    })
    
    // Try different S&S API endpoints
    // Option 1: Get all styles and filter (more reliable)
    const stylesResponse = await fetch(`${SSACTIVEWEAR_API_BASE}/styles`, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    })

    if (!stylesResponse.ok) {
      console.error('S&S API styles fetch failed:', stylesResponse.status, stylesResponse.statusText)
      return null
    }

    const allStyles = await stylesResponse.json()
    
    // Log sample of response
    console.log('S&S API response type:', Array.isArray(allStyles) ? 'array' : typeof allStyles)
    console.log('S&S API response length:', Array.isArray(allStyles) ? allStyles.length : 'N/A')
    if (Array.isArray(allStyles) && allStyles.length > 0) {
      console.log('S&S API sample item keys:', Object.keys(allStyles[0]))
      console.log('S&S API sample item:', JSON.stringify(allStyles[0], null, 2).substring(0, 500))
    }
    
    // Find the matching style - match by BOTH style and brand
    let styleData = null
    if (Array.isArray(allStyles)) {
      // First try: exact match on style name AND brand
      styleData = allStyles.find((s: any) => {
        const styleName = String(s.styleName || s.StyleName || '').toUpperCase()
        const brandName = String(s.brandName || '').toUpperCase()
        const brandFromUrl = brand.toUpperCase().replace(/[-_]/g, ' ')
        
        // Check if brand matches (handle variations like "comfort-colors" vs "COMFORT COLORS")
        const brandMatches = brandName.includes(brandFromUrl) || brandFromUrl.includes(brandName.split(' ')[0])
        
        return brandMatches && styleName === styleId
      })
      
      // Second try: match by style name if brand match fails (less strict)
      if (!styleData) {
        styleData = allStyles.find((s: any) => {
          const styleName = String(s.styleName || s.StyleName || '').toUpperCase()
          const uniqueStyleName = String(s.uniqueStyleName || '').toUpperCase()
          const brandName = String(s.brandName || '').toUpperCase()
          const brandFromUrl = brand.toUpperCase().replace(/[-_]/g, ' ')
          
          const brandMatches = brandName.includes(brandFromUrl) || brandFromUrl.includes(brandName.split(' ')[0])
          
          return brandMatches && (
            styleName === styleId || 
            uniqueStyleName === styleId ||
            styleName.includes(styleId)
          )
        })
      }
    }
    
    if (!styleData) {
      console.error('S&S API: Style not found:', { brand, styleId })
      console.log('Sample styles that matched the style ID:', 
        Array.isArray(allStyles) ? allStyles
          .filter((s: any) => String(s.styleName || '').toUpperCase().includes(styleId))
          .slice(0, 5)
          .map((s: any) => ({ brand: s.brandName, style: s.styleName })) 
        : 'Not an array')
      return null
    }
    
    console.log('S&S API found style:', {
      styleID: styleData.styleID,
      styleName: styleData.styleName,
      brandName: styleData.brandName
    })
    
    // Now fetch detailed product data including colors/sizes/images
    const productsResponse = await fetch(`${SSACTIVEWEAR_API_BASE}/products/?style=${styleData.styleID}`, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    })
    
    if (!productsResponse.ok) {
      console.error('S&S API products fetch failed:', productsResponse.status)
      // Continue with basic style data even if products fail
    } else {
      const products = await productsResponse.json()
      console.log('S&S API products response:', {
        isArray: Array.isArray(products),
        length: Array.isArray(products) ? products.length : 'N/A',
        sampleKeys: Array.isArray(products) && products[0] ? Object.keys(products[0]) : []
      })
      
      // Merge product data if available
      if (Array.isArray(products) && products.length > 0) {
        styleData.products = products
      }
    }

    // Transform S&S API data to our format
    const products = styleData.products || []
    
    // Extract unique colors and their images
    const colorMap = new Map<string, string>()
    const sizeSet = new Set<string>()
    let basePrice: number | null = null
    
    products.forEach((product: any) => {
      // Extract color name and image
      const colorName = product.colorName || product.color
      let colorImage = product.colorFrontImage || product.frontImage || product.image
      
      // Convert relative URLs to absolute S&S CDN URLs
      if (colorImage && !colorImage.startsWith('http')) {
        colorImage = `${SSACTIVEWEAR_CDN_BASE}/${colorImage}`
      }
      
      if (colorName && colorImage && !colorMap.has(colorName)) {
        colorMap.set(colorName, colorImage)
      }
      
      // Extract size
      const size = product.sizeName || product.size
      if (size) {
        sizeSet.add(size)
      }
      
      // Get wholesale price (use first available piece price)
      if (!basePrice && product.piecePrice) {
        basePrice = parseFloat(product.piecePrice)
      }
    })
    
    const availableColors = Array.from(colorMap.keys())
    const colorImages: Record<string, string> = Object.fromEntries(colorMap)
    const sizeRange = Array.from(sizeSet)
    
    // Clean HTML from description
    const cleanDescription = (styleData.description || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()

    // Convert style image to absolute URL if needed
    let thumbnailUrl = colorImages[availableColors[0]] || styleData.styleImage || null
    if (thumbnailUrl && !thumbnailUrl.startsWith('http')) {
      thumbnailUrl = `${SSACTIVEWEAR_CDN_BASE}/${thumbnailUrl}`
    }

    return {
      name: `${styleData.styleName || styleData.title} - ${styleId}`,
      brand: styleData.brandName || brand,
      description: cleanDescription || `${styleData.title || styleData.styleName} by ${styleData.brandName}`,
      available_colors: availableColors,
      size_range: sizeRange,
      thumbnail_url: thumbnailUrl,
      base_cost: basePrice,
      color_images: colorImages
    }
  } catch (error) {
    console.error('Error fetching from S&S API:', error)
    return null
  }
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
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    // Check if this is S&S Activewear and we have API access
    const isSSActivewear = url.toLowerCase().includes('ssactivewear.com')
    if (isSSActivewear && SSACTIVEWEAR_API_KEY) {
      if (!SSACTIVEWEAR_ACCOUNT_NUMBER) {
        console.warn('S&S Account Number not configured - API may fail')
      }
      console.log('Using S&S Activewear API for import')
      const apiData = await fetchFromSSActivewearAPI(url)
      
      if (apiData) {
        console.log('Successfully imported from S&S API:', {
          name: apiData.name,
          color_count: apiData.available_colors.length,
          color_images_count: Object.keys(apiData.color_images).length
        })
        return NextResponse.json(apiData)
      } else {
        console.log('S&S API import failed, falling back to web scraping')
        // Fall through to web scraping as fallback
      }
    } else if (isSSActivewear && !SSACTIVEWEAR_API_KEY) {
      return NextResponse.json(
        { 
          error: 'S&S Activewear API key not configured',
          details: 'Add SSACTIVEWEAR_API_KEY to your environment variables'
        },
        { status: 500 }
      )
    }

    // Fetch the HTML content
    console.log('Fetching HTML from:', url)
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      }
    })

    if (!response.ok) {
      console.error('Fetch failed:', {
        status: response.status,
        statusText: response.statusText,
        url: url,
        headers: Object.fromEntries(response.headers.entries())
      })
      return NextResponse.json(
        { 
          error: `Failed to fetch URL: ${response.status} ${response.statusText}`,
          details: `The supplier website may be blocking automated requests. Status: ${response.status}`
        },
        { status: 500 }
      )
    }

    const html = await response.text()

    // Extract JSON data from script tags (often contains product data)
    const jsonDataMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
    const productDataMatches = html.match(/(?:var|const|let)\s+(?:product|productData|variants|colors)\s*=\s*(\{[\s\S]*?\});/gi)
    
    let extractedJson = ''
    if (jsonDataMatches) {
      jsonDataMatches.forEach(match => {
        const jsonContent = match.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '')
        extractedJson += '\nJSON-LD Data: ' + jsonContent + '\n'
      })
    }
    if (productDataMatches) {
      productDataMatches.slice(0, 3).forEach(match => {
        extractedJson += '\nProduct JavaScript Data: ' + match + '\n'
      })
    }

    // Clean HTML - keep some script content that might have product data, remove styles
    const cleanedHtml = html
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/\s+/g, ' ')
      .substring(0, 150000) // Limit to first 150k chars to capture more color data

    console.log('HTML fetched, length:', cleanedHtml.length)
    console.log('Found JSON data blocks:', jsonDataMatches?.length || 0, 'Product data blocks:', productDataMatches?.length || 0)

    // Call Claude API to extract structured data
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001', // Using Haiku for speed and cost efficiency
      max_tokens: 4000, // Increased for comprehensive color extraction
      messages: [
        {
          role: 'user',
          content: `You are a data extraction assistant. Extract garment/apparel product information from the following HTML and JSON data and return it as a JSON object.

${extractedJson ? `STRUCTURED DATA (JSON-LD and Product Data - USE THIS FIRST):
${extractedJson}

` : ''}HTML Content:
${cleanedHtml}

Extract the following information:
- name: The product name (e.g., "CVC Jersey Tee - 3001CVC" or "Staple Tee")
- brand: The brand name (e.g., "BELLA + CANVAS" or "AS Colour")
- description: A detailed description including fabric, weight, fit, and key features (2-3 sentences)
- available_colors: An array of ALL available color names. Extract every single color option available on the page. Look for color swatches, color lists, color options, etc. Include every color variant. (e.g., ["White", "Black", "Navy", "Heather Grey", "Athletic Heather", "Solid Black Blend", etc.])
- size_range: An array of available sizes (e.g., ["XS", "S", "M", "L", "XL", "2XL", "3XL"])
- thumbnail_url: The URL of the main product image (full URL, preferably the default/first color shown)
- base_cost: The wholesale/base price if visible (number only, or null if not found). Look for wholesale pricing, price per unit, or bulk pricing.
- color_images: (REQUIRED) An object mapping color names to their image URLs. This is CRITICAL - you MUST try to find an image for EVERY color. Look in these places:
  * JSON-LD structured data (check for product variants with images) ⭐ PRIORITY
  * JavaScript product data objects (product, productData, variants, colors, options, etc.) ⭐ PRIORITY
  * Data attributes on elements (data-image, data-variant-image, data-src, etc.)
  * Image tags with color names in alt text or filenames
  * Any arrays of variants/options with image properties
  * Color swatch elements with background images or data attributes
  Format: {"White": "https://cdn.example.com/white.jpg", "Black": "https://cdn.example.com/black.jpg"}
  Return an image URL for AS MANY COLORS AS POSSIBLE. Ideally, every color should have an image.
  If absolutely no images can be found, return empty object {}, but TRY HARD to find them.

IMPORTANT: 
- For available_colors: Extract EVERY color name you can find. Look thoroughly through the HTML for color options, swatches, dropdowns, lists, etc.
- Be comprehensive - if you see 50+ colors listed, include all of them.
- For color names with multiple words, keep them readable (e.g., "Heather Deep Teal" not "heatherdeepteal")

Return ONLY a valid JSON object with these exact keys. Do not include any explanatory text, just the JSON.

Example output format (WITH color images - prioritize finding these):
{
  "name": "CVC Jersey Tee - 3001CVC",
  "brand": "BELLA + CANVAS",
  "description": "Premium 52% cotton, 48% polyester blend jersey tee. 4.2 oz fabric weight with a retail fit and tear-away label. Features side seams for a modern, comfortable fit.",
  "available_colors": ["White", "Black", "Navy", "Heather Grey", "Maroon", "Athletic Heather", "Solid Black Blend", "Heather Dust", "Heather Ice Blue"],
  "size_range": ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
  "thumbnail_url": "https://example.com/image.jpg",
  "base_cost": 8.50,
  "color_images": {
    "White": "https://cdn.example.com/products/3001cvc-white-front.jpg",
    "Black": "https://cdn.example.com/products/3001cvc-black-front.jpg",
    "Navy": "https://cdn.example.com/products/3001cvc-navy-front.jpg",
    "Heather Grey": "https://cdn.example.com/products/3001cvc-heather-grey-front.jpg",
    "Maroon": "https://cdn.example.com/products/3001cvc-maroon-front.jpg"
  }
}

CRITICAL REQUIREMENTS:
1. If structured JSON data is provided above, USE IT FIRST to extract color images
2. Look for arrays/objects with "variants", "options", "colors", "swatches" that contain image URLs
3. Match color names to their corresponding images
4. Try to find an image for EVERY single color in available_colors
5. Color names in color_images MUST exactly match names in available_colors
6. Use full, complete image URLs (starting with https://)
7. The more colors you can match to images, the better

DEBUGGING: If you find color/variant data structures in the JSON, extract as many color-to-image mappings as possible.`
        }
      ]
    })

    // Extract the JSON from Claude's response
    const content = message.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    let extractedData: ImportedGarmentData
    try {
      // Try to parse the response as JSON
      const jsonMatch = content.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }
      extractedData = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('Failed to parse Claude response:', content.text)
      return NextResponse.json(
        { error: 'Failed to extract product data. The page structure might not be supported.' },
        { status: 500 }
      )
    }

    // Validate the extracted data
    if (!extractedData.name || !extractedData.brand) {
      return NextResponse.json(
        { error: 'Failed to extract required product information (name and brand)' },
        { status: 500 }
      )
    }

    // Ensure color_images exists and is properly formatted
    if (!extractedData.color_images) {
      extractedData.color_images = {}
    }

    console.log('Successfully extracted data:', {
      name: extractedData.name,
      brand: extractedData.brand,
      color_count: extractedData.available_colors.length,
      color_images_count: Object.keys(extractedData.color_images).length,
      sample_colors: extractedData.available_colors.slice(0, 5),
      sample_images: Object.keys(extractedData.color_images).slice(0, 5)
    })

    // Log full color images for debugging
    if (Object.keys(extractedData.color_images).length > 0) {
      console.log('Color images extracted:', JSON.stringify(extractedData.color_images, null, 2))
    } else {
      console.warn('No color images were extracted - check the page structure or AI extraction')
    }

    return NextResponse.json(extractedData)

  } catch (error) {
    console.error('Error importing from URL:', error)
    
    // Provide more specific error messages
    let errorMessage = 'Failed to import product data'
    let errorDetails = ''
    
    if (error instanceof Error) {
      errorMessage = error.message
      
      // Check for common error types
      if (error.message.includes('fetch')) {
        errorDetails = 'Network error - the supplier website may be blocking requests or is unreachable'
      } else if (error.message.includes('timeout')) {
        errorDetails = 'Request timed out - try again or the site may be slow'
      } else if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
        errorDetails = 'Cannot connect to supplier website'
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails || 'Check console logs for more information'
      },
      { status: 500 }
    )
  }
}

