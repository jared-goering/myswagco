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
  category: string
  available_colors: string[]
  size_range: string[]
  thumbnail_url: string | null
  base_cost: number | null
  color_images?: { [color: string]: string }
}

/**
 * Smart Import Strategy:
 * 1. Try Anthropic's native browser tool (if available)
 * 2. Fall back to enhanced HTML scraping with Claude
 * 3. Works on Vercel and all deployment platforms
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

    console.log('🚀 Starting smart import for:', url)

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
      color_images_count: Object.keys(result.color_images || {}).length
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
  // AS Colour (BigCommerce) includes lines like: cat_thumb_Sand: https://cdn11.../5001_STAPLE_TEE_SAND_THUMB.jpg
  const colorImageMappings: Record<string, string> = {}
  
  if (isAsColour) {
    console.log('🎨 Extracting color image mappings from HTML...')
    
    // NEW APPROACH: Find URLs with color names embedded
    // Pattern: .../5001_STAPLE_TEE_FOG_BLUE_THUMB__XXXXX.jpg
    // Extract color from URL itself!
    
    // Match patterns like:
    // 5001_STAPLE_TEE_FOG_BLUE_THUMB.jpg
    // 5026_CLASSIC_TEE_GRAVEL_THUMB.jpg
    // But EXCLUDE view keywords like MAIN, FRONT, BACK, SIDE, TURN, DETAIL, LOOSE
    
    const urlPattern = /https:\/\/cdn11\.bigcommerce\.com\/[^"'\s]+\/([0-9]+_[A-Z_]+)_([A-Z_]+)(?:_THUMB)?__[^"'\s]+\.jpg/gi
    const excludedKeywords = ['MAIN', 'FRONT', 'BACK', 'SIDE', 'TURN', 'DETAIL', 'LOOSE', 'MODEL']
    
    let match
    
    while ((match = urlPattern.exec(html)) !== null) {
      const fullUrl = match[0]
      const productCode = match[1] // e.g. 5001_STAPLE_TEE
      const colorPart = match[2] // e.g. FOG_BLUE_THUMB or BACK
      
      // Clean up the color part
      let colorName = colorPart.replace('_THUMB', '')
      
      // Check if this is a view type, not a color
      if (excludedKeywords.includes(colorName)) {
        continue // Skip this match
      }
      
      // Handle cases like "GRAVEL_BACK" where color is GRAVEL
      for (const keyword of excludedKeywords) {
        if (colorName.endsWith(`_${keyword}`)) {
          colorName = colorName.replace(`_${keyword}`, '')
        }
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
      
      if (!colorImageMappings[formattedColor]) {
        colorImageMappings[formattedColor] = fullSizeUrl
      }
    }
    
    console.log(`✅ Found ${Object.keys(colorImageMappings).length} color images from URLs!`)
    
    if (Object.keys(colorImageMappings).length > 0) {
      // Show sample of what we found
      const sample = Object.entries(colorImageMappings).slice(0, 5)
      console.log('   Sample mappings:', sample)
      
      extractedJson += '\n=== Color Image Mappings (extracted from image URLs) ===\n'
      extractedJson += JSON.stringify(colorImageMappings, null, 2) + '\n'
    } else {
      console.log('⚠️  No color image URLs found in HTML')
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
9. **color_images**: Object mapping colors to UNIQUE image URLs
   - CRITICAL: Each color MUST have a DIFFERENT image URL
   - DO NOT map all colors to the same URL
   - Only include colors where you found an actual unique image
   - If you can only find images for 10 colors, only include those 10

${isAsColour ? `
🔥 AS COLOUR SPECIFIC INSTRUCTIONS:

This BigCommerce site has 70+ colors with UNIQUE images!

IMPORTANT: I've already extracted color image mappings from the HTML for you!
Look in the "Color Image Mappings (from cat_thumb lines)" section above.

This contains lines like:
{
  "Sand": "https://cdn11.bigcommerce.com/.../5001_STAPLE_TEE_SAND_THUMB.jpg",
  "White": "https://cdn11.bigcommerce.com/.../5001_STAPLE_TEE_WHITE_THUMB.jpg",
  ...
}

STEP 1 - Find all color names from <select> or <option> tags

STEP 2 - Use the pre-extracted color image mappings I provided above
Match the color names you found to the URLs in the color mappings

STEP 3 - Build your color_images object using these mappings
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
    color_images_found: Object.keys(extractedData.color_images || {}).length,
    sample_colors: extractedData.available_colors?.slice(0, 10)
  })

  // Check if all images are the same (common issue)
  if (extractedData.color_images) {
    const imageUrls = Object.values(extractedData.color_images)
    const uniqueImageUrls = new Set(imageUrls)
    
    if (uniqueImageUrls.size === 1 && imageUrls.length > 1) {
      console.warn(`⚠️  WARNING: All ${imageUrls.length} colors are mapped to the SAME image URL!`)
      console.warn(`   Image URL: ${imageUrls[0]}`)
      console.warn(`   This means unique color images were not found in the page data.`)
    } else {
      console.log(`✅ Found ${uniqueImageUrls.size} unique image URLs for ${imageUrls.length} colors`)
      // Show a sample
      const sampleMappings = Object.entries(extractedData.color_images).slice(0, 5)
      console.log('   Sample mappings:', sampleMappings)
    }
  }

  // Warn if we got too few colors (AS Colour should have 50+)
  if (isAsColour && extractedData.available_colors.length < 40) {
    console.warn(`⚠️  Only found ${extractedData.available_colors.length} colors for AS Colour product. Expected 50-80. The page might have changed structure.`)
  }

  return extractedData
}

