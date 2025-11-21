import { NextRequest, NextResponse } from 'next/server'
import { quoteRequestSchema } from '@/lib/schemas'
import { calculateQuote } from '@/lib/pricing'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request
    const validatedData = quoteRequestSchema.parse(body)
    
    // Calculate quote
    const quote = await calculateQuote(
      validatedData.garment_id,
      validatedData.quantity,
      validatedData.print_config
    )
    
    return NextResponse.json(quote)
  } catch (error: any) {
    console.error('Error calculating quote:', error)
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to calculate quote' },
      { status: 500 }
    )
  }
}

