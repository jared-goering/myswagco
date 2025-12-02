import { supabaseAdmin } from './supabase/server'
import { 
  ColorSizeQuantities, 
  SelectedGarments, 
  ShippingAddress,
  ArtworkTransform,
  PrintLocation,
  SizeQuantities
} from '@/types'
import { getDepositPercentage } from './pricing'
import { sendOrderConfirmationEmail, sendNewOrderAdminNotification } from './email'

// Valid size keys for SizeQuantities
type SizeKey = keyof SizeQuantities

export interface CampaignOrderData {
  id: string
  garment_id: string
  size: string
  color: string
  quantity: number
}

export interface AggregatedOrderData {
  // For single-garment campaigns
  garment_id: string
  garment_color: string
  color_size_quantities: ColorSizeQuantities
  // For multi-garment campaigns
  selected_garments: SelectedGarments
  total_quantity: number
  is_multi_garment: boolean
}

/**
 * Aggregate campaign orders into the format needed for production orders
 * Groups by garment_id, color, and size to build the proper data structures
 */
export function aggregateCampaignOrders(orders: CampaignOrderData[]): AggregatedOrderData {
  // Group by garment_id first to determine if multi-garment
  const garmentGroups: Record<string, CampaignOrderData[]> = {}
  
  orders.forEach(order => {
    const gid = order.garment_id || 'default'
    if (!garmentGroups[gid]) {
      garmentGroups[gid] = []
    }
    garmentGroups[gid].push(order)
  })
  
  const garmentIds = Object.keys(garmentGroups).filter(id => id !== 'default')
  const isMultiGarment = garmentIds.length > 1
  
  let total_quantity = 0
  const selected_garments: SelectedGarments = {}
  let color_size_quantities: ColorSizeQuantities = {}
  let garment_id = ''
  let garment_color = ''
  
  // Process each garment group
  Object.entries(garmentGroups).forEach(([gid, gOrders]) => {
    const garmentColorSizeQty: ColorSizeQuantities = {}
    const selectedColors = new Set<string>()
    
    gOrders.forEach(order => {
      const { color, size, quantity } = order
      selectedColors.add(color)
      
      if (!garmentColorSizeQty[color]) {
        garmentColorSizeQty[color] = {}
      }
      const sizeKey = size as SizeKey
      garmentColorSizeQty[color][sizeKey] = (garmentColorSizeQty[color][sizeKey] || 0) + quantity
      total_quantity += quantity
    })
    
    if (isMultiGarment || gid !== 'default') {
      // Multi-garment format
      selected_garments[gid] = {
        selectedColors: Array.from(selectedColors),
        colorSizeQuantities: garmentColorSizeQty
      }
    }
    
    // For single-garment, also populate the legacy fields
    if (!isMultiGarment) {
      garment_id = gid !== 'default' ? gid : ''
      color_size_quantities = garmentColorSizeQty
      garment_color = Array.from(selectedColors)[0] || ''
    }
  })
  
  return {
    garment_id,
    garment_color,
    color_size_quantities,
    selected_garments: isMultiGarment ? selected_garments : {},
    total_quantity,
    is_multi_garment: isMultiGarment
  }
}

export interface CreateOrderFromCampaignParams {
  campaignId: string
  campaignSlug: string
  shippingAddress: ShippingAddress
  organizerName: string
  organizerEmail: string
  organizerId: string
  paymentIntentId?: string
  isFullyPaid?: boolean // For everyone_pays campaigns where all orders are already paid
}

export interface CreateOrderFromCampaignResult {
  success: boolean
  orderId?: string
  error?: string
}

/**
 * Create a production order from a campaign's orders
 * This aggregates all campaign orders and creates a single production order
 */
