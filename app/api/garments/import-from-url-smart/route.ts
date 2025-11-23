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
  category: string
  available_colors: string[]
  size_range: string[]
  thumbnail_url: string | null
  base_cost: number | null
  color_images?: { [color: string]: string }
  color_back_images?: { [color: string]: string } // NEW: Back view images
}

/**
 * Fetch product data from S&S Activewear official API
 * This is MUCH faster and more reliable than web scraping!
 */
async function fetchFromSSActivewearAPI(url: string): Promise<ImportedGarmentData | null> {
  // Extract style ID from URL (e.g., /p/bella/3001cvc -> 3001cvc)
  const styleMatch = url.match(/\/p\/([^\/]+)\/([^\/\?]+)/)
  if (!styleMatch) {
    console.error('Could not extract style ID from S&S URL:', url)
    return null
  }

  const brand = styleMatch[1]
  const styleId = styleMatch[2].toUpperCase()

  console.log('🔑 Fetching from S&S API:', { brand, styleId })

  try {
    // S&S API uses Basic Auth with Account Number as username and API Key as password
    const credentials = SSACTIVEWEAR_ACCOUNT_NUMBER 
      ? `${SSACTIVEWEAR_ACCOUNT_NUMBER}:${SSACTIVEWEAR_API_KEY}`
      : `${SSACTIVEWEAR_API_KEY}:`
    
    const authHeader = `Basic ${Buffer.from(credentials).toString('base64')}`
    
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
      return null
    }
    
    console.log('✅ S&S API found style:', {
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
      console.log('📦 S&S API products response:', {
        isArray: Array.isArray(products),
        length: Array.isArray(products) ? products.length : 'N/A'
      })
      
      // Log sample product to see what image fields are available
      if (Array.isArray(products) && products.length > 0) {
        console.log('🔍 Sample product fields:', Object.keys(products[0]))
        console.log('🖼️  Image fields in first product:', {
          colorFrontImage: products[0].colorFrontImage || null,
          colorBackImage: products[0].colorBackImage || null,
          colorSideImage: products[0].colorSideImage || null,
          frontImage: products[0].frontImage || null,
          backImage: products[0].backImage || null,
          sideImage: products[0].sideImage || null,
          image: products[0].image || null,
          imageUrl: products[0].imageUrl || null,
          colorName: products[0].colorName
        })
        styleData.products = products
      }
    }

    // Transform S&S API data to our format
    const products = styleData.products || []
    
    // Extract unique colors and their images (front + back)
    const colorFrontMap = new Map<string, string>()
    const colorBackMap = new Map<string, string>()
    const sizeSet = new Set<string>()
    let basePrice: number | null = null
    
    products.forEach((product: any) => {
      // Extract color name
      const colorName = product.colorName || product.color
      
      // Extract FRONT image
      let colorFrontImage = product.colorFrontImage || product.frontImage || product.image
      if (colorFrontImage && !colorFrontImage.startsWith('http')) {
        colorFrontImage = `${SSACTIVEWEAR_CDN_BASE}/${colorFrontImage}`
      }
      if (colorName && colorFrontImage && !colorFrontMap.has(colorName)) {
        colorFrontMap.set(colorName, colorFrontImage)
      }
      
      // Extract BACK image
      let colorBackImage = product.colorBackImage || product.backImage
      if (colorBackImage && !colorBackImage.startsWith('http')) {
        colorBackImage = `${SSACTIVEWEAR_CDN_BASE}/${colorBackImage}`
      }
      if (colorName && colorBackImage && !colorBackMap.has(colorName)) {
        colorBackMap.set(colorName, colorBackImage)
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
    
    const availableColors = Array.from(colorFrontMap.keys())
    const colorImages: Record<string, string> = Object.fromEntries(colorFrontMap)
    const colorBackImages: Record<string, string> = Object.fromEntries(colorBackMap)
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

    console.log('✅ S&S API import successful:', {
      colors: availableColors.length,
      color_front_images: Object.keys(colorImages).length,
      color_back_images: Object.keys(colorBackImages).length,
      sizes: sizeRange.length
    })

    return {
      name: `${styleData.styleName || styleData.title} - ${styleId}`,
      brand: styleData.brandName || brand,
      description: cleanDescription || `${styleData.title || styleData.styleName} by ${styleData.brandName}`,
      category: 'T-Shirt', // S&S API might have category data - check styleData.category
      available_colors: availableColors,
      size_range: sizeRange,
      thumbnail_url: thumbnailUrl,
      base_cost: basePrice,
      color_images: colorImages,
      color_back_images: colorBackImages
    }
  } catch (error) {
    console.error('❌ Error fetching from S&S API:', error)
    return null
  }
}

/**
 * Smart Import Strategy:
 * 1. Check if S&S Activewear + API key available → use official API
 * 2. Try Anthropic's native browser tool (if available)
 * 3. Fall back to enhanced HTML scraping with Claude
 * 4. Works on Vercel and all deployment platforms
 */
export async function POST(request: NextRequest) {
  try {
    const { url, strategy } = await request.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    // Validate URL
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

    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    const isAsColour = url.toLowerCase().includes('ascolour.com')
    const isSSActivewear = url.toLowerCase().includes('ssactivewear.com')

    console.log('🚀 Starting smart import for:', url)

    // Strategy 0: If S&S Activewear and we have API key, use official API (fastest & most reliable!)
    if (isSSActivewear && SSACTIVEWEAR_API_KEY) {
      console.log('🔑 Using S&S Activewear Official API')
      try {
        const apiData = await fetchFromSSActivewearAPI(url)
        if (apiData) {
          console.log('✅ S&S API succeeded! Found', apiData.available_colors.length, 'colors')
          return NextResponse.json(apiData)
        } else {
          console.log('⚠️  S&S API failed, falling back to web scraping')
        }
      } catch (error) {
        console.log('⚠️  S&S API error, falling back to web scraping:', error)
      }
    } else if (isSSActivewear && !SSACTIVEWEAR_API_KEY) {
      console.warn('⚠️  S&S Activewear URL detected but SSACTIVEWEAR_API_KEY not configured')
      console.warn('   Add SSACTIVEWEAR_API_KEY to .env.local for faster, more reliable imports')
      // Continue to web scraping fallback
    }

    // Strategy 1: Try Anthropic's web fetch tool (available now!)
    if (strategy === 'browser' || strategy === 'auto') {
      try {
        console.log('🌐 Attempting web fetch via Anthropic...')
        const webFetchResult = await tryWebFetch(url, isAsColour)
        if (webFetchResult) {
          console.log('✅ Web fetch succeeded!')
          return NextResponse.json(webFetchResult)
        }
      } catch (error) {
        console.log('⚠️  Web fetch failed, falling back to smart scraping')
      }
    }

    // Strategy 2: Enhanced HTML scraping with Claude's intelligence
    console.log('🧠 Using smart HTML scraping with Claude...')
    const result = await smartHtmlScraping(url, isAsColour)
    
    console.log('✅ Successfully extracted data:', {
      color_count: result.available_colors.length,
      color_front_images_count: Object.keys(result.color_images || {}).length,
      color_back_images_count: Object.keys(result.color_back_images || {}).length
    })

    return NextResponse.json(result)

  } catch (error) {
    console.error('❌ Error in smart import:', error)
    
    // Handle rate limiting gracefully
    if (error instanceof Error && error.message.includes('rate_limit_error')) {
      return NextResponse.json(
        { 
          error: 'Rate limit reached. Please wait 2 minutes and try again. This happens when making many requests in a short time.',
          retry_after: 120
        },
        { status: 429 }
      )
    }
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to import product data' 
      },
      { status: 500 }
    )
  }
}

/**
 * Strategy 1: Use Anthropic's web fetch tool
 * Fetches full page content on Anthropic's infrastructure
 * Works everywhere, including Vercel!
 */
async function tryWebFetch(url: string, isAsColour: boolean): Promise<ImportedGarmentData | null> {
  try {
    console.log('🌐 Using Anthropic web_fetch tool...')
    
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001', // Haiku: 20x cheaper, 3x faster!
      max_tokens: 16000, // Plenty for Haiku to output all colors
      temperature: 0, // Deterministic extraction
      tools: [
        {
          type: "web_fetch_20250910",
          name: "web_fetch",
          max_uses: 1,
          max_content_tokens: 200000 
        } as any
      ],
      messages: [
        {
          role: 'user',
          content: `Fetch and analyze the product page at ${url}

This is a garment/apparel supplier product page. I need you to extract COMPLETE information about ALL available colors.

🎯 YOUR MAIN TASK: Find ALL 50-80+ color options on this page!

Extract:

1. **Product name** - Full name (e.g., "Staple Tee - 5001")
2. **Brand** - Brand name (e.g., "AS Colour")  
3. **Description** - Detailed description (2-3 sentences)
4. **ALL available colors** - THIS IS CRITICAL! There are 50-80+ colors. Get them ALL!
5. **Size range** - All available sizes
6. **Base/wholesale price** - If visible

${isAsColour ? `
🔥 CRITICAL FOR AS COLOUR - READ CAREFULLY:

This site has 70+ colors in JavaScript/JSON data. You MUST extract ALL of them!

STEP 1: Look for these patterns in the HTML/JavaScript:
- "product_attributes" or "attributes" arrays
- "options" arrays with color data
- Data embedded in <script> tags containing product info
- Look for patterns like: {"id": 123, "label": "White", "imageUrl": "..."}
- BigCommerce product option structures

STEP 2: For EACH color found, extract:
- The color name (label/name field)
- The product image URL for that color (imageUrl/image field)

STEP 3: Build complete color_images object mapping ALL colors to their images

Example data pattern to look for:
{
  "option_values": [
    {"id": 1, "label": "White", "data": {"image_url": "https://...white.jpg"}},
    {"id": 2, "label": "Black", "data": {"image_url": "https://...black.jpg"}},
    // ... 70+ more colors ...
  ]
}

Don't stop at the first 10-20! There are 70+ colors total. Extract them ALL!
` : ''}

**CRITICAL REQUIREMENTS**:
- Extract EVERY single color (aim for 50-80+ colors)
- Map EVERY color to its product image URL
- Be thorough - check all data structures in the page
- Don't truncate the color list - include everything

Return ONLY valid JSON (no explanatory text before or after):
{
  "name": "Product Name",
  "brand": "Brand Name",
  "description": "Detailed description...",
  "available_colors": ["Color1", "Color2", "Color3", ...<CONTINUE FOR ALL 50-80+ COLORS>...],
  "size_range": ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
  "thumbnail_url": "https://full-url.jpg",
  "base_cost": 14.50,
  "color_images": {
    "Color1": "https://cdn.../color1.jpg",
    "Color2": "https://cdn.../color2.jpg",
    "Color3": "https://cdn.../color3.jpg"
    ...<CONTINUE FOR ALL 50-80+ COLORS>...
  }
}`
        }
      ]
    }, {
      headers: {
        'anthropic-beta': 'web-fetch-2025-09-10'
      }
    })

    console.log('📥 Received response from Claude')
    console.log('   Content blocks:', message.content.length)
    console.log('   Stop reason:', message.stop_reason)
    
    // Log what we received
    for (let i = 0; i < message.content.length; i++) {
      const block = message.content[i]
      console.log(`   Block ${i}: ${block.type}`)
      if (block.type === 'text') {
        console.log(`      Text length: ${block.text.length}`)
        console.log(`      First 200 chars: ${block.text.substring(0, 200)}`)
      } else if (block.type === 'server_tool_use') {
        console.log(`      Tool: ${block.name}`)
      } else if ((block as any).type === 'web_fetch_tool_result') {
        console.log(`      Fetch result received`)
      }
    }
    
    // Find the text response with extracted data
    let extractedJson: string | null = null
    
    for (const block of message.content) {
      if (block.type === 'text') {
        // Look for JSON in the text
        const jsonMatch = block.text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          extractedJson = jsonMatch[0]
          console.log('   Found JSON in response, length:', jsonMatch[0].length)
          break
        }
      }
    }

    if (!extractedJson) {
      console.log('⚠️  No JSON found in Claude response')
      return null
    }

    const data: ImportedGarmentData = JSON.parse(extractedJson)
    
    // Validate
    if (!data.name || !data.brand) {
      console.log('⚠️  Missing required fields in extracted data')
      return null
    }

    console.log('✅ Web fetch succeeded:', {
      colors: data.available_colors.length,
      color_images: Object.keys(data.color_images || {}).length
    })

    return data

  } catch (error) {
    console.log('⚠️  Web fetch failed:', error instanceof Error ? error.message : 'Unknown error')
    return null
  }
}

