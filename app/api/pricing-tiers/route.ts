import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function GET(request: NextRequest) {
  try {
    const { data: pricingTiers, error } = await supabase
      .from('pricing_tiers')
      .select('*')
      .order('min_qty', { ascending: true })
    
    if (error) {
      throw error
    }
    
    return NextResponse.json(pricingTiers)
  } catch (error) {
    console.error('Error fetching pricing tiers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pricing tiers' },
      { status: 500 }
    )
  }
}

