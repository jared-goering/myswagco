import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase/server'
import { CampaignCreateInput, PrintConfig } from '@/types'
import { calculateCampaignPricePerShirt } from '@/lib/pricing'

// Force dynamic rendering for routes using cookies/auth
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

// Helper to get current user
async function getCurrentUser() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.delete({ name, ...options })
        },
      },
    }
  )
  
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Generate a unique slug from campaign name
function generateSlug(name: string): string {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50)
  
  // Add random suffix for uniqueness
  const randomSuffix = Math.random().toString(36).substring(2, 8)
  return `${baseSlug}-${randomSuffix}`
}

// POST - Create a new campaign
export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required to create a campaign' },
        { status: 401 }
      )
    }
    
    const body: CampaignCreateInput = await request.json()
    
    // Validate required fields
    // Either garment_id (single-style) or garment_configs (multi-style) must be provided
    const hasGarmentConfigs = body.garment_configs && Object.keys(body.garment_configs).length > 0
    const hasSingleGarment = body.garment_id
    
    if (!body.name || !body.deadline || !body.print_config) {
      return NextResponse.json(
        { error: 'Missing required fields: name, deadline, print_config' },
        { status: 400 }
      )
    }
    
    if (!hasGarmentConfigs && !hasSingleGarment) {
      return NextResponse.json(
        { error: 'Either garment_id or garment_configs must be provided' },
        { status: 400 }
      )
    }
    
    // Determine primary garment_id and build garment_configs for storage
    let primaryGarmentId: string
    let garmentConfigs: Record<string, { price: number; colors: string[] }>
    let selectedColors: string[]
    let pricePerShirt: number
    
    if (hasGarmentConfigs) {
      // Multi-garment mode: use garment_configs directly
      garmentConfigs = body.garment_configs!
      const garmentIds = Object.keys(garmentConfigs)
      primaryGarmentId = garmentIds[0] // First garment as primary (for backwards compat)
      
      // Aggregate all colors across all garments for the selected_colors field
      selectedColors = [...new Set(garmentIds.flatMap(id => garmentConfigs[id].colors))]
      
      // Check if we need to recalculate prices (if prices are 0 or all the same old-style averaged price)
      const prices = garmentIds.map(id => garmentConfigs[id].price)
      const allZero = prices.every(p => p === 0)
      const allSame = prices.length > 1 && prices.every(p => p === prices[0])
      
      if (allZero || allSame) {
        // Recalculate per-garment prices server-side using campaign pricing
        console.log('Recalculating campaign prices for garments:', garmentIds)
        for (const garmentId of garmentIds) {
          try {
            const { pricePerShirt: calculatedPrice } = await calculateCampaignPricePerShirt(
              garmentId,
              body.print_config
            )
            garmentConfigs[garmentId].price = calculatedPrice
          } catch (err) {
            console.error(`Failed to calculate price for garment ${garmentId}:`, err)
            // Keep the original price if calculation fails
          }
        }
      }
      
      // Use the first garment's price as the legacy price_per_shirt
      pricePerShirt = garmentConfigs[primaryGarmentId].price
    } else {
      // Single-garment mode: build garment_configs from legacy fields
      primaryGarmentId = body.garment_id!
      selectedColors = body.selected_colors || []
      pricePerShirt = body.price_per_shirt || 0
      
      // If price is 0 or not provided, calculate it server-side
      if (pricePerShirt === 0) {
        try {
          const { pricePerShirt: calculatedPrice } = await calculateCampaignPricePerShirt(
            primaryGarmentId,
            body.print_config
          )
          pricePerShirt = calculatedPrice
        } catch (err) {
          console.error(`Failed to calculate price for garment ${primaryGarmentId}:`, err)
          // Keep 0 if calculation fails
        }
      }
      
      garmentConfigs = {
        [primaryGarmentId]: {
          price: pricePerShirt,
          colors: selectedColors
        }
      }
    }
    
    // Generate unique slug
    let slug = generateSlug(body.name)
    let slugAttempts = 0
    
    // Check if slug exists and regenerate if needed
    while (slugAttempts < 5) {
      const { data: existing } = await supabaseAdmin
        .from('campaigns')
        .select('id')
        .eq('slug', slug)
        .single()
      
      if (!existing) break
      
      slug = generateSlug(body.name)
      slugAttempts++
    }
    
    // Get customer info for organizer details
    const { data: customer } = await supabaseAdmin
      .from('customers')
      .select('name, email')
      .eq('id', user.id)
      .single()
    
    // Create the campaign
    const { data: campaign, error } = await supabaseAdmin
      .from('campaigns')
      .insert({
        slug,
        organizer_id: user.id,
        name: body.name,
        deadline: body.deadline,
        payment_style: body.payment_style || 'everyone_pays',
        status: 'active',
        garment_id: primaryGarmentId,
        selected_colors: selectedColors,
        garment_configs: garmentConfigs,
        print_config: body.print_config,
        artwork_urls: body.artwork_urls || {},
        artwork_transforms: body.artwork_transforms || {},
        price_per_shirt: pricePerShirt,
        organizer_name: body.organizer_name || customer?.name || null,
        organizer_email: body.organizer_email || customer?.email || user.email,
        mockup_image_url: body.mockup_image_url || null,
        mockup_image_urls: body.mockup_image_urls || {},
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating campaign:', error)
      return NextResponse.json(
        { error: 'Failed to create campaign' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(campaign)
  } catch (error: any) {
    console.error('Error in campaign creation:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// GET - List campaigns for authenticated user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    
    let query = supabaseAdmin
      .from('campaigns')
      .select(`
        *,
        garments(id, name, brand, thumbnail_url, base_cost, color_images, available_colors, size_range)
      `)
      .eq('organizer_id', user.id)
      .order('created_at', { ascending: false })
    
    if (status) {
      query = query.eq('status', status)
    }
    
    const { data: campaigns, error } = await query
    
    if (error) {
      console.error('Error fetching campaigns:', error)
      return NextResponse.json(
        { error: 'Failed to fetch campaigns' },
        { status: 500 }
      )
    }
    
    // Collect all garment IDs from garment_configs for multi-garment campaigns
    const allGarmentIds = new Set<string>()
    campaigns.forEach(campaign => {
      if (campaign.garment_configs) {
        Object.keys(campaign.garment_configs).forEach(id => allGarmentIds.add(id))
      }
      if (campaign.garment_id) {
        allGarmentIds.add(campaign.garment_id)
      }
    })
    
    // Fetch all garments at once
    let garmentsMap: Record<string, any> = {}
    if (allGarmentIds.size > 0) {
      const { data: garments } = await supabaseAdmin
        .from('garments')
        .select('id, name, brand, thumbnail_url, base_cost, color_images, available_colors, size_range')
        .in('id', Array.from(allGarmentIds))
      
      if (garments) {
        garments.forEach(g => { garmentsMap[g.id] = g })
      }
    }
    
    // Attach garments array to campaigns with garment_configs
    campaigns.forEach(campaign => {
      if (campaign.garment_configs && Object.keys(campaign.garment_configs).length > 0) {
        campaign.garments = Object.keys(campaign.garment_configs)
          .map(id => garmentsMap[id])
          .filter(Boolean)
      }
      // Ensure single garment is also populated
      if (campaign.garment_id && garmentsMap[campaign.garment_id]) {
        campaign.garment = garmentsMap[campaign.garment_id]
      }
    })
    
    // Get order counts and paid amounts for each campaign
    const campaignIds = campaigns.map(c => c.id)
    
    if (campaignIds.length > 0) {
      // Fetch all orders to filter based on each campaign's payment_style
      const { data: allOrders } = await supabaseAdmin
        .from('campaign_orders')
        .select('campaign_id, status, amount_paid, stripe_payment_intent_id')
        .in('campaign_id', campaignIds)
      
      // Build a map of campaign id to payment_style for quick lookup
      const paymentStyleMap: Record<string, string> = {}
      campaigns.forEach(c => {
        paymentStyleMap[c.id] = c.payment_style
      })
      
      // Count orders and sum paid amounts based on payment_style
      const countMap: Record<string, number> = {}
      const paidAmountMap: Record<string, number> = {}
      const paidOrderCountMap: Record<string, number> = {}
      
      allOrders?.forEach(order => {
        const paymentStyle = paymentStyleMap[order.campaign_id]
        // For 'everyone_pays' only count paid orders
        // For 'organizer_pays' count all non-cancelled orders
        const shouldCount = paymentStyle === 'everyone_pays'
          ? order.status === 'paid'
          : order.status !== 'cancelled'
        
        if (shouldCount) {
          countMap[order.campaign_id] = (countMap[order.campaign_id] || 0) + 1
        }
        
        // Track paid orders with payment intents (for refund calculation)
        if (order.status === 'paid' && order.stripe_payment_intent_id) {
          paidAmountMap[order.campaign_id] = (paidAmountMap[order.campaign_id] || 0) + (order.amount_paid || 0)
          paidOrderCountMap[order.campaign_id] = (paidOrderCountMap[order.campaign_id] || 0) + 1
        }
      })
      
      // Add order counts and paid info to campaigns
      campaigns.forEach(campaign => {
        campaign.order_count = countMap[campaign.id] || 0
        campaign.total_paid = paidAmountMap[campaign.id] || 0
        campaign.paid_order_count = paidOrderCountMap[campaign.id] || 0
      })
    }
    
    return NextResponse.json(campaigns)
  } catch (error: any) {
    console.error('Error in campaign list:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

