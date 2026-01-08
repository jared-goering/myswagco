import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { DiscountCode } from '@/types'

// GET - List all discount codes (admin only)
export async function GET(request: NextRequest) {
  try {
    const { data: codes, error } = await supabaseAdmin
      .from('discount_codes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching discount codes:', error)
      return NextResponse.json({ error: 'Failed to fetch discount codes' }, { status: 500 })
    }

    return NextResponse.json(codes)
  } catch (error) {
    console.error('Error in GET /api/discount-codes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new discount code
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, description, discount_type, discount_value, active, expires_at } = body

    // Validation
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 })
    }

    if (!discount_type || !['percentage', 'fixed'].includes(discount_type)) {
      return NextResponse.json({ error: 'Invalid discount type. Must be "percentage" or "fixed"' }, { status: 400 })
    }

    if (typeof discount_value !== 'number' || discount_value <= 0) {
      return NextResponse.json({ error: 'Discount value must be a positive number' }, { status: 400 })
    }

    if (discount_type === 'percentage' && discount_value > 100) {
      return NextResponse.json({ error: 'Percentage discount cannot exceed 100%' }, { status: 400 })
    }

    // Normalize code to uppercase
    const normalizedCode = code.trim().toUpperCase()

    // Check if code already exists
    const { data: existing } = await supabaseAdmin
      .from('discount_codes')
      .select('id')
      .eq('code', normalizedCode)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'A discount code with this code already exists' }, { status: 400 })
    }

    const { data: newCode, error } = await supabaseAdmin
      .from('discount_codes')
      .insert({
        code: normalizedCode,
        description: description || null,
        discount_type,
        discount_value,
        active: active !== false, // Default to true
        expires_at: expires_at || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating discount code:', error)
      return NextResponse.json({ error: 'Failed to create discount code' }, { status: 500 })
    }

    return NextResponse.json(newCode, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/discount-codes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update a discount code
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Discount code ID is required' }, { status: 400 })
    }

    // Validate updates if provided
    if (updates.discount_type && !['percentage', 'fixed'].includes(updates.discount_type)) {
      return NextResponse.json({ error: 'Invalid discount type' }, { status: 400 })
    }

    if (updates.discount_value !== undefined && (typeof updates.discount_value !== 'number' || updates.discount_value <= 0)) {
      return NextResponse.json({ error: 'Discount value must be a positive number' }, { status: 400 })
    }

    if (updates.discount_type === 'percentage' && updates.discount_value > 100) {
      return NextResponse.json({ error: 'Percentage discount cannot exceed 100%' }, { status: 400 })
    }

    // Normalize code if provided
    if (updates.code) {
      updates.code = updates.code.trim().toUpperCase()

      // Check if new code already exists (excluding current record)
      const { data: existing } = await supabaseAdmin
        .from('discount_codes')
        .select('id')
        .eq('code', updates.code)
        .neq('id', id)
        .single()

      if (existing) {
        return NextResponse.json({ error: 'A discount code with this code already exists' }, { status: 400 })
      }
    }

    const { data: updated, error } = await supabaseAdmin
      .from('discount_codes')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating discount code:', error)
      return NextResponse.json({ error: 'Failed to update discount code' }, { status: 500 })
    }

    if (!updated) {
      return NextResponse.json({ error: 'Discount code not found' }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error in PATCH /api/discount-codes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a discount code
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Discount code ID is required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('discount_codes')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting discount code:', error)
      return NextResponse.json({ error: 'Failed to delete discount code' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/discount-codes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}