/**
 * Strategy 2: Smart HTML scraping
 * Works on Vercel and all platforms
 * Uses Claude's intelligence to extract from HTML
 */
async function smartHtmlScraping(url: string, isAsColour: boolean): Promise<ImportedGarmentData> {
  // Fetch the HTML
  console.log('📥 Fetching HTML from:', url)
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.statusText}`)
  }

  const html = await response.text()

  // Extract structured data from script tags
  const jsonDataMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  const productDataMatches = html.match(/(?:var|const|let)\s+(?:product|productData|variants|colors|colorData)\s*=\s*(\{[\s\S]*?\});/gi)
  
  let extractedJson = ''
  if (jsonDataMatches) {
    jsonDataMatches.forEach(match => {
      const jsonContent = match.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '')
      extractedJson += '\n=== JSON-LD Data ===\n' + jsonContent + '\n'
    })
  }
  if (productDataMatches) {
    productDataMatches.slice(0, 5).forEach(match => {
      extractedJson += '\n=== Product JavaScript ===\n' + match + '\n'
    })
  }

  // 🎯 NEW: Extract color thumbnail mappings directly from HTML!
  // AS Colour (BigCommerce) includes both FRONT and BACK images
  // We'll extract them into separate mappings
  const colorFrontImageMappings: Record<string, string> = {}
  const colorBackImageMappings: Record<string, string> = {}
  
  if (isAsColour) {
    console.log('🎨 Extracting color image mappings from HTML (FRONT + BACK)...')
    
    // NEW APPROACH: Find URLs with color names embedded
    // Pattern: .../5001_STAPLE_TEE_FOG_BLUE_THUMB__XXXXX.jpg
    // Extract color from URL itself!
    
    // Match patterns like:
    // 5001_STAPLE_TEE_FOG_BLUE_THUMB.jpg (FRONT)
    // 5001_STAPLE_TEE_FOG_BLUE_BACK__XXXXX.jpg (BACK)
    // 5026_CLASSIC_TEE_GRAVEL_THUMB.jpg (FRONT)
    // 5026_CLASSIC_TEE_GRAVEL_BACK__XXXXX.jpg (BACK)
    
    // Updated pattern to match both _THUMB__ and _BACK__ suffixes
    const urlPattern = /https:\/\/cdn11\.bigcommerce\.com\/[^"'\s]+\/([0-9]+_[A-Z_]+)_([A-Z_]+)(?:_(?:THUMB|BACK|FRONT))?__[^"'\s]+\.jpg/gi
    // Keywords that indicate view type, not color (but we now want to CAPTURE BACK!)
    const excludedViewKeywords = ['MAIN', 'SIDE', 'TURN', 'DETAIL', 'LOOSE', 'MODEL']
    
    let match
    
    while ((match = urlPattern.exec(html)) !== null) {
      const fullUrl = match[0]
      const productCode = match[1] // e.g. 5001_STAPLE_TEE or 5001_STAPLE_TEE_FOG_BLUE
      const colorPart = match[2] // e.g. FOG_BLUE_THUMB, FOG_BLUE_BACK, BACK, or just a color
      
      // Clean up the color part
      let colorName = colorPart.replace('_THUMB', '')
      
      // Detect if this is a BACK view (URLs contain _BACK__ or _BACK_)
      const isBackView = fullUrl.includes('_BACK__') || fullUrl.includes('_BACK_') || colorName.includes('_BACK')
      // Detect if this is a FRONT view (has _THUMB or _FRONT, or is default with no view keyword)
      const isFrontView = fullUrl.includes('_FRONT__') || fullUrl.includes('_THUMB__') || (!isBackView && !excludedViewKeywords.some(k => colorName === k || colorName.endsWith(`_${k}`)))
      
      // Special case: If colorPart is just a view keyword (BACK, FRONT), 
      // extract color from the productCode instead
      if (colorName === 'BACK' || colorName === 'FRONT' || excludedViewKeywords.includes(colorName)) {
        // For URLs like 5001_STAPLE_TEE_FOG_BLUE_BACK__, 
        // the color is in the productCode: 5001_STAPLE_TEE_FOG_BLUE
        // Extract everything after the product style number
        const parts = productCode.split('_')
        // Skip first part (product number like 5001) and product name parts
        // Assume format: NUMBER_PRODUCT_NAME_COLOR
        // For 5001_STAPLE_TEE_FOG_BLUE, we want FOG_BLUE
        if (parts.length > 2) {
          // Take everything after the first 2 parts (number and product name)
          colorName = parts.slice(2).join('_')
        } else {
          // Can't extract color, skip this URL
          continue
        }
      }
      
      // Extract the color name by removing view keywords
      if (colorName.endsWith('_BACK')) {
        colorName = colorName.replace('_BACK', '')
      }
      if (colorName.endsWith('_FRONT')) {
        colorName = colorName.replace('_FRONT', '')
      }
      for (const keyword of excludedViewKeywords) {
        if (colorName.endsWith(`_${keyword}`)) {
          colorName = colorName.replace(`_${keyword}`, '')
        }
      }
      
      // Skip if no color name remains
      if (!colorName || colorName.length === 0) {
        continue
      }
      
      // Format color name nicely (FOG_BLUE → Fog Blue)
      const formattedColor = colorName
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
      
      // Convert THUMB URL to full size
      const fullSizeUrl = fullUrl
        .replace('_THUMB', '')
        .replace(/\.(\d+)\.(\d+)\.jpg/, '.1280.1280.jpg') // Use larger size
      
      // Route to appropriate mapping based on view type
      if (isBackView && !colorBackImageMappings[formattedColor]) {
        colorBackImageMappings[formattedColor] = fullSizeUrl
      } else if (isFrontView && !colorFrontImageMappings[formattedColor]) {
        colorFrontImageMappings[formattedColor] = fullSizeUrl
      }
    }
    
    console.log(`✅ Found ${Object.keys(colorFrontImageMappings).length} FRONT images and ${Object.keys(colorBackImageMappings).length} BACK images from URLs!`)
    
    if (Object.keys(colorFrontImageMappings).length > 0) {
      // Show sample of what we found
      const frontSample = Object.entries(colorFrontImageMappings).slice(0, 5)
      console.log('   Sample FRONT mappings:', frontSample)
      
      extractedJson += '\n=== Color FRONT Image Mappings (extracted from image URLs) ===\n'
      extractedJson += JSON.stringify(colorFrontImageMappings, null, 2) + '\n'
    } else {
      console.log('⚠️  No FRONT color image URLs found in HTML')
    }
    
    if (Object.keys(colorBackImageMappings).length > 0) {
      // Show sample of what we found
      const backSample = Object.entries(colorBackImageMappings).slice(0, 5)
      console.log('   Sample BACK mappings:', backSample)
      
      extractedJson += '\n=== Color BACK Image Mappings (extracted from image URLs) ===\n'
      extractedJson += JSON.stringify(colorBackImageMappings, null, 2) + '\n'
    } else {
      console.log('⚠️  No BACK color image URLs found in HTML')
    }
  }

  // 🚀 FAST PATH: If we have complete data from URL extraction, skip Claude entirely!
  // This saves ~200k tokens per request and avoids rate limits
  const hasFrontImages = Object.keys(colorFrontImageMappings).length >= 60
  const hasBackImages = Object.keys(colorBackImageMappings).length >= 60
  const hasCompleteData = hasFrontImages && hasBackImages
  
  if (isAsColour && hasCompleteData) {
    console.log('🚀 FAST PATH: Complete data found in URL extraction, skipping Claude!')
    console.log(`   Found ${Object.keys(colorFrontImageMappings).length} front + ${Object.keys(colorBackImageMappings).length} back images`)
    
    // Extract basic metadata directly from HTML
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const productName = titleMatch ? titleMatch[1].split('|')[0].trim() : 'AS Colour Product'
    
    // Extract sizes from select dropdown
    const sizeMatches = Array.from(html.matchAll(/<option[^>]*data-product-attribute-value[^>]*>([^<]+)<\/option>/gi))
    const sizes = sizeMatches
      .map(m => m[1].trim())
      .filter(s => /^(XXS|XS|S|M|L|XL|2XL|3XL|4XL|5XL)$/i.test(s))
    const uniqueSizes = [...new Set(sizes)]
    
    // Extract price
    const priceMatch = html.match(/price[^>]*>\$?([0-9]+\.?[0-9]*)/i)
    const basePrice = priceMatch ? parseFloat(priceMatch[1]) : null
    
    // Get all color names from our mappings
    const availableColors = [...new Set([
      ...Object.keys(colorFrontImageMappings),
      ...Object.keys(colorBackImageMappings)
    ])].sort()
    
    // Use first front image as thumbnail
    const thumbnailUrl = Object.values(colorFrontImageMappings)[0] || null
    
    return {
      name: productName,
      brand: 'AS Colour',
      description: `${productName} - Premium quality garment from AS Colour, available in ${availableColors.length} colors.`,
      category: 'T-Shirt', // Could be extracted more intelligently
      available_colors: availableColors,
      size_range: uniqueSizes.length > 0 ? uniqueSizes : ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
      thumbnail_url: thumbnailUrl,
      base_cost: basePrice,
      color_images: colorFrontImageMappings,
      color_back_images: colorBackImageMappings
    }
  }

  // Clean HTML
  const cleanedHtml = html
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\s+/g, ' ')
    .substring(0, 200000) // 200k chars

  console.log('🤖 Calling Claude for intelligent extraction...')
  console.log('   HTML length:', cleanedHtml.length)
  console.log('   Structured data blocks:', (jsonDataMatches?.length || 0) + (productDataMatches?.length || 0))

  // Use Claude Haiku to intelligently extract the data (faster & cheaper)
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001', // Haiku: 20x cheaper, 3x faster!
    max_tokens: 16000, // Increased to ensure we can output all 70+ colors
    temperature: 0,
    messages: [
      {
        role: 'user',
        content: `Extract COMPLETE product information from this e-commerce page. This is CRITICAL: you MUST extract ALL color options - there are typically 50-80 colors on this page!

