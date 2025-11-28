import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

/**
 * Check if a description looks like raw supplier text that needs enhancement
 * Returns true if description contains technical specs typical of supplier data
 */
function needsEnhancement(description: string): boolean {
  if (!description || description.length < 30) return false
  
  // Patterns that indicate raw supplier descriptions
  const technicalPatterns = [
    /\d+\.?\d*\s*oz\.?\/yd/i,        // Weight specs like "6.1 oz./yd²"
    /\d+\s*singles/i,                 // Thread count like "30 singles"
    /\d+%\s*(cotton|polyester|ring-?spun)/i, // Material percentages
    /garment[- ]?dyed/i,              // Manufacturing terms
    /pre[- ]?shrunk/i,
    /side[- ]?seamed/i,
    /tear[- ]?away\s*label/i,
    /shoulder\s*to\s*shoulder/i,
    /double[- ]?needle/i,
    /tubular\s*construction/i,
    /oz\/L\s*yd/i,                    // Canadian weight specs
    /OEKO-TEX/i,                      // Certifications
    /cotton\s*trust\s*protocol/i,
  ]
  
  // If description matches 2+ technical patterns, it probably needs enhancement
  const matchCount = technicalPatterns.filter(pattern => pattern.test(description)).length
  return matchCount >= 2
}

/**
 * Enhance a technical supplier description into consumer-friendly marketing copy
 */
async function enhanceDescription(
  rawDescription: string,
  productName: string,
  brand: string,
  category: string
): Promise<string> {
  if (!rawDescription || rawDescription.length < 20) {
    return rawDescription || `${productName} by ${brand}`
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: `You are a copywriter for a custom apparel printing company. Rewrite this technical supplier description into engaging, consumer-friendly marketing copy.

PRODUCT: ${productName}
BRAND: ${brand}
CATEGORY: ${category}
RAW DESCRIPTION: ${rawDescription}

REQUIREMENTS:
- Write 2-3 sentences maximum
- MUST include the fabric weight (e.g., "6.1 oz" or "heavyweight 8 oz")
- MUST include the fiber composition (e.g., "100% ring-spun cotton" or "50/50 cotton-polyester blend")  
- Include fit type if mentioned (relaxed fit, retail fit, etc.)
- Make technical terms consumer-friendly (e.g., "ring-spun cotton" is fine, but skip "30 singles")
- Highlight comfort and quality benefits
- Make it sound premium and desirable
- Don't use marketing clichés or exclamation points
- Keep it professional and trustworthy
- Mention if it's good for screen printing/custom designs when relevant

EXAMPLE OUTPUT:
"A heavyweight 6.1 oz tee made from 100% ring-spun cotton with a relaxed fit that only gets softer with every wash. The garment-dyed finish means virtually no shrinkage and rich colors that hold up beautifully to screen printing."

Return ONLY the new description, no quotes or explanations.`
        }
      ]
    })

    const content = message.content[0]
    if (content.type === 'text' && content.text.trim()) {
      return content.text.trim()
    }
    
    return rawDescription
  } catch (error) {
    console.warn('Description enhancement failed:', error)
    return rawDescription
  }
}

/**
 * POST /api/garments/enhance-descriptions
 * Batch enhance all garment descriptions that look like raw supplier text
 */
export async function POST(request: NextRequest) {
  console.log('📝 Starting batch description enhancement...')
  
  try {
    // Fetch all garments
    const { data: garments, error: fetchError } = await supabaseAdmin
      .from('garments')
      .select('id, name, brand, category, description')
      .order('created_at', { ascending: false })
    
    if (fetchError) {
      console.error('Error fetching garments:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch garments' },
        { status: 500 }
      )
    }

    if (!garments || garments.length === 0) {
      return NextResponse.json({
        message: 'No garments found',
        enhanced: 0,
        skipped: 0,
        total: 0
      })
    }

    // Filter garments that need enhancement
    const garmentsToEnhance = garments.filter(g => needsEnhancement(g.description || ''))
    
    console.log(`📝 Found ${garmentsToEnhance.length} garments needing enhancement out of ${garments.length} total`)

    const results = {
      enhanced: 0,
      skipped: garments.length - garmentsToEnhance.length,
      failed: 0,
      total: garments.length,
      details: [] as { id: string; name: string; status: string; before?: string; after?: string }[]
    }

    // Process each garment that needs enhancement
    for (const garment of garmentsToEnhance) {
      try {
        console.log(`✨ Enhancing: ${garment.name}`)
        
        const enhancedDescription = await enhanceDescription(
          garment.description || '',
          garment.name,
          garment.brand || '',
          garment.category || 'Apparel'
        )

        // Only update if description actually changed
        if (enhancedDescription !== garment.description) {
          const { error: updateError } = await supabaseAdmin
            .from('garments')
            .update({ description: enhancedDescription })
            .eq('id', garment.id)

          if (updateError) {
            console.error(`Failed to update ${garment.name}:`, updateError)
            results.failed++
            results.details.push({
              id: garment.id,
              name: garment.name,
              status: 'failed',
              before: garment.description?.substring(0, 100)
            })
          } else {
            results.enhanced++
            results.details.push({
              id: garment.id,
              name: garment.name,
              status: 'enhanced',
              before: garment.description?.substring(0, 100),
              after: enhancedDescription.substring(0, 100)
            })
          }
        } else {
          results.skipped++
          results.details.push({
            id: garment.id,
            name: garment.name,
            status: 'unchanged'
          })
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error) {
        console.error(`Error processing ${garment.name}:`, error)
        results.failed++
        results.details.push({
          id: garment.id,
          name: garment.name,
          status: 'error'
        })
      }
    }

    console.log(`✅ Enhancement complete: ${results.enhanced} enhanced, ${results.skipped} skipped, ${results.failed} failed`)

    return NextResponse.json({
      message: `Enhanced ${results.enhanced} garment descriptions`,
      ...results
    })

  } catch (error) {
    console.error('Error in batch enhancement:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to enhance descriptions' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/garments/enhance-descriptions
 * Preview which garments would be enhanced (dry run)
 */
export async function GET(request: NextRequest) {
  console.log('📊 Analyzing garment descriptions...')
  
  try {
    const { data: garments, error } = await supabaseAdmin
      .from('garments')
      .select('id, name, brand, category, description')
      .order('created_at', { ascending: false })
    
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch garments' }, { status: 500 })
    }

    const analysis = garments?.map(g => ({
      id: g.id,
      name: g.name,
      needsEnhancement: needsEnhancement(g.description || ''),
      descriptionPreview: g.description?.substring(0, 150) + (g.description && g.description.length > 150 ? '...' : '')
    })) || []

    const needsWork = analysis.filter(a => a.needsEnhancement)

    return NextResponse.json({
      total: analysis.length,
      needsEnhancement: needsWork.length,
      alreadyGood: analysis.length - needsWork.length,
      garments: analysis
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to analyze garments' },
      { status: 500 }
    )
  }
}

