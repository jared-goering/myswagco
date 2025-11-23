import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { data: printPricing, error } = await supabaseAdmin
      .from('print_pricing')
      .select('*')
      .order('tier_id, num_colors', { ascending: true })
    
    if (error) {
      throw error
    }
    
    return NextResponse.json(printPricing)
  } catch (error) {
    console.error('Error fetching print pricing:', error)
    return NextResponse.json(
      { error: 'Failed to fetch print pricing' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tier_id, num_colors, cost_per_shirt, setup_fee_per_screen } = body

    // Validate required fields
    if (!tier_id || num_colors === undefined || cost_per_shirt === undefined || setup_fee_per_screen === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: tier_id, num_colors, cost_per_shirt, setup_fee_per_screen' },
        { status: 400 }
      )
    }

    // Validate num_colors range (1-4)
    if (num_colors < 1 || num_colors > 4) {
      return NextResponse.json(
        { error: 'num_colors must be between 1 and 4' },
        { status: 400 }
      )
    }

    // Validate positive values
    if (cost_per_shirt < 0 || setup_fee_per_screen < 0) {
      return NextResponse.json(
        { error: 'cost_per_shirt and setup_fee_per_screen must be non-negative' },
        { status: 400 }
      )
    }

    // Check if tier exists
    const { data: tier } = await supabaseAdmin
      .from('pricing_tiers')
      .select('id')
      .eq('id', tier_id)
      .single()

    if (!tier) {
      return NextResponse.json(
        { error: 'Invalid tier_id: pricing tier not found' },
        { status: 400 }
      )
    }

    // Check for duplicate (tier_id, num_colors) combination
    const { data: existing } = await supabaseAdmin
      .from('print_pricing')
      .select('id')
      .eq('tier_id', tier_id)
      .eq('num_colors', num_colors)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Print pricing for this tier and color count already exists' },
        { status: 400 }
      )
    }

    // Create the new print pricing
    const { data: newPricing, error } = await supabaseAdmin
      .from('print_pricing')
      .insert({
        tier_id,
        num_colors,
        cost_per_shirt,
        setup_fee_per_screen
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(newPricing, { status: 201 })
  } catch (error) {
    console.error('Error creating print pricing:', error)
    return NextResponse.json(
      { error: 'Failed to create print pricing' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, tier_id, num_colors, cost_per_shirt, setup_fee_per_screen } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      )
    }

    // Validate num_colors range if provided
    if (num_colors !== undefined && (num_colors < 1 || num_colors > 4)) {
      return NextResponse.json(
        { error: 'num_colors must be between 1 and 4' },
        { status: 400 }
      )
    }

    // Validate positive values if provided
    if ((cost_per_shirt !== undefined && cost_per_shirt < 0) || 
        (setup_fee_per_screen !== undefined && setup_fee_per_screen < 0)) {
      return NextResponse.json(
        { error: 'cost_per_shirt and setup_fee_per_screen must be non-negative' },
        { status: 400 }
      )
    }

    // Check if tier exists if tier_id is being updated
    if (tier_id !== undefined) {
      const { data: tier } = await supabaseAdmin
        .from('pricing_tiers')
        .select('id')
        .eq('id', tier_id)
        .single()

      if (!tier) {
        return NextResponse.json(
          { error: 'Invalid tier_id: pricing tier not found' },
          { status: 400 }
        )
      }
    }

    // Check for duplicate (tier_id, num_colors) if either is being updated
    if (tier_id !== undefined || num_colors !== undefined) {
      const { data: currentPricing } = await supabaseAdmin
        .from('print_pricing')
        .select('*')
        .eq('id', id)
        .single()

      if (!currentPricing) {
        return NextResponse.json(
          { error: 'Print pricing not found' },
          { status: 404 }
        )
      }

      const updatedTierId = tier_id !== undefined ? tier_id : currentPricing.tier_id
      const updatedNumColors = num_colors !== undefined ? num_colors : currentPricing.num_colors

      const { data: existing } = await supabaseAdmin
        .from('print_pricing')
        .select('id')
        .eq('tier_id', updatedTierId)
        .eq('num_colors', updatedNumColors)
        .neq('id', id)
        .single()

      if (existing) {
        return NextResponse.json(
          { error: 'Print pricing for this tier and color count already exists' },
          { status: 400 }
        )
      }
    }

    // Build update object with only provided fields
    const updates: any = {}
    if (tier_id !== undefined) updates.tier_id = tier_id
    if (num_colors !== undefined) updates.num_colors = num_colors
    if (cost_per_shirt !== undefined) updates.cost_per_shirt = cost_per_shirt
    if (setup_fee_per_screen !== undefined) updates.setup_fee_per_screen = setup_fee_per_screen

    const { data: updatedPricing, error } = await supabaseAdmin
      .from('print_pricing')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(updatedPricing)
  } catch (error) {
    console.error('Error updating print pricing:', error)
    return NextResponse.json(
      { error: 'Failed to update print pricing' },
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

    const { error } = await supabaseAdmin
      .from('print_pricing')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting print pricing:', error)
    return NextResponse.json(
      { error: 'Failed to delete print pricing' },
      { status: 500 }
    )
  }
}

