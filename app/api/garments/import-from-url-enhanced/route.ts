import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import puppeteer from 'puppeteer'
import { execSync } from 'child_process'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SUPPORTED_SUPPLIERS = ['ssactivewear.com', 'ascolour.com']

/**
 * Find Chrome executable on macOS for better ARM64 compatibility
 */
function findChromeExecutable(): string | undefined {
  const possiblePaths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    process.env.PUPPETEER_EXECUTABLE_PATH,
  ]
  
  for (const path of possiblePaths) {
    if (path) {
      try {
        execSync(`test -f "${path}"`)
        console.log('Found Chrome at:', path)
        return path
      } catch {
        // Path doesn't exist, continue
      }
    }
  }
  
  return undefined
}

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

interface ColorSwatchData {
  colorName: string
  imageUrl: string
}

/**
 * Scrape AS Colour product page by clicking through color swatches
 */
async function scrapeAsColourWithBrowser(url: string): Promise<ColorSwatchData[]> {
  let browser = null
  try {
    console.log('Launching headless browser for AS Colour...')
    
    const chromeExecutable = findChromeExecutable()
    const launchOptions: any = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
      timeout: 60000 // Increase timeout to 60 seconds for slower systems
    }
    
    // Use system Chrome if available (better for Mac Silicon)
    if (chromeExecutable) {
      launchOptions.executablePath = chromeExecutable
      console.log('Using system Chrome for better ARM64 compatibility')
    }
    
    browser = await puppeteer.launch(launchOptions)

    const page = await browser.newPage()
    
    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 })
    
    // Set user agent to avoid bot detection
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    
    // Navigate to the page
    console.log('Navigating to:', url)
    await page.goto(url, { 
      waitUntil: 'networkidle2', // Changed from networkidle0 for faster loading
      timeout: 45000 
    })

    // Wait for the page to load and color swatches to appear
    console.log('Waiting for page elements to load...')
    await page.waitForSelector('img', { timeout: 10000 })
    
    // Wait an extra moment for JavaScript to initialize
    await page.waitForTimeout(2000)

    // Extract color swatches and their data
    const colorData = await page.evaluate(() => {
      const results: Array<{ colorName: string; imageUrl: string }> = []
      
      // AS Colour uses specific selectors - try multiple patterns
      const selectors = [
        'label[for^="swatch-"]',           // Label elements with swatch IDs
        'input[name="colour"]',             // Radio inputs for colors
        '[data-product-option-value]',      // Product option values
        '.form-option-swatch',              // Swatch form options
        'button[aria-label*="colour" i]',   // Button with colour in aria-label
        'button[aria-label*="color" i]',    // Button with color in aria-label
      ]
      
      let swatches: Element[] = []
      for (const selector of selectors) {
        const found = Array.from(document.querySelectorAll(selector))
        if (found.length > 0) {
          swatches = found
          console.log(`Found ${found.length} swatches using selector: ${selector}`)
          break
        }
      }
      
      console.log('Total swatches found:', swatches.length)
      
      // Try to get all color names
      const colorNames: string[] = []
      swatches.forEach((swatch) => {
        const ariaLabel = swatch.getAttribute('aria-label')
        const dataValue = swatch.getAttribute('data-product-option-value')
        const title = swatch.getAttribute('title')
        const value = swatch.getAttribute('value')
        const forAttr = swatch.getAttribute('for')
        
        // Try to extract color name from various attributes
        let colorName = ariaLabel || dataValue || title || value || ''
        
        // If it's a label with a 'for' attribute, try to get the color from associated input
        if (!colorName && forAttr) {
          const input = document.getElementById(forAttr) as HTMLInputElement
          if (input) {
            colorName = input.value || input.getAttribute('data-product-attribute-value') || ''
          }
        }
        
        // Also check text content
        if (!colorName) {
          colorName = swatch.textContent?.trim() || ''
        }
        
        // Clean up the color name
        colorName = colorName
          .replace(/select colour:?\s*/gi, '')
          .replace(/select color:?\s*/gi, '')
          .replace(/colour:?\s*/gi, '')
          .replace(/color:?\s*/gi, '')
          .trim()
        
        if (colorName && colorName.length > 0 && colorName.length < 50) {
          colorNames.push(colorName)
        }
      })
      
      console.log('Color names extracted:', colorNames.slice(0, 10), `... (${colorNames.length} total)`)
      
      return colorNames.map(name => ({ colorName: name, imageUrl: '' }))
    })

    console.log(`Found ${colorData.length} colors, clicking through each...`)

    // Now find clickable elements (might be different from text elements)
    const clickableSelectors = 'label[for^="swatch-"], input[name="colour"], [data-product-option-value], button[aria-label*="colour" i]'
    const swatches = await page.$$(clickableSelectors)
    
    for (let i = 0; i < Math.min(swatches.length, colorData.length); i++) {
      try {
        const swatch = swatches[i]
        
        // Try to click the swatch (might be a label, so click its associated input if needed)
        try {
          await swatch.click()
        } catch (clickError) {
          // If direct click fails, try clicking via JavaScript
          await page.evaluate(el => {
            if (el instanceof HTMLElement) {
              el.click()
            }
          }, swatch)
        }
        
        // Wait for image to update - increased delay for slower loading
        await page.waitForTimeout(1200)
        
        // Get the main product image URL
        const imageUrl = await page.evaluate(() => {
          // Try multiple selectors for AS Colour's structure
          const selectors = [
            '.productView-image img',                    // Common class
            '[data-image-gallery-main] img',            // Gallery main image
            '.productView-imageCarousel-main-item img', // Carousel image
            'img[class*="product"][class*="image"]',    // Generic product image
            '.product-image img',                        // Standard class
            'img[itemprop="image"]',                    // Schema.org markup
            'figure img',                                // Figure element
            '.slick-current img',                        // Slick slider
            '[class*="ProductImage"] img',              // React component
            'img[class*="main"]'                        // Main image class
          ]
          
          for (const selector of selectors) {
            const img = document.querySelector(selector) as HTMLImageElement
            if (img) {
              const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-zoom-image')
              if (src && src.includes('http')) {
                console.log('Found image with selector:', selector, '-> URL:', src.substring(0, 80))
                return src
              }
            }
          }
          
          return ''
        })
        
        if (imageUrl && colorData[i]) {
          colorData[i].imageUrl = imageUrl
          console.log(`✓ Color ${i + 1}/${colorData.length}: ${colorData[i].colorName} -> ${imageUrl.substring(0, 70)}...`)
        } else {
          console.log(`✗ Color ${i + 1}/${colorData.length}: ${colorData[i]?.colorName || 'unknown'} -> No image found`)
        }
        
      } catch (error) {
        console.error(`Error processing swatch ${i}:`, error)
      }
    }

    await browser.close()
    
    // Filter out any colors without images
    return colorData.filter(c => c.imageUrl)

  } catch (error) {
    if (browser) {
      await browser.close()
    }
    console.error('Browser automation error:', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url, useBrowserAutomation } = await request.json()

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

    const isAsColour = url.toLowerCase().includes('ascolour.com')

    // If it's AS Colour and browser automation is requested, use Puppeteer
    let colorImages: { [color: string]: string } = {}
    if (isAsColour && useBrowserAutomation) {
      try {
        console.log('Using browser automation for AS Colour...')
        const colorData = await scrapeAsColourWithBrowser(url)
        
        colorImages = colorData.reduce((acc, { colorName, imageUrl }) => {
          if (colorName && imageUrl) {
            acc[colorName] = imageUrl
          }
          return acc
        }, {} as { [color: string]: string })
        
        console.log(`Extracted ${Object.keys(colorImages).length} color images via browser automation`)
      } catch (browserError) {
        console.error('Browser automation failed, falling back to HTML scraping:', browserError)
        // Fall through to regular scraping
      }
    }

    // Fetch the HTML content for Claude
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
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.statusText}` },
        { status: 500 }
      )
    }

    const html = await response.text()

    // Extract JSON data from script tags
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

    // Clean HTML
    const cleanedHtml = html
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/\s+/g, ' ')
      .substring(0, 150000)

    console.log('HTML fetched, calling Claude...')

    // Call Claude API to extract structured data
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: `You are a data extraction assistant. Extract garment/apparel product information from the following HTML and JSON data and return it as a JSON object.

