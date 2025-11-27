import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface GarmentContext {
  id: string
  name: string
  brand: string
  description: string
  category: string | null
  base_cost: number
  available_colors: string[]
  size_range: string[]
}

const SYSTEM_PROMPT = `You are a friendly and knowledgeable garment expert assistant for My Swag Co, a custom screen printing company. Your role is to help customers choose the perfect garments for their custom printing orders.

You have access to the following garment catalog:

{{GARMENTS_CONTEXT}}

When helping customers:
1. Be conversational, warm, and helpful - like a knowledgeable friend helping them shop
2. Consider factors like fabric weight (oz/yd²), material composition, fit, and intended use
3. Explain the differences between brands and styles when asked
4. Make personalized recommendations based on their needs (event type, budget, comfort preferences)
5. Highlight key features like softness, durability, color options, and print quality
6. If they mention a budget, help them find the best value
7. Keep responses concise but informative - aim for 2-4 sentences unless they ask for detailed comparisons
8. Use the actual product names and brands from the catalog - always mention the style number (like "1717" or "3001CVC") when recommending specific products
9. If asked about something not in the catalog, politely explain what options ARE available

Remember: You're helping them choose blank garments that will be screen printed. Focus on fabric quality, fit, and how well designs will print on each option.`

// Function to detect mentioned garments in the AI response
function detectMentionedGarments(response: string, garments: GarmentContext[]): string[] {
  const mentionedIds: string[] = []
  const responseLower = response.toLowerCase()
  
  for (const garment of garments) {
    // Check if the garment name is mentioned (case-insensitive)
    const nameLower = garment.name.toLowerCase()
    
    // Check for exact name match or name with brand
    if (responseLower.includes(nameLower)) {
      if (!mentionedIds.includes(garment.id)) {
        mentionedIds.push(garment.id)
      }
      continue
    }
    
    // Check for brand + partial name (e.g., "Comfort Colors 1717", "BELLA + CANVAS 3001CVC")
    const brandNameCombo = `${garment.brand} ${garment.name}`.toLowerCase()
    if (responseLower.includes(brandNameCombo)) {
      if (!mentionedIds.includes(garment.id)) {
        mentionedIds.push(garment.id)
      }
      continue
    }
    
    // Check for style numbers that might be mentioned (common patterns like "1717", "3001CVC", "5001")
    // Extract potential style numbers from the garment name
    const styleNumberMatch = garment.name.match(/^([A-Z0-9]+)$/i) || garment.name.match(/^(\d+[A-Z]*)/i)
    if (styleNumberMatch) {
      const styleNumber = styleNumberMatch[1].toLowerCase()
      // Make sure we're matching the style number as a distinct word
      const styleRegex = new RegExp(`\\b${styleNumber}\\b`, 'i')
      if (styleRegex.test(response)) {
        if (!mentionedIds.includes(garment.id)) {
          mentionedIds.push(garment.id)
        }
      }
    }
  }
  
  return mentionedIds
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, history, garments } = body as {
      message: string
      history?: Message[]
      garments: GarmentContext[]
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    if (!garments || !Array.isArray(garments) || garments.length === 0) {
      return NextResponse.json(
        { error: 'Garments context is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured. Please add ANTHROPIC_API_KEY to your environment variables.' },
        { status: 500 }
      )
    }

    // Format garments context for the system prompt
    const garmentsContext = garments.map((g, index) => {
      const priceFormatted = `$${g.base_cost.toFixed(2)}`
      return `${index + 1}. **${g.name}** by ${g.brand}
   - Category: ${g.category || 'General'}
   - Base Price: ${priceFormatted}
   - Description: ${g.description}
   - Available Colors: ${g.available_colors.length} options (${g.available_colors.slice(0, 8).join(', ')}${g.available_colors.length > 8 ? '...' : ''})
   - Sizes: ${g.size_range.join(', ')}`
    }).join('\n\n')

    const systemPrompt = SYSTEM_PROMPT.replace('{{GARMENTS_CONTEXT}}', garmentsContext)

    // Build conversation messages
    const messages: { role: 'user' | 'assistant'; content: string }[] = []
    
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({
            role: msg.role,
            content: msg.content
          })
        }
      }
    }
    
    // Add the new user message
    messages.push({
      role: 'user',
      content: message.trim()
    })

    const anthropic = new Anthropic({
      apiKey,
    })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    })

    // Extract text response
    const textContent = response.content.find(c => c.type === 'text')
    const assistantMessage = textContent?.type === 'text' ? textContent.text : 'I apologize, but I couldn\'t generate a response. Please try again.'

    // Detect which garments were mentioned in the response
    const mentionedGarmentIds = detectMentionedGarments(assistantMessage, garments)

    return NextResponse.json({
      success: true,
      message: assistantMessage,
      mentionedGarmentIds,
    })

  } catch (error: any) {
    console.error('Error in garment chat:', error?.message || error)
    
    // Handle rate limiting
    if (error?.status === 429) {
      return NextResponse.json(
        { error: 'Chat rate limit reached. Please wait a moment and try again.' },
        { status: 429 }
      )
    }

    // Handle API key issues
    if (error?.status === 401) {
      return NextResponse.json(
        { error: 'Invalid API key. Please check your ANTHROPIC_API_KEY.' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to get response. Please try again.' },
      { status: 500 }
    )
  }
}