export async function createOrderFromCampaign(
  params: CreateOrderFromCampaignParams
): Promise<CreateOrderFromCampaignResult> {
  const {
    campaignId,
    campaignSlug,
    shippingAddress,
    organizerName,
    organizerEmail,
    organizerId,
    paymentIntentId,
    isFullyPaid = false
  } = params
  
  try {
    // Fetch campaign data
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .select('id, name, garment_id, print_config, artwork_urls, artwork_transforms, price_per_shirt, garment_configs, payment_style')
      .eq('id', campaignId)
      .single()
    
    if (campaignError || !campaign) {
      return { success: false, error: 'Campaign not found' }
    }
    
    // Fetch all confirmed/paid orders for this campaign
    // For organizer_pays: status is 'confirmed'
    // For everyone_pays: status is 'paid'
    const validStatuses = campaign.payment_style === 'everyone_pays' 
      ? ['paid'] 
      : ['confirmed']
    
    const { data: campaignOrders, error: ordersError } = await supabaseAdmin
      .from('campaign_orders')
      .select('id, garment_id, size, color, quantity')
      .eq('campaign_id', campaignId)
      .in('status', validStatuses)
    
    if (ordersError || !campaignOrders || campaignOrders.length === 0) {
      return { success: false, error: 'No valid orders found for this campaign' }
    }
    
    // Aggregate orders
    const aggregated = aggregateCampaignOrders(
      campaignOrders.map(o => ({
        ...o,
        garment_id: o.garment_id || campaign.garment_id
      }))
    )
    
    // Calculate pricing using campaign's price_per_shirt
    // Campaigns have their own pricing that already includes everything (no setup fees)
    let totalCost = 0
    let pricingBreakdown: any = {}
    const garmentConfigs = campaign.garment_configs as Record<string, { price: number; colors: string[] }> | null
    
    if (aggregated.is_multi_garment && Object.keys(aggregated.selected_garments).length > 0 && garmentConfigs) {
      // Multi-garment campaign pricing - use per-garment prices from garment_configs
      const garmentBreakdown: any[] = []
      
      // Fetch garment names
      const garmentIds = Object.keys(aggregated.selected_garments)
      const { data: garmentsData } = await supabaseAdmin
        .from('garments')
        .select('id, name')
        .in('id', garmentIds)
      const garmentNames = Object.fromEntries((garmentsData || []).map((g: any) => [g.id, g.name]))
      
      for (const [garmentId, selection] of Object.entries(aggregated.selected_garments)) {
        let garmentQty = 0
        Object.values(selection.colorSizeQuantities).forEach(sizeQty => {
          Object.values(sizeQty).forEach(qty => { garmentQty += qty || 0 })
        })
        
        if (garmentQty > 0) {
          // Use campaign's configured price for this garment, not calculated pricing
          const garmentConfig = garmentConfigs[garmentId]
          const pricePerShirt = garmentConfig?.price || campaign.price_per_shirt
          const garmentTotal = pricePerShirt * garmentQty
          
          garmentBreakdown.push({
            garment_id: garmentId,
            name: garmentNames[garmentId] || 'Unknown',
            quantity: garmentQty,
            cost_per_shirt: pricePerShirt,
            total: garmentTotal
          })
          totalCost += garmentTotal
        }
      }
      
      pricingBreakdown = {
        garment_cost_per_shirt: totalCost / aggregated.total_quantity,
        print_cost_per_shirt: 0,
        setup_fees: 0, // No setup fees for campaigns
        total_screens: 0,
        per_shirt_total: totalCost / aggregated.total_quantity,
        garment_breakdown: garmentBreakdown,
        is_campaign_pricing: true
      }
    } else {
      // Single garment campaign pricing - use campaign's price_per_shirt directly
      totalCost = campaign.price_per_shirt * aggregated.total_quantity
      
      pricingBreakdown = {
        garment_cost_per_shirt: campaign.price_per_shirt,
        print_cost_per_shirt: 0,
        setup_fees: 0, // No setup fees for campaigns
        total_screens: 0,
        per_shirt_total: campaign.price_per_shirt,
        is_campaign_pricing: true
      }
    }
    
    // Calculate deposit and balance
    const depositPercentage = await getDepositPercentage()
    const depositAmount = Math.round(totalCost * (depositPercentage / 100) * 100) / 100
    
    // If campaign is fully paid (everyone_pays or organizer just paid), set balance to 0
    const balanceDue = isFullyPaid ? 0 : Math.round((totalCost - depositAmount) * 100) / 100
    
    // Create the production order
    const { data: newOrder, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        customer_id: organizerId,
        customer_name: organizerName,
        email: organizerEmail,
        phone: '', // Campaigns don't collect phone
        shipping_address: shippingAddress,
        organization_name: null,
        need_by_date: null,
        garment_id: aggregated.garment_id || campaign.garment_id,
        garment_color: aggregated.garment_color,
        size_quantities: {},
        color_size_quantities: aggregated.color_size_quantities,
        selected_garments: Object.keys(aggregated.selected_garments).length > 0 ? aggregated.selected_garments : null,
        total_quantity: aggregated.total_quantity,
        print_config: campaign.print_config,
        total_cost: totalCost,
        deposit_amount: depositAmount,
        deposit_paid: true, // Campaign payment covers this
        balance_due: balanceDue,
        pricing_breakdown: pricingBreakdown,
        status: 'pending_art_review',
        stripe_payment_intent_id: paymentIntentId || null,
        internal_notes: `Created from campaign: ${campaign.name} (${campaignSlug})`
      })
      .select()
      .single()
    
    if (orderError || !newOrder) {
      console.error('Error creating order from campaign:', orderError)
      return { success: false, error: 'Failed to create production order' }
    }
    
    // Create artwork_files records from campaign artwork
    const artworkUrls = campaign.artwork_urls as Record<string, string> || {}
    const artworkTransforms = campaign.artwork_transforms as Record<string, ArtworkTransform> || {}
    
    for (const [location, url] of Object.entries(artworkUrls)) {
      if (url) {
        const isVector = url.toLowerCase().endsWith('.svg') || 
                        url.toLowerCase().endsWith('.ai') ||
                        url.toLowerCase().endsWith('.eps')
        
        await supabaseAdmin
          .from('artwork_files')
          .insert({
            order_id: newOrder.id,
            location: location as PrintLocation,
            file_url: url,
            file_name: `campaign-artwork-${location}`,
            file_size: 0,
            is_vector: isVector,
            vectorization_status: isVector ? 'not_needed' : 'pending',
            transform: artworkTransforms[location] || null
          })
      }
    }
    
    // Log order creation
    await supabaseAdmin
      .from('order_activity')
      .insert({
        order_id: newOrder.id,
        activity_type: 'status_change',
        description: `Order created from campaign "${campaign.name}"`,
        performed_by: 'system'
      })
    
    // Update campaign with final_order_id and set status to completed
    await supabaseAdmin
      .from('campaigns')
      .update({ 
        final_order_id: newOrder.id,
        status: 'completed'
      })
      .eq('id', campaignId)
    
    // Send confirmation emails
    try {
      await sendOrderConfirmationEmail(
        organizerEmail,
        organizerName,
        newOrder.id,
        totalCost,
        depositAmount
      )
      
      await sendNewOrderAdminNotification(
        newOrder.id,
        organizerName,
        organizerEmail,
        totalCost,
        depositAmount,
        aggregated.total_quantity
      )
    } catch (emailError) {
      console.error('Error sending campaign order emails:', emailError)
      // Don't fail the order creation if emails fail
    }
    
    return { success: true, orderId: newOrder.id }
  } catch (error) {
    console.error('Error in createOrderFromCampaign:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

