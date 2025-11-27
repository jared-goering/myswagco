import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        garments(name, brand, thumbnail_url),
        artwork_files(*)
      `)
      .eq('id', params.id)
      .single()
    
    if (error) {
      throw error
    }
    
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(order)
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order' },
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
    const { 
      status, 
      internal_notes, 
      customer_name, 
      email, 
      phone, 
      shipping_address,
      garment_id,
      garment_color,
      size_quantities,
      print_config,
      selected_garments
    } = body
    
    const updateData: any = {}
    if (status) updateData.status = status
    if (internal_notes !== undefined) updateData.internal_notes = internal_notes
    if (customer_name) updateData.customer_name = customer_name
    if (email) updateData.email = email
    if (phone) updateData.phone = phone
    if (shipping_address) updateData.shipping_address = shipping_address
    if (garment_id) updateData.garment_id = garment_id
    if (garment_color) updateData.garment_color = garment_color
    if (size_quantities) updateData.size_quantities = size_quantities
    if (print_config) updateData.print_config = print_config
    if (selected_garments !== undefined) updateData.selected_garments = selected_garments
    
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()
    
    if (error) {
      throw error
    }
    
    // Log status change
    if (status) {
      await supabaseAdmin
        .from('order_activity')
        .insert({
          order_id: params.id,
          activity_type: 'status_change',
          description: `Status changed to ${status}`,
          performed_by: 'admin'
        })
    }
    
    return NextResponse.json(order)
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    )
  }
}

