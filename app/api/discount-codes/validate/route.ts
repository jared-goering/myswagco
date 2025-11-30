import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { DiscountCode, AppliedDiscount } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, subtotal } = body

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Discount code is required' }, { status: 400 })
    }

    if (typeof subtotal !== 'number' || subtotal <= 0) {
      return NextResponse.json({ error: 'Valid subtotal is required' }, { status: 400 })
    }

    // Normalize and lookup the code
    const normalizedCode = code.trim().toUpperCase()

    const { data: discountCode, error } = await supabaseAdmin
      .from('discount_codes')
      .select('*')
      .eq('code', normalizedCode)
      .single()

    if (error || !discountCode) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Invalid discount code' 
      }, { status: 400 })
    }

    // Check if code is active
    if (!discountCode.active) {
      return NextResponse.json({ 
        valid: false, 
        error: 'This discount code is no longer active' 
      }, { status: 400 })
    }

    // Check if code has expired
    if (discountCode.expires_at) {
      const expirationDate = new Date(discountCode.expires_at)
      if (expirationDate < new Date()) {
        return NextResponse.json({ 
          valid: false, 
          error: 'This discount code has expired' 
        }, { status: 400 })
      }
    }

    // Calculate the discount amount
    let discountAmount: number
    if (discountCode.discount_type === 'percentage') {
      discountAmount = Math.round((subtotal * discountCode.discount_value / 100) * 100) / 100
    } else {
      // Fixed amount - cannot exceed subtotal
      discountAmount = Math.min(discountCode.discount_value, subtotal)
    }

    const appliedDiscount: AppliedDiscount = {
      code: discountCode.code,
      discount_type: discountCode.discount_type,
      discount_value: discountCode.discount_value,
      discount_amount: discountAmount
    }

    return NextResponse.json({
      valid: true,
      discount: appliedDiscount,
      discount_code_id: discountCode.id,
      message: discountCode.discount_type === 'percentage' 
        ? `${discountCode.discount_value}% discount applied!`
        : `$${discountAmount.toFixed(2)} discount applied!`
    })
  } catch (error) {
    console.error('Error validating discount code:', error)
    return NextResponse.json({ error: 'Failed to validate discount code' }, { status: 500 })
  }
}