${extractedJson ? `
STRUCTURED DATA (Prioritize this - it's the most reliable):
${extractedJson}

` : ''}

HTML CONTENT:
${cleanedHtml}

🎯 MAIN TASK: Extract ALL 50-80 COLOR OPTIONS!

Search for patterns like:
- <option> tags with color names
- Data attributes: data-product-attribute-value
- BigCommerce product options
- Arrays in JavaScript: options[], variants[], colors[]
- Any lists or collections of color names

Extract and return a JSON object with:

1. name: Product name (e.g., "Staple Tee - 5001")
2. brand: Brand name (e.g., "AS Colour")
3. description: Detailed description (2-3 sentences)
4. **category**: The garment category (e.g., T-Shirt, Hoodie, Sweatshirt, Tank Top, Headwear, Bottoms, etc.)
5. **available_colors**: Array with EVERY SINGLE color name (aim for 50-80 colors!)
6. size_range: Array of sizes
7. thumbnail_url: Main product image URL
8. base_cost: Price as number (or null if not found)
9. **color_images**: Object mapping colors to FRONT view image URLs
   - CRITICAL: Each color MUST have a DIFFERENT image URL
   - DO NOT map all colors to the same URL
   - Only include colors where you found an actual unique image
   - If you can only find images for 10 colors, only include those 10
