import { NextRequest, NextResponse } from 'next/server'
import { calculateCampaignPricesForGarments } from '@/lib/pricing'
import { PrintConfig } from '@/types'

interface CalculatePriceRequest {
  garment_ids: string[]
  print_config: PrintConfig
}

/**
 * POST /api/campaigns/calculate-price
 * Calculate per-garment prices for campaigns
 * Uses Tier 1 (24-47 qty) pricing with garment cost + print cost (no setup fees)
 */
export async function POST(request: NextRequest) {
  try {
    const body: CalculatePriceRequest = await request.json()
    
    // Validate required fields
    if (!body.garment_ids || !Array.isArray(body.garment_ids) || body.garment_ids.length === 0) {
      return NextResponse.json(
        { error: 'garment_ids is required and must be a non-empty array' },
        { status: 400 }
      )
    }
    
    if (!body.print_config) {
      return NextResponse.json(
        { error: 'print_config is required' },
        { status: 400 }
      )
    }
    
    // Calculate prices for all garments
    const prices = await calculateCampaignPricesForGarments(
      body.garment_ids,
      body.print_config
    )
    
    // Check if we got prices for all garments
    const missingGarments = body.garment_ids.filter(id => !prices[id])
    if (missingGarments.length > 0) {
      console.warn('Some garments were not found:', missingGarments)
    }
    
    return NextResponse.json({
      prices,
      missing_garments: missingGarments
    })
  } catch (error: any) {
    console.error('Error calculating campaign prices:', error)
    return NextResponse.json(
      { error: 'Failed to calculate prices' },
      { status: 500 }
    )
  }
}

