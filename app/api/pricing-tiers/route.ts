import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { data: pricingTiers, error } = await supabaseAdmin
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, min_qty, max_qty, garment_markup_percentage } = body

    // Validate required fields
    if (!name || min_qty === undefined || garment_markup_percentage === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: name, min_qty, garment_markup_percentage' },
        { status: 400 }
      )
    }

    // Validate ranges
    if (min_qty < 0) {
      return NextResponse.json(
        { error: 'min_qty must be non-negative' },
        { status: 400 }
      )
    }

    if (max_qty !== null && max_qty !== undefined && max_qty <= min_qty) {
      return NextResponse.json(
        { error: 'max_qty must be greater than min_qty' },
        { status: 400 }
      )
    }

    // Check for overlapping tiers
    const { data: existingTiers } = await supabaseAdmin
      .from('pricing_tiers')
      .select('*')
      .order('min_qty', { ascending: true })

    if (existingTiers) {
      for (const tier of existingTiers) {
        const tierMax = tier.max_qty ?? Infinity
        const newMax = max_qty ?? Infinity
        
        // Check if ranges overlap
        if (
          (min_qty >= tier.min_qty && min_qty <= tierMax) ||
          (newMax >= tier.min_qty && newMax <= tierMax) ||
          (min_qty <= tier.min_qty && newMax >= tierMax)
        ) {
          return NextResponse.json(
            { error: `Tier range overlaps with existing tier: ${tier.name}` },
            { status: 400 }
          )
        }
      }
    }

    // Create the new tier
    const { data: newTier, error } = await supabaseAdmin
      .from('pricing_tiers')
      .insert({
        name,
        min_qty,
        max_qty: max_qty ?? null,
        garment_markup_percentage
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(newTier, { status: 201 })
  } catch (error) {
    console.error('Error creating pricing tier:', error)
    return NextResponse.json(
      { error: 'Failed to create pricing tier' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, min_qty, max_qty, garment_markup_percentage } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      )
    }

    // Validate ranges if provided
    if (min_qty !== undefined && max_qty !== undefined && max_qty !== null && max_qty <= min_qty) {
      return NextResponse.json(
        { error: 'max_qty must be greater than min_qty' },
        { status: 400 }
      )
    }

    // Check for overlapping tiers (excluding current tier)
    if (min_qty !== undefined || max_qty !== undefined) {
      const { data: currentTier } = await supabaseAdmin
        .from('pricing_tiers')
        .select('*')
        .eq('id', id)
        .single()

      if (!currentTier) {
        return NextResponse.json(
          { error: 'Pricing tier not found' },
          { status: 404 }
        )
      }

      const updatedMinQty = min_qty !== undefined ? min_qty : currentTier.min_qty
      const updatedMaxQty = max_qty !== undefined ? max_qty : currentTier.max_qty

      const { data: existingTiers } = await supabaseAdmin
        .from('pricing_tiers')
        .select('*')
        .neq('id', id)
        .order('min_qty', { ascending: true })

      if (existingTiers) {
        for (const tier of existingTiers) {
          const tierMax = tier.max_qty ?? Infinity
          const newMax = updatedMaxQty ?? Infinity
          
          // Check if ranges overlap
          if (
            (updatedMinQty >= tier.min_qty && updatedMinQty <= tierMax) ||
            (newMax >= tier.min_qty && newMax <= tierMax) ||
            (updatedMinQty <= tier.min_qty && newMax >= tierMax)
          ) {
            return NextResponse.json(
              { error: `Tier range overlaps with existing tier: ${tier.name}` },
              { status: 400 }
            )
          }
        }
      }
    }

    // Build update object with only provided fields
    const updates: any = {}
    if (name !== undefined) updates.name = name
    if (min_qty !== undefined) updates.min_qty = min_qty
    if (max_qty !== undefined) updates.max_qty = max_qty
    if (garment_markup_percentage !== undefined) updates.garment_markup_percentage = garment_markup_percentage

    const { data: updatedTier, error } = await supabaseAdmin
      .from('pricing_tiers')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(updatedTier)
  } catch (error) {
    console.error('Error updating pricing tier:', error)
    return NextResponse.json(
      { error: 'Failed to update pricing tier' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      )
    }

    // Check if tier is in use by garments
    const { data: garments } = await supabaseAdmin
      .from('garments')
      .select('id')
      .eq('pricing_tier_id', id)
      .limit(1)

    if (garments && garments.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete tier: it is currently assigned to one or more garments' },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from('pricing_tiers')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting pricing tier:', error)
    return NextResponse.json(
      { error: 'Failed to delete pricing tier' },
      { status: 500 }
    )
  }
}