10. **color_back_images**: Object mapping colors to BACK view image URLs
   - Look for URLs containing "_BACK_" or similar patterns
   - Match the same colors as in color_images when possible
   - Only include if back images are available

${isAsColour ? `
🔥 AS COLOUR SPECIFIC INSTRUCTIONS:

This BigCommerce site has 70+ colors with UNIQUE FRONT and BACK images!

IMPORTANT: I've already extracted BOTH front and back image mappings from the HTML for you!
Look for these sections in the structured data above:
- "Color FRONT Image Mappings (extracted from image URLs)"
- "Color BACK Image Mappings (extracted from image URLs)"

They contain mappings like:
FRONT Images:
{
  "Sand": "https://cdn11.bigcommerce.com/.../5001_STAPLE_TEE_SAND.jpg",
  "White": "https://cdn11.bigcommerce.com/.../5001_STAPLE_TEE_WHITE.jpg",
  ...
}

BACK Images:
{
  "Sand": "https://cdn11.bigcommerce.com/.../5001_STAPLE_TEE_SAND_BACK.jpg",
  "White": "https://cdn11.bigcommerce.com/.../5001_STAPLE_TEE_WHITE_BACK.jpg",
  ...
}

STEP 1 - Find all color names from <select> or <option> tags

STEP 2 - Use the pre-extracted FRONT image mappings for color_images
Match the color names you found to the URLs in the FRONT mappings

STEP 3 - Use the pre-extracted BACK image mappings for color_back_images
Match the same color names to the URLs in the BACK mappings

STEP 4 - Build BOTH color_images and color_back_images objects
DO NOT use the same URL for all colors - use the unique URLs I extracted!
` : ''}

