import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const adminView = searchParams.get('admin') === 'true'
    
    // Build query
    let query = supabase
      .from('garments')
      .select('*')
      .order('name', { ascending: true })
    
    // Only filter by active if not admin view
    if (!adminView) {
      query = query.eq('active', true)
    }
    
    const { data: garments, error } = await query
    
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    const requiredFields = ['name', 'brand', 'description', 'base_cost', 'available_colors', 'size_range', 'pricing_tier_id']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }
    
    // Validate arrays
    if (!Array.isArray(body.available_colors) || body.available_colors.length === 0) {
      return NextResponse.json(
        { error: 'available_colors must be a non-empty array' },
        { status: 400 }
      )
    }
    
    if (!Array.isArray(body.size_range) || body.size_range.length === 0) {
      return NextResponse.json(
        { error: 'size_range must be a non-empty array' },
        { status: 400 }
      )
    }
    
    // Validate base_cost is a number
    if (typeof body.base_cost !== 'number' || body.base_cost <= 0) {
      return NextResponse.json(
        { error: 'base_cost must be a positive number' },
        { status: 400 }
      )
    }
    
    // Create garment using admin client
    const { data: garment, error } = await supabaseAdmin
      .from('garments')
      .insert({
        name: body.name,
        brand: body.brand,
        description: body.description,
        base_cost: body.base_cost,
        available_colors: body.available_colors,
        color_images: body.color_images || {},
        size_range: body.size_range,
        pricing_tier_id: body.pricing_tier_id,
        active: body.active ?? true,
        thumbnail_url: body.thumbnail_url || null
      })
      .select()
      .single()
    
    if (error) {
      throw error
    }
    
    return NextResponse.json(garment, { status: 201 })
  } catch (error) {
    console.error('Error creating garment:', error)
    return NextResponse.json(
      { error: 'Failed to create garment' },
      { status: 500 }
    )
  }
}

