import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: garment, error } = await supabase
      .from('garments')
      .select('*')
      .eq('id', params.id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Garment not found' },
          { status: 404 }
        )
      }
      throw error
    }
    
    return NextResponse.json(garment)
  } catch (error) {
    console.error('Error fetching garment:', error)
    return NextResponse.json(
      { error: 'Failed to fetch garment' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    
    // Build update object with only provided fields
    const updates: any = {}
    
    if (body.name !== undefined) updates.name = body.name
    if (body.brand !== undefined) updates.brand = body.brand
    if (body.description !== undefined) updates.description = body.description
    if (body.category !== undefined) updates.category = body.category
    if (body.base_cost !== undefined) {
      if (typeof body.base_cost !== 'number' || body.base_cost <= 0) {
        return NextResponse.json(
          { error: 'base_cost must be a positive number' },
          { status: 400 }
        )
      }
      updates.base_cost = body.base_cost
    }
    if (body.available_colors !== undefined) {
      if (!Array.isArray(body.available_colors) || body.available_colors.length === 0) {
        return NextResponse.json(
          { error: 'available_colors must be a non-empty array' },
          { status: 400 }
        )
      }
      updates.available_colors = body.available_colors
    }
    if (body.size_range !== undefined) {
      if (!Array.isArray(body.size_range) || body.size_range.length === 0) {
        return NextResponse.json(
          { error: 'size_range must be a non-empty array' },
          { status: 400 }
        )
      }
      updates.size_range = body.size_range
    }
    if (body.pricing_tier_id !== undefined) updates.pricing_tier_id = body.pricing_tier_id
    if (body.active !== undefined) updates.active = body.active
    if (body.thumbnail_url !== undefined) updates.thumbnail_url = body.thumbnail_url
    if (body.color_images !== undefined) updates.color_images = body.color_images
    if (body.color_back_images !== undefined) updates.color_back_images = body.color_back_images
    if (body.ss_style_id !== undefined) updates.ss_style_id = body.ss_style_id
    if (body.supplier_source !== undefined) updates.supplier_source = body.supplier_source
    if (body.fit_type !== undefined) updates.fit_type = body.fit_type
    
    // Update garment using admin client
    const { data: garment, error } = await supabaseAdmin
      .from('garments')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Garment not found' },
          { status: 404 }
        )
      }
      throw error
    }
    
    return NextResponse.json(garment)
  } catch (error) {
    console.error('Error updating garment:', error)
    return NextResponse.json(
      { error: 'Failed to update garment' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const permanent = searchParams.get('permanent') === 'true'
    
    if (permanent) {
      // Hard delete - permanently remove from database
      const { data: garment, error } = await supabaseAdmin
        .from('garments')
        .delete()
        .eq('id', params.id)
        .select()
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json(
            { error: 'Garment not found' },
            { status: 404 }
          )
        }
        throw error
      }
      
      return NextResponse.json({ message: 'Garment permanently deleted', garment })
    } else {
      // Soft delete - just set active to false
      const { data: garment, error } = await supabaseAdmin
        .from('garments')
        .update({ active: false })
        .eq('id', params.id)
        .select()
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json(
            { error: 'Garment not found' },
            { status: 404 }
          )
        }
        throw error
      }
      
      return NextResponse.json(garment)
    }
  } catch (error) {
    console.error('Error deleting garment:', error)
    return NextResponse.json(
      { error: 'Failed to delete garment' },
      { status: 500 }
    )
  }
}

