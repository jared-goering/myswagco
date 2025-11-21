// Core data models

export interface Garment {
  id: string
  name: string
  brand: string
  description: string
  active: boolean
  base_cost: number
  thumbnail_url: string | null
  available_colors: string[]
  size_range: string[]
  pricing_tier_id: string
  created_at: string
  updated_at: string
}

export interface PricingTier {
  id: string
  name: string
  min_qty: number
  max_qty: number | null
  garment_markup_percentage: number
  created_at: string
  updated_at: string
}

export interface PrintPricing {
  id: string
  tier_id: string
  num_colors: number
  cost_per_shirt: number
  setup_fee_per_screen: number
  created_at: string
  updated_at: string
}

export type PrintLocation = 'front' | 'back' | 'left_chest' | 'right_chest' | 'full_back'

export interface PrintConfig {
  locations: {
    [key in PrintLocation]?: {
      enabled: boolean
      num_colors: number
    }
  }
}

export interface SizeQuantities {
  XS?: number
  S?: number
  M?: number
  L?: number
  XL?: number
  '2XL'?: number
  '3XL'?: number
}

export type OrderStatus = 
  | 'pending_art_review'
  | 'art_approved'
  | 'art_revision_needed'
  | 'in_production'
  | 'balance_due'
  | 'ready_to_ship'
  | 'completed'
  | 'cancelled'

export interface Order {
  id: string
  customer_name: string
  email: string
  phone: string
  shipping_address: ShippingAddress
  organization_name?: string
  need_by_date?: string
  
  garment_id: string
  garment_color: string
  size_quantities: SizeQuantities
  total_quantity: number
  
  print_config: PrintConfig
  
  total_cost: number
  deposit_amount: number
  deposit_paid: boolean
  balance_due: number
  
  status: OrderStatus
  internal_notes?: string
  
  created_at: string
  updated_at: string
}

export interface ShippingAddress {
  line1: string
  line2?: string
  city: string
  state: string
  postal_code: string
  country: string
}

export interface ArtworkTransform {
  x: number
  y: number
  scale: number
  rotation: number
}

export interface ArtworkFile {
  id: string
  order_id: string
  location: PrintLocation
  file_url: string
  file_name: string
  file_size: number
  created_at: string
}

export interface QuoteRequest {
  garment_id: string
  quantity: number
  print_config: PrintConfig
}

export interface QuoteResponse {
  garment_cost: number
  garment_cost_per_shirt: number
  print_cost: number
  print_cost_per_shirt: number
  setup_fees: number
  total_screens: number
  subtotal: number
  total: number
  per_shirt_price: number
  deposit_amount: number
  balance_due: number
}

export interface AppConfig {
  id: string
  deposit_percentage: number
  min_order_quantity: number
  max_ink_colors: number
  updated_at: string
}

