import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Timeout wrapper for async operations
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ])
}

// Shorter first timeout since model usually responds in ~15-20s when working
// If first attempt gets stuck, retry quickly rather than waiting full 90s
const FIRST_ATTEMPT_TIMEOUT_MS = 45000 // 45 seconds for first try
const RETRY_TIMEOUT_MS = 60000 // 60 seconds for retries (slightly more generous)
const MAX_RETRIES = 2 // Will try up to 3 times total

const SCREEN_PRINT_SYSTEM_PROMPT = `You are an expert screen print designer creating artwork for custom t-shirts. 

CRITICAL DESIGN CONSTRAINTS - Follow these EXACTLY:
1. LIMITED COLORS: Use ONLY 1-4 solid, distinct colors. No more than 4 colors total.
2. NO GRADIENTS: Absolutely no gradients, fades, or color transitions. Each color must be completely flat and solid.
3. NO HALFTONES: No dots, stippling, or halftone patterns to simulate gradients.
4. HIGH CONTRAST: Use bold, high-contrast shapes that will be clearly visible on fabric.
5. CLEAN EDGES: All shapes must have crisp, clean edges - no soft edges, blurs, or anti-aliasing effects.
6. BOLD SHAPES: Design with bold, confident shapes that will print well at various sizes.
7. SEPARABLE COLORS: Each color should be easily separable for screen printing (imagine each color printed as a separate layer).
8. NO PHOTOREALISM: Avoid photorealistic imagery - use stylized, graphic, illustrative styles instead.
9. TRANSPARENT BACKGROUND: Create design on a transparent background when possible.
10. VECTOR-FRIENDLY: Design should look like it could be easily converted to vector format.

STYLE GUIDANCE:
- Think vintage poster art, bold logos, punk rock flyers, sports graphics
- Flat illustration style works best
- Consider how ink will look on fabric
- Design should work on both light and dark shirt colors

Generate a design that follows ALL these constraints. The result should be print-ready for screen printing.`

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log('\n========== AI DESIGN GENERATION START ==========')
  console.log(`[${new Date().toISOString()}] Request received`)
  
  try {
    const body = await request.json()
    const { prompt, referenceImages } = body as {
      prompt: string
      referenceImages?: string[] // Array of base64 image strings
    }

    console.log(`[+${Date.now() - startTime}ms] Parsed request body`)
    console.log(`  - Prompt length: ${prompt?.length || 0} chars`)
    console.log(`  - Prompt preview: "${prompt?.substring(0, 100)}..."`)
    console.log(`  - Reference images: ${referenceImages?.length || 0}`)
    if (referenceImages?.length) {
      referenceImages.forEach((img, i) => {
        const sizeKB = Math.round(img.length / 1024)
        console.log(`    - Image ${i + 1}: ~${sizeKB}KB`)
      })
    }

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Generative AI API key not configured. Please add GOOGLE_GENERATIVE_AI_API_KEY to your environment variables.' },
        { status: 500 }
      )
    }

    console.log(`[+${Date.now() - startTime}ms] Initializing Gemini client...`)
    const genAI = new GoogleGenerativeAI(apiKey)
    
    // Use the Gemini model with image generation capabilities
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-3-pro-image-preview',
      generationConfig: {
        responseModalities: ['Text', 'Image'],
      } as any, // Type assertion needed for experimental features
    })

    // Build the content parts
    const parts: any[] = []

    // Add reference images if provided (only supported formats)
    const SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    const validImages: { mimeType: string; data: string }[] = []
    
    if (referenceImages && referenceImages.length > 0) {
      for (const imageBase64 of referenceImages) {
        // Parse data URL without regex (avoids stack overflow on large strings)
        if (imageBase64.startsWith('data:')) {
          const commaIndex = imageBase64.indexOf(',')
          if (commaIndex > 0) {
            const header = imageBase64.substring(5, commaIndex) // Skip 'data:'
            const base64Marker = ';base64'
            const base64Index = header.indexOf(base64Marker)
            
            if (base64Index > 0) {
              const mimeType = header.substring(0, base64Index)
              const data = imageBase64.substring(commaIndex + 1)
              
              // Only include supported image types (Gemini doesn't support SVG, etc.)
              if (SUPPORTED_MIME_TYPES.includes(mimeType)) {
                validImages.push({ mimeType, data })
              }
            }
          }
        }
      }
    }

    // If there are reference images, structure prompt to emphasize modifications
    if (validImages.length > 0) {
      // Add reference image first
      parts.push({ text: 'Here is a reference image for style inspiration ONLY:' })
      for (const img of validImages) {
        parts.push({
          inlineData: {
            mimeType: img.mimeType,
            data: img.data,
          },
        })
      }
      
      // Then add the modification instructions with strong emphasis
      parts.push({ 
        text: `
${SCREEN_PRINT_SYSTEM_PROMPT}

CRITICAL INSTRUCTION - YOU MUST FOLLOW THIS:
The user wants to CREATE A NEW DESIGN based on the reference image above, with these SPECIFIC CHANGES:

"${prompt.trim()}"

DO NOT simply recreate the reference image. You MUST apply the user's requested changes.
If they ask to change text, CHANGE THE TEXT to what they specified.
If they ask to modify elements, MODIFY those elements.
The reference is only for style/layout inspiration - the content MUST reflect the user's request.

Generate a NEW screen print design that incorporates the user's changes. Remember: 1-4 solid colors only, no gradients, bold shapes, clean edges.`
      })
    } else {
      // No reference images - just use the prompt directly
      const fullPrompt = `${SCREEN_PRINT_SYSTEM_PROMPT}

USER REQUEST: ${prompt.trim()}

Generate a screen print design based on this request. Remember: 1-4 solid colors only, no gradients, bold shapes, clean edges.`

      parts.push({ text: fullPrompt })
    }

    // Calculate total payload size
    const totalPartsSize = parts.reduce((acc, part) => {
      if (part.text) return acc + part.text.length
      if (part.inlineData) return acc + part.inlineData.data.length
      return acc
    }, 0)
    console.log(`[+${Date.now() - startTime}ms] Prepared ${parts.length} content parts (~${Math.round(totalPartsSize / 1024)}KB total)`)
    
    // Generate the image with timeout and retry logic
    console.log(`[+${Date.now() - startTime}ms] Starting Gemini API call (model: gemini-3-pro-image-preview)...`)
    
    let result: any = null
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const apiCallStart = Date.now()
      
      if (attempt > 0) {
        console.log(`[+${Date.now() - startTime}ms] Retry attempt ${attempt}/${MAX_RETRIES}...`)
      }
      
      try {
        const timeout = attempt === 0 ? FIRST_ATTEMPT_TIMEOUT_MS : RETRY_TIMEOUT_MS
        result = await withTimeout(
          model.generateContent(parts),
          timeout,
          'Image generation timed out.'
        )
        
        const apiCallDuration = Date.now() - apiCallStart
        console.log(`[+${Date.now() - startTime}ms] Gemini API responded (took ${apiCallDuration}ms)`)
        break // Success, exit retry loop
        
      } catch (err: any) {
        lastError = err
        const apiCallDuration = Date.now() - apiCallStart
        console.log(`[+${Date.now() - startTime}ms] Attempt ${attempt + 1} failed after ${apiCallDuration}ms: ${err.message}`)
        
        // Don't retry on non-timeout errors (like rate limits)
        if (!err.message?.includes('timed out') && !err.message?.includes('fetch failed')) {
          throw err
        }
        
        if (attempt < MAX_RETRIES) {
          // Wait a bit before retrying (1s, 2s)
          const waitTime = (attempt + 1) * 1000
          console.log(`[+${Date.now() - startTime}ms] Waiting ${waitTime}ms before retry...`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
        }
      }
    }
    
    if (!result) {
      throw lastError || new Error('Image generation failed after all retries')
    }
    
    const response = result.response

    // Extract the generated image from the response
    let generatedImageBase64: string | null = null
    let textResponse: string | null = null

    console.log(`[+${Date.now() - startTime}ms] Processing response...`)
    console.log(`  - Candidates: ${response.candidates?.length || 0}`)

    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0]
      console.log(`  - Finish reason: ${candidate.finishReason}`)
      console.log(`  - Parts: ${candidate.content?.parts?.length || 0}`)
      
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.text) {
            textResponse = part.text
            console.log(`  - Got text response: ${part.text.substring(0, 100)}...`)
          }
          if ((part as any).inlineData) {
            const inlineData = (part as any).inlineData
            console.log(`  - Got image: ${inlineData.mimeType}, ~${Math.round(inlineData.data.length / 1024)}KB`)
            generatedImageBase64 = `data:${inlineData.mimeType};base64,${inlineData.data}`
          }
        }
      }
    }

    if (!generatedImageBase64) {
      console.log(`[+${Date.now() - startTime}ms] ERROR: No image in response`)
      console.log('========== AI DESIGN GENERATION END (FAILED) ==========\n')
      return NextResponse.json(
        { 
          error: 'Failed to generate image. The model may not have produced an image output.',
          details: textResponse || 'No additional details available'
        },
        { status: 500 }
      )
    }

    const totalDuration = Date.now() - startTime
    console.log(`[+${totalDuration}ms] SUCCESS - Image generated`)
    console.log(`========== AI DESIGN GENERATION END (${totalDuration}ms total) ==========\n`)
    
    return NextResponse.json({
      success: true,
      image: generatedImageBase64,
      message: textResponse || 'Design generated successfully',
    })

  } catch (error: any) {
    const errorTime = Date.now() - startTime
    console.error(`[+${errorTime}ms] ERROR generating artwork:`, error?.message || error)
    console.error('  - Error name:', error?.name)
    console.error('  - Error status:', error?.status)
    console.error('  - Error statusText:', error?.statusText)
    console.error('  - Error code:', error?.code)
    console.error('  - Full error object:', JSON.stringify(error, null, 2))
    console.error('  - Error details:', error?.errorDetails)
    console.error('  - Error stack:', error?.stack)
    console.log(`========== AI DESIGN GENERATION END (FAILED at ${errorTime}ms) ==========\n`)
    
    // Extract retry delay if available
    let retryAfter: number | null = null
    if (error?.errorDetails) {
      const retryInfo = error.errorDetails.find((d: any) => 
        d['@type']?.includes('RetryInfo')
      )
      if (retryInfo?.retryDelay) {
        // Parse "36s" format
        const match = retryInfo.retryDelay.match(/(\d+)s/)
        if (match) {
          retryAfter = parseInt(match[1])
        }
      }
    }
    
    // Handle specific error types
    if (error?.status === 429 || error?.statusText === 'Too Many Requests') {
      return NextResponse.json(
        { 
          error: `AI generation rate limit reached. ${retryAfter ? `Please wait ${retryAfter} seconds and try again.` : 'Please wait a moment and try again.'}`,
          retryAfter,
          isRateLimit: true
        },
        { status: 429 }
      )
    }
    
    if (error instanceof Error) {
      // Timeout error
      if (error.message.includes('timed out')) {
        return NextResponse.json(
          { error: error.message },
          { status: 504 }
        )
      }
      
      // Network/fetch errors
      if (error.message.includes('fetch failed') || error.message.includes('ECONNRESET') || error.message.includes('network')) {
        return NextResponse.json(
          { error: 'Network error connecting to AI service. Please check your connection and try again.' },
          { status: 503 }
        )
      }
      
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'Invalid API key. Please check your GOOGLE_GENERATIVE_AI_API_KEY.' },
          { status: 401 }
        )
      }
      if (error.message.includes('quota') || error.message.includes('rate') || error.message.includes('429')) {
        return NextResponse.json(
          { 
            error: 'AI generation rate limit reached. This is a preview model with strict limits. Please wait 30-60 seconds and try again.',
            isRateLimit: true,
            retryAfter: 45
          },
          { status: 429 }
        )
      }
      if (error.message.includes('safety')) {
        return NextResponse.json(
          { error: 'The request was blocked due to safety filters. Please try a different prompt.' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to generate artwork. Please try again.' },
      { status: 500 }
    )
  }
}

