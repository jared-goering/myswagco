// Core data models

export type FitType = 'unisex' | 'womens' | 'mens' | 'youth'

export interface Garment {
  id: string
  name: string
  brand: string
  description: string
  category: string | null
  active: boolean
  base_cost: number
  customer_price?: number // Calculated price with markup applied
  markup_percentage?: number // The markup percentage from pricing tier
  thumbnail_url: string | null
  available_colors: string[]
  color_images: Record<string, string> // Maps color name to front image URL
  color_back_images?: Record<string, string> // Maps color name to back image URL
  size_range: string[]
  pricing_tier_id: string
  ss_style_id?: string | null // S&S Activewear style ID for inventory lookups
  supplier_source?: string | null // Origin supplier: 'ssactivewear', 'ascolour', 'manual', etc.
  fit_type?: FitType // Fit type: unisex, womens, mens
  created_at: string
  updated_at: string
}

// S&S Activewear inventory types
export type SupplierSource = 'ssactivewear' | 'ascolour' | 'manual' | string

export interface InventoryLevel {
  [size: string]: number // e.g., { "S": 1500, "M": 2300, "L": 1800 }
}

export interface GarmentInventory {
  supplier: SupplierSource | null
  has_inventory: boolean
  inventory: Record<string, InventoryLevel> // Maps color name to size inventory
  last_updated?: string
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

// Maps color name to size quantities for multi-color orders
export type ColorSizeQuantities = Record<string, SizeQuantities>

// Multi-garment selection for orders with multiple styles
export interface GarmentSelection {
  selectedColors: string[]
  colorSizeQuantities: ColorSizeQuantities
}

// Maps garment ID to its selection (colors, sizes, quantities)
export type SelectedGarments = Record<string, GarmentSelection>

// Multi-garment quote request
export interface MultiGarmentQuoteRequest {
  garments: {
    garment_id: string
    quantity: number
  }[]
  print_config: PrintConfig
}

// Multi-garment quote response with per-garment breakdown
export interface MultiGarmentQuoteResponse {
  garment_breakdown: {
    garment_id: string
    quantity: number
    garment_cost: number
    garment_cost_per_shirt: number
  }[]
  total_quantity: number
  garment_cost: number
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
  customer_id?: string // Link to customer account (optional for guest checkout)
  customer_name: string
  email: string
  phone: string
  shipping_address: ShippingAddress
  organization_name?: string
  need_by_date?: string
  
  garment_id: string
  garment_color: string // Legacy - kept for backwards compatibility
  size_quantities: SizeQuantities // Legacy - kept for backwards compatibility
  color_size_quantities?: ColorSizeQuantities // New multi-color support
  selected_garments?: SelectedGarments // Multi-garment order support
  total_quantity: number
  
  print_config: PrintConfig
  
  total_cost: number
  deposit_amount: number
  deposit_paid: boolean
  balance_due: number
  
  // Discount fields
  discount_code_id?: string
  discount_amount?: number
  
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

export type VectorizationStatus = 'not_needed' | 'pending' | 'processing' | 'completed' | 'failed'

export interface ArtworkFile {
  id: string
  order_id: string
  location: PrintLocation
  file_url: string
  vectorized_file_url?: string | null
  is_vector: boolean
  vectorization_status: VectorizationStatus
  file_name: string
  file_size: number
  transform?: ArtworkTransform // Position, scale, and rotation data
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

// Discount Codes
export type DiscountType = 'percentage' | 'fixed'

export interface DiscountCode {
  id: string
  code: string
  description?: string
  discount_type: DiscountType
  discount_value: number
  active: boolean
  expires_at?: string | null
  created_at: string
  updated_at: string
}

export interface AppliedDiscount {
  code: string
  discount_type: DiscountType
  discount_value: number
  discount_amount: number // Actual amount discounted from order
}

// Customer Authentication Types
export interface Customer {
  id: string
  email: string
  name?: string
  phone?: string
  organization_name?: string
  default_shipping_address?: ShippingAddress
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface SavedArtwork {
  id: string
  customer_id: string
  name: string
  image_url: string
  thumbnail_url?: string
  prompt?: string
  is_ai_generated: boolean
  metadata?: {
    colors?: string[]
    width?: number
    height?: number
    file_size?: number
    is_vector?: boolean
    original_filename?: string
  }
  created_at: string
  updated_at: string
}

// Order Draft Types (for resumable orders)
export interface OrderDraft {
  id: string
  customer_id: string
  name?: string // User-friendly name like "Blue T-Shirt Draft"
  
  // Garment selection (legacy single-garment)
  garment_id?: string
  selected_colors: string[]
  
  // Multi-garment selection (new)
  selected_garments?: SelectedGarments
  
  // Size and quantities (legacy single-garment)
  color_size_quantities: ColorSizeQuantities
  
  // Print configuration
  print_config: PrintConfig
  
  // Artwork references and transforms
  artwork_file_records: { [location: string]: ArtworkFile | null }
  artwork_transforms: { [location: string]: ArtworkTransform }
  vectorized_svg_data: { [location: string]: string | null }
  
  // Customer info (partial)
  customer_name?: string
  email?: string
  phone?: string
  organization_name?: string
  need_by_date?: string
  shipping_address?: ShippingAddress
  
  // Quote snapshot
  quote?: QuoteResponse
  
  // Text description for artwork
  text_description?: string
  
  // Timestamps
  created_at: string
  updated_at: string
  
  // Joined data (from API)
  garment?: Garment
}

export interface OrderDraftInput {
  garment_id?: string | null
  selected_colors: string[]
  selected_garments?: SelectedGarments
  color_size_quantities: ColorSizeQuantities
  print_config: PrintConfig
  artwork_file_records: { [location: string]: ArtworkFile | null }
  artwork_transforms: { [location: string]: ArtworkTransform }
  vectorized_svg_data: { [location: string]: string | null }
  customer_name?: string
  email?: string
  phone?: string
  organization_name?: string
  need_by_date?: string
  shipping_address?: ShippingAddress
  quote?: QuoteResponse | null
  text_description?: string
}