⚠️ CRITICAL REQUIREMENTS:
1. Extract EVERY SINGLE color option (target: 50-80 colors)
2. Do NOT stop at 10-20 colors - keep extracting until you have them all
3. Include ALL colors in both available_colors AND color_images
4. The available_colors array should be LONG (50-80 items)
5. Return ONLY valid JSON, no explanatory text before or after

Example output format (but with 50-80 colors, not just 3!):
{
  "name": "Staple Tee - 5001",
  "brand": "AS Colour",
  "description": "Regular fit tee...",
  "category": "T-Shirt",
  "available_colors": [
    "White", "Black", "Navy", "Grey Marle", "Powder",
    "Fog Blue", "Cream", "Natural", "Butter", "Ecru",
    ...<CONTINUE LISTING ALL 50-80 COLORS>...
  ],
  "size_range": ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
  "thumbnail_url": "https://cdn.example.com/image.jpg",
  "base_cost": 5.20,
  "color_images": {
    "White": "https://cdn.example.com/white.jpg",
    "Black": "https://cdn.example.com/black.jpg",
    ...<CONTINUE MAPPING ALL 50-80 COLORS>...
  },
  "color_back_images": {
    "White": "https://cdn.example.com/white_back.jpg",
    "Black": "https://cdn.example.com/black_back.jpg",
    ...<CONTINUE MAPPING ALL 50-80 COLORS>...
  }
}`
      }
    ]
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude')
  }

  const jsonMatch = content.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('No JSON found in response')
  }

  const extractedData: ImportedGarmentData = JSON.parse(jsonMatch[0])

  // Validate
  if (!extractedData.name || !extractedData.brand) {
    throw new Error('Failed to extract required product information')
  }

  // Log what we got
  console.log('📊 Extraction results:', {
    name: extractedData.name,
    colors_found: extractedData.available_colors?.length || 0,
    color_front_images_found: Object.keys(extractedData.color_images || {}).length,
    color_back_images_found: Object.keys(extractedData.color_back_images || {}).length,
    sample_colors: extractedData.available_colors?.slice(0, 10)
  })

  // Check if all FRONT images are the same (common issue)
  if (extractedData.color_images) {
    const imageUrls = Object.values(extractedData.color_images)
    const uniqueImageUrls = new Set(imageUrls)
    
    if (uniqueImageUrls.size === 1 && imageUrls.length > 1) {
      console.warn(`⚠️  WARNING: All ${imageUrls.length} colors are mapped to the SAME FRONT image URL!`)
      console.warn(`   Image URL: ${imageUrls[0]}`)
      console.warn(`   This means unique color images were not found in the page data.`)
    } else {
      console.log(`✅ Found ${uniqueImageUrls.size} unique FRONT image URLs for ${imageUrls.length} colors`)
      // Show a sample
      const sampleMappings = Object.entries(extractedData.color_images).slice(0, 3)
      console.log('   Sample FRONT mappings:', sampleMappings)
    }
  }

  // Check BACK images
  if (extractedData.color_back_images) {
    const backImageUrls = Object.values(extractedData.color_back_images)
    const uniqueBackImageUrls = new Set(backImageUrls)
    
    if (uniqueBackImageUrls.size === 1 && backImageUrls.length > 1) {
      console.warn(`⚠️  WARNING: All ${backImageUrls.length} colors are mapped to the SAME BACK image URL!`)
      console.warn(`   Image URL: ${backImageUrls[0]}`)
    } else {
      console.log(`✅ Found ${uniqueBackImageUrls.size} unique BACK image URLs for ${backImageUrls.length} colors`)
      // Show a sample
      const sampleBackMappings = Object.entries(extractedData.color_back_images).slice(0, 3)
      console.log('   Sample BACK mappings:', sampleBackMappings)
    }
  } else if (isAsColour) {
    console.warn(`⚠️  No BACK images found for AS Colour product (expected to find back images)`)
  }

  // Warn if we got too few colors (AS Colour should have 50+)
  if (isAsColour && extractedData.available_colors.length < 40) {
    console.warn(`⚠️  Only found ${extractedData.available_colors.length} colors for AS Colour product. Expected 50-80. The page might have changed structure.`)
  }

  return extractedData
}

