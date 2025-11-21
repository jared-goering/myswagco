import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function GET(request: NextRequest) {
  try {
    // Fetch all active garments
    const { data: garments, error } = await supabase
      .from('garments')
      .select('*')
      .eq('active', true)
      .order('name', { ascending: true })
    
    if (error) {
      throw error
    }
    
    return NextResponse.json(garments)
  } catch (error) {
    console.error('Error fetching garments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch garments' },
      { status: 500 }
    )
  }
}

