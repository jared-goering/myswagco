import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { data: config, error } = await supabaseAdmin
      .from('app_config')
      .select('*')
      .single()
    
    if (error) {
      throw error
    }
    
    return NextResponse.json(config)
  } catch (error) {
    console.error('Error fetching app config:', error)
    return NextResponse.json(
      { error: 'Failed to fetch app config' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { deposit_percentage, min_order_quantity, max_ink_colors } = body

    // Validate deposit_percentage if provided
    if (deposit_percentage !== undefined) {
      if (deposit_percentage < 0 || deposit_percentage > 100) {
        return NextResponse.json(
          { error: 'deposit_percentage must be between 0 and 100' },
          { status: 400 }
        )
      }
    }

    // Validate min_order_quantity if provided
    if (min_order_quantity !== undefined) {
      if (min_order_quantity < 1) {
        return NextResponse.json(
          { error: 'min_order_quantity must be at least 1' },
          { status: 400 }
        )
      }
    }

    // Validate max_ink_colors if provided
    if (max_ink_colors !== undefined) {
      if (max_ink_colors < 1 || max_ink_colors > 10) {
        return NextResponse.json(
          { error: 'max_ink_colors must be between 1 and 10' },
          { status: 400 }
        )
      }
    }

    // Build update object with only provided fields
    const updates: any = {}
    if (deposit_percentage !== undefined) updates.deposit_percentage = deposit_percentage
    if (min_order_quantity !== undefined) updates.min_order_quantity = min_order_quantity
    if (max_ink_colors !== undefined) updates.max_ink_colors = max_ink_colors

    // Get the first (and should be only) config record
    const { data: currentConfig } = await supabaseAdmin
      .from('app_config')
      .select('id')
      .single()

    if (!currentConfig) {
      return NextResponse.json(
        { error: 'App config not found' },
        { status: 404 }
      )
    }

    const { data: updatedConfig, error } = await supabaseAdmin
      .from('app_config')
      .update(updates)
      .eq('id', currentConfig.id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(updatedConfig)
  } catch (error) {
    console.error('Error updating app config:', error)
    return NextResponse.json(
      { error: 'Failed to update app config' },
      { status: 500 }
    )
  }
}

