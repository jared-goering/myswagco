import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      customer_id,
      customer_name,
      email,
      phone,
      shipping_address,
      organization_name,
      need_by_date,
      garment_id,
      color_size_quantities,
      selected_garments,
      print_config,
      artwork_data
    } = body

    // Create pending order
    const { data: pendingOrder, error } = await supabaseAdmin
      .from('pending_orders')
      .insert({
        customer_id: customer_id || null,
        customer_name,
        email,
        phone,
        shipping_address,
        organization_name: organization_name || null,
        need_by_date: need_by_date || null,
        garment_id,
        color_size_quantities,
        selected_garments: selected_garments || null,
        print_config,
        artwork_data: artwork_data || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating pending order:', error)
      throw error
    }

    return NextResponse.json(pendingOrder)
  } catch (error: any) {
    console.error('Error creating pending order:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create pending order' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const pendingOrderId = request.nextUrl.searchParams.get('id')
    
    if (!pendingOrderId) {
      return NextResponse.json(
        { error: 'Missing pending order ID' },
        { status: 400 }
      )
    }

    const { data: pendingOrder, error } = await supabaseAdmin
      .from('pending_orders')
      .select('*')
      .eq('id', pendingOrderId)
      .single()

    if (error || !pendingOrder) {
      return NextResponse.json(
        { error: 'Pending order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(pendingOrder)
  } catch (error: any) {
    console.error('Error fetching pending order:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pending order' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const pendingOrderId = request.nextUrl.searchParams.get('id')
    
    if (!pendingOrderId) {
      return NextResponse.json(
        { error: 'Missing pending order ID' },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from('pending_orders')
      .delete()
      .eq('id', pendingOrderId)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting pending order:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete pending order' },
      { status: 500 }
    )
  }
}

