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
    const { status, internal_notes } = body
    
    const updateData: any = {}
    if (status) updateData.status = status
    if (internal_notes !== undefined) updateData.internal_notes = internal_notes
    
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

