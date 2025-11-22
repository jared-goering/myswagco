import { PrintConfig, QuoteResponse } from '@/types'
import { supabaseAdmin } from './supabase/server'

/**
 * Calculate the total number of screens needed based on print configuration
 */
export function calculateTotalScreens(printConfig: PrintConfig): number {
  let totalScreens = 0
  
  Object.values(printConfig.locations).forEach(location => {
    if (location && location.enabled) {
      totalScreens += location.num_colors
    }
  })
  
  return totalScreens
}

/**
 * Calculate the number of active print locations
 */
export function calculateActiveLocations(printConfig: PrintConfig): number {
  return Object.values(printConfig.locations).filter(
    location => location && location.enabled
  ).length
}

/**
 * Get the pricing tier for a given quantity
 */
export async function getPricingTierForQuantity(quantity: number) {
  const { data: tier, error } = await supabaseAdmin
    .from('pricing_tiers')
    .select('*')
    .lte('min_qty', quantity)
    .or(`max_qty.gte.${quantity},max_qty.is.null`)
    .order('min_qty', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    console.error('Error fetching pricing tier:', error)
    throw new Error('Unable to fetch pricing tier')
  }

  return tier
}

/**
 * Calculate garment cost based on quantity and garment
 */
export async function calculateGarmentCost(
  garmentId: string,
  quantity: number
): Promise<{ totalCost: number; costPerShirt: number }> {
  // Fetch garment
  const { data: garment, error: garmentError } = await supabaseAdmin
    .from('garments')
    .select('base_cost, pricing_tier_id')
    .eq('id', garmentId)
    .single()

  if (garmentError || !garment) {
    throw new Error('Garment not found')
  }

  // Fetch pricing tier
  const { data: tier, error: tierError } = await supabaseAdmin
    .from('pricing_tiers')
    .select('garment_markup_percentage')
    .eq('id', garment.pricing_tier_id)
    .lte('min_qty', quantity)
    .or(`max_qty.gte.${quantity},max_qty.is.null`)
    .order('min_qty', { ascending: false })
    .limit(1)
    .single()

  if (tierError || !tier) {
    // Fallback to default markup if no tier found
    const costPerShirt = garment.base_cost * 1.5 // 50% markup
    return {
      totalCost: costPerShirt * quantity,
      costPerShirt
    }
  }

  const markupMultiplier = 1 + (tier.garment_markup_percentage / 100)
  const costPerShirt = garment.base_cost * markupMultiplier

  return {
    totalCost: costPerShirt * quantity,
    costPerShirt
  }
}

/**
 * Calculate print cost based on quantity, number of colors, and locations
 */
export async function calculatePrintCost(
  quantity: number,
  printConfig: PrintConfig
): Promise<{ totalCost: number; costPerShirt: number; setupFees: number; totalScreens: number }> {
  const tier = await getPricingTierForQuantity(quantity)
  const totalScreens = calculateTotalScreens(printConfig)
  const activeLocations = calculateActiveLocations(printConfig)

  if (totalScreens === 0) {
    return {
      totalCost: 0,
      costPerShirt: 0,
      setupFees: 0,
      totalScreens: 0
    }
  }

  // Get max colors to determine pricing
  const maxColors = Math.max(
    ...Object.values(printConfig.locations)
      .filter(loc => loc && loc.enabled)
      .map(loc => loc!.num_colors)
  )

  // Fetch print pricing for this tier and color count
  const { data: printPricing, error } = await supabaseAdmin
    .from('print_pricing')
    .select('*')
    .eq('tier_id', tier.id)
    .eq('num_colors', maxColors)
    .single()

  if (error || !printPricing) {
    // Fallback pricing
    const costPerShirt = maxColors * 0.5 * activeLocations
    const setupFee = totalScreens * 25
    return {
      totalCost: (costPerShirt * quantity) + setupFee,
      costPerShirt,
      setupFees: setupFee,
      totalScreens
    }
  }

  const costPerShirt = printPricing.cost_per_shirt * activeLocations
  const setupFees = totalScreens * printPricing.setup_fee_per_screen

  return {
    totalCost: (costPerShirt * quantity) + setupFees,
    costPerShirt,
    setupFees,
    totalScreens
  }
}

/**
 * Get the deposit percentage from app configuration
 */
export async function getDepositPercentage(): Promise<number> {
  const { data: config, error } = await supabaseAdmin
    .from('app_config')
    .select('deposit_percentage')
    .single()

  if (error || !config) {
    return 50 // Default to 50%
  }

  return config.deposit_percentage
}

/**
 * Calculate a complete quote for an order
 */
export async function calculateQuote(
  garmentId: string,
  quantity: number,
  printConfig: PrintConfig
): Promise<QuoteResponse> {
  // Calculate garment cost
  const { totalCost: garmentCost, costPerShirt: garmentCostPerShirt } = 
    await calculateGarmentCost(garmentId, quantity)

  // Calculate print cost
  const { totalCost: printCost, costPerShirt: printCostPerShirt, setupFees, totalScreens } = 
    await calculatePrintCost(quantity, printConfig)

  // Calculate totals
  const subtotal = garmentCost + printCost
  const total = subtotal

  // Calculate deposit
  const depositPercentage = await getDepositPercentage()
  const depositAmount = total * (depositPercentage / 100)
  const balanceDue = total - depositAmount

  return {
    garment_cost: garmentCost,
    garment_cost_per_shirt: garmentCostPerShirt,
    print_cost: printCost - setupFees,
    print_cost_per_shirt: printCostPerShirt,
    setup_fees: setupFees,
    total_screens: totalScreens,
    subtotal,
    total,
    per_shirt_price: total / quantity,
    deposit_amount: Math.round(depositAmount * 100) / 100,
    balance_due: Math.round(balanceDue * 100) / 100
  }
}

/**
 * Helper to calculate total quantity from size quantities
 */
export function calculateTotalQuantity(sizeQuantities: Record<string, number>): number {
  return Object.values(sizeQuantities).reduce((sum, qty) => sum + (qty || 0), 0)
}

/**
 * Helper to calculate total quantity from color-size quantities
 */
export function calculateTotalQuantityFromColors(colorSizeQuantities: Record<string, Record<string, number>>): number {
  let total = 0
  Object.values(colorSizeQuantities).forEach(sizeQty => {
    total += calculateTotalQuantity(sizeQty)
  })
  return total
}

