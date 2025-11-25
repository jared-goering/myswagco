import { NextRequest, NextResponse } from 'next/server'

/**
 * AI Browser Import Route
 * 
 * NOTE: This endpoint was designed to use Anthropic's browser tool API,
 * which is currently in beta and not publicly available.
 * 
 * For Vercel deployment, use the /api/garments/import-from-url-smart endpoint instead,
 * which uses HTML scraping with Claude for intelligent data extraction.
 */

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'AI browser automation endpoint is not available on Vercel.',
      details: 'Please use /api/garments/import-from-url-smart instead for intelligent web scraping.',
      alternative: '/api/garments/import-from-url-smart'
    },
    { status: 501 }
  )
}

