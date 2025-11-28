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
        garments(id, name, brand, thumbnail_url, color_images),
        artwork_files(*)
      `)
      .eq('id', params.id)
      .single()
    
    // Flatten garment data for easier access
    if (order && order.garments) {
      order.garment = order.garments
      delete order.garments
    }
    
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
      organization_name,
      need_by_date,
      garment_id,
      garment_color,
      size_quantities,
      print_config,
      selected_garments,
      // Payment fields
      total_cost,
      deposit_amount,
      deposit_paid,
      balance_due,
      // Invoice fields
      invoice_sent_at,
      invoice_due_date,
      // Tracking fields
      tracking_number,
      carrier
    } = body
    
    const updateData: any = {}
    if (status) updateData.status = status
    if (internal_notes !== undefined) updateData.internal_notes = internal_notes
    if (customer_name) updateData.customer_name = customer_name
    if (email) updateData.email = email
    if (phone) updateData.phone = phone
    if (shipping_address) updateData.shipping_address = shipping_address
    if (organization_name !== undefined) updateData.organization_name = organization_name || null
    if (need_by_date !== undefined) updateData.need_by_date = need_by_date || null
    if (garment_id) updateData.garment_id = garment_id
    if (garment_color) updateData.garment_color = garment_color
    if (size_quantities) updateData.size_quantities = size_quantities
    if (print_config) updateData.print_config = print_config
    if (selected_garments !== undefined) updateData.selected_garments = selected_garments
    // Payment field updates
    if (total_cost !== undefined) updateData.total_cost = total_cost
    if (deposit_amount !== undefined) updateData.deposit_amount = deposit_amount
    if (deposit_paid !== undefined) updateData.deposit_paid = deposit_paid
    if (balance_due !== undefined) updateData.balance_due = balance_due
    // Invoice field updates
    if (invoice_sent_at !== undefined) updateData.invoice_sent_at = invoice_sent_at
    if (invoice_due_date !== undefined) updateData.invoice_due_date = invoice_due_date
    // Tracking field updates
    if (tracking_number !== undefined) updateData.tracking_number = tracking_number
    if (carrier !== undefined) updateData.carrier = carrier
    
    // Get old order data for logging price adjustments
    let oldOrder = null
    if (total_cost !== undefined || deposit_amount !== undefined || balance_due !== undefined) {
      const { data } = await supabaseAdmin
        .from('orders')
        .select('total_cost, deposit_amount, balance_due')
        .eq('id', params.id)
        .single()
      oldOrder = data
    }
    
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
    
    // Log price adjustment if payment fields were changed
    if (oldOrder && (total_cost !== undefined || deposit_amount !== undefined || balance_due !== undefined)) {
      const changes: string[] = []
      if (total_cost !== undefined && oldOrder.total_cost !== total_cost) {
        changes.push(`Total: $${oldOrder.total_cost} → $${total_cost}`)
      }
      if (deposit_amount !== undefined && oldOrder.deposit_amount !== deposit_amount) {
        changes.push(`Deposit: $${oldOrder.deposit_amount} → $${deposit_amount}`)
      }
      if (balance_due !== undefined && oldOrder.balance_due !== balance_due) {
        changes.push(`Balance: $${oldOrder.balance_due} → $${balance_due}`)
      }
      
      if (changes.length > 0) {
        await supabaseAdmin
          .from('order_activity')
          .insert({
            order_id: params.id,
            activity_type: 'price_adjustment',
            description: `Price adjusted: ${changes.join(', ')}`,
            performed_by: 'admin',
            metadata: { old: oldOrder, new: { total_cost, deposit_amount, balance_due } }
          })
      }
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // First delete related artwork files
    await supabaseAdmin
      .from('artwork_files')
      .delete()
      .eq('order_id', params.id)
    
    // Delete order activity logs
    await supabaseAdmin
      .from('order_activity')
      .delete()
      .eq('order_id', params.id)
    
    // Delete the order itself
    const { error } = await supabaseAdmin
      .from('orders')
      .delete()
      .eq('id', params.id)
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting order:', error)
    return NextResponse.json(
      { error: 'Failed to delete order' },
      { status: 500 }
    )
  }
}

