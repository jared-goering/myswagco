import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

// GET - Fetch single campaign with full details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    
    // Fetch campaign with garment data
    const { data: campaign, error } = await supabaseAdmin
      .from('campaigns')
      .select(`
        *,
        garments(id, name, brand, thumbnail_url, available_colors, size_range, color_images)
      `)
      .eq('id', id)
      .single()
    
    if (error || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }
    
    // Collect all garment IDs from garment_configs for multi-garment campaigns
    const allGarmentIds = new Set<string>()
    if (campaign.garment_configs) {
      Object.keys(campaign.garment_configs).forEach(gid => allGarmentIds.add(gid))
    }
    if (campaign.garment_id) {
      allGarmentIds.add(campaign.garment_id)
    }
    
    // Fetch all garments at once
    let garmentsMap: Record<string, any> = {}
    if (allGarmentIds.size > 0) {
      const { data: garments } = await supabaseAdmin
        .from('garments')
        .select('id, name, brand, thumbnail_url, available_colors, size_range, color_images')
        .in('id', Array.from(allGarmentIds))
      
      if (garments) {
        garments.forEach(g => { garmentsMap[g.id] = g })
      }
    }
    
    // Attach garments array to campaign
    if (campaign.garment_configs && Object.keys(campaign.garment_configs).length > 0) {
      campaign.garments = Object.keys(campaign.garment_configs)
        .map(gid => garmentsMap[gid])
        .filter(Boolean)
    }
    if (campaign.garment_id && garmentsMap[campaign.garment_id]) {
      campaign.garment = garmentsMap[campaign.garment_id]
    }
    
    // Get order stats
    const { data: orders } = await supabaseAdmin
      .from('campaign_orders')
      .select('status, quantity, amount_paid')
      .eq('campaign_id', id)
    
    let order_count = 0
    let total_quantity = 0
    let total_revenue = 0
    let pending_count = 0
    
    orders?.forEach(order => {
      const isPaid = order.status === 'paid'
      const shouldCount = campaign.payment_style === 'everyone_pays'
        ? isPaid
        : order.status !== 'cancelled'
      
      if (shouldCount) {
        order_count++
        total_quantity += order.quantity || 0
      }
      
      if (campaign.payment_style === 'everyone_pays' && order.status === 'pending') {
        pending_count++
      }
      
      if (isPaid && order.amount_paid) {
        total_revenue += order.amount_paid
      }
    })
    
    campaign.order_count = order_count
    campaign.total_quantity = total_quantity
    campaign.total_revenue = total_revenue
    campaign.pending_count = pending_count
    
    return NextResponse.json(campaign)
  } catch (error: any) {
    console.error('Error fetching campaign:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// PATCH - Update campaign details
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    
    // Allowed fields to update
    const allowedFields = [
      'name',
      'deadline',
      'status',
      'price_per_shirt',
      'organizer_name',
      'organizer_email',
      'selected_colors',
      'payment_style',
      'garment_configs', // Allow direct update of garment_configs for multi-garment campaigns
      'garment_id', // Allow updating primary garment when styles change
    ]
    
    // Build update object with only allowed fields
    const updates: Record<string, any> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }
    
    // If garment_configs is provided, ensure garment_id is in sync
    if (body.garment_configs && !body.garment_id) {
      // Set garment_id to the first garment in configs for backwards compatibility
      const configIds = Object.keys(body.garment_configs)
      if (configIds.length > 0) {
        updates.garment_id = configIds[0]
      }
    }
    
    // If garment_configs is not provided, sync it with single-garment fields
    if (!body.garment_configs) {
      // Also update garment_configs if selected_colors changed and we have a garment_id
      if (body.selected_colors && body.garment_id) {
        // Fetch current campaign to get existing garment_configs structure
        const { data: current } = await supabaseAdmin
          .from('campaigns')
          .select('garment_configs, price_per_shirt')
          .eq('id', id)
          .single()
        
        if (current?.garment_configs) {
          // Update the colors in the garment_configs for the primary garment
          const updatedConfigs = { ...current.garment_configs }
          if (updatedConfigs[body.garment_id]) {
            updatedConfigs[body.garment_id] = {
              ...updatedConfigs[body.garment_id],
              colors: body.selected_colors
            }
          }
          updates.garment_configs = updatedConfigs
        }
      }
      
      // Update price in garment_configs if price_per_shirt changed
      if (body.price_per_shirt !== undefined && !updates.garment_configs) {
        const { data: current } = await supabaseAdmin
          .from('campaigns')
          .select('garment_configs, garment_id')
          .eq('id', id)
          .single()
        
        if (current?.garment_configs && current.garment_id) {
          const updatedConfigs = { ...current.garment_configs }
          if (updatedConfigs[current.garment_id]) {
            updatedConfigs[current.garment_id] = {
              ...updatedConfigs[current.garment_id],
              price: body.price_per_shirt
            }
          }
          updates.garment_configs = updatedConfigs
        }
      }
    }
    
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }
    
    // Add updated_at timestamp
    updates.updated_at = new Date().toISOString()
    
    const { data: campaign, error } = await supabaseAdmin
      .from('campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating campaign:', error)
      return NextResponse.json(
        { error: 'Failed to update campaign' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(campaign)
  } catch (error: any) {
    console.error('Error updating campaign:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