${extractedJson ? `STRUCTURED DATA (JSON-LD and Product Data - USE THIS FIRST):
${extractedJson}

` : ''}HTML Content:
${cleanedHtml}

Extract the following information:
- name: The product name (e.g., "Staple Tee - 5001" or "CVC Jersey Tee")
- brand: The brand name (e.g., "AS Colour" or "BELLA + CANVAS")
- description: A detailed description including fabric, weight, fit, and key features (2-3 sentences)
- available_colors: An array of ALL available color names. Extract every single color option. (e.g., ["White", "Black", "Navy", etc.])
- size_range: An array of available sizes (e.g., ["XS", "S", "M", "L", "XL", "2XL", "3XL"])
- thumbnail_url: The URL of the main product image (full URL)
- base_cost: The wholesale/base price if visible (number only, or null if not found)

${Object.keys(colorImages).length > 0 ? `IMPORTANT: I have already extracted color images via browser automation. DO NOT try to extract color_images yourself. The color names you extract should match these colors: ${Object.keys(colorImages).join(', ')}` : '- color_images: An object mapping color names to their image URLs. Try to extract from JSON data if available.'}

Return ONLY a valid JSON object with these exact keys. Do not include any explanatory text.

Example:
{
  "name": "Staple Tee - 5001",
  "brand": "AS Colour",
  "description": "Enduring comfort in a regular fit, crafted from 5.3 oz 100% combed cotton. Featuring neck ribbing, side seams, and double needle hems for durability.",
  "available_colors": ["White", "Black", "Navy", "Powder", "Grey Marle"],
  "size_range": ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"],
  "thumbnail_url": "https://example.com/image.jpg",
  "base_cost": 5.20
}`
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

    // Merge browser-extracted color images with Claude's data
    if (Object.keys(colorImages).length > 0) {
      extractedData.color_images = colorImages
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
    console.error('Error importing from URL:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to import product data' 
      },
      { status: 500 }
    )
  }
}

