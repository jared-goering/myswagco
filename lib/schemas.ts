import { z } from 'zod'

// Print location schema
export const printLocationSchema = z.enum(['front', 'back', 'left_chest', 'right_chest', 'full_back'])

// Print config schema
export const printConfigSchema = z.object({
  locations: z.record(
    printLocationSchema,
    z.object({
      enabled: z.boolean(),
      num_colors: z.number().min(1).max(4)
    })
  )
})

// Size quantities schema
export const sizeQuantitiesSchema = z.object({
  XS: z.number().min(0).optional(),
  S: z.number().min(0).optional(),
  M: z.number().min(0).optional(),
  L: z.number().min(0).optional(),
  XL: z.number().min(0).optional(),
  '2XL': z.number().min(0).optional(),
  '3XL': z.number().min(0).optional(),
})

// Color size quantities schema (maps color names to size quantities)
export const colorSizeQuantitiesSchema = z.record(z.string(), sizeQuantitiesSchema)

// Shipping address schema
export const shippingAddressSchema = z.object({
  line1: z.string().min(1, 'Address is required'),
  line2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State is required'),
  postal_code: z.string().min(5, 'Postal code is required'),
  country: z.string().min(2, 'Country is required'),
})

// Quote request schema
export const quoteRequestSchema = z.object({
  garment_id: z.string().uuid(),
  quantity: z.number().min(24, 'Minimum order quantity is 24'),
  print_config: printConfigSchema
})

// Customer info schema
export const customerInfoSchema = z.object({
  customer_name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Phone number is required'),
  shipping_address: shippingAddressSchema,
  organization_name: z.string().optional().transform(val => val === '' ? null : val),
  need_by_date: z.string().optional().transform(val => val === '' ? null : val),
})

// Order creation schema (supports both legacy and multi-color)
export const orderCreationSchema = z.object({
  garment_id: z.string().uuid(),
  // Legacy single-color support (optional if color_size_quantities provided)
  garment_color: z.string().optional(),
  size_quantities: sizeQuantitiesSchema.optional(),
  // New multi-color support
  color_size_quantities: colorSizeQuantitiesSchema.optional(),
  print_config: printConfigSchema,
}).merge(customerInfoSchema).refine(
  (data) => {
    // Either legacy fields or new multi-color field must be provided
    return (data.garment_color && data.size_quantities) || data.color_size_quantities
  },
  { message: 'Either single-color or multi-color quantities must be provided' }
)

// Garment schema
export const garmentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  brand: z.string().min(1, 'Brand is required'),
  description: z.string().min(1, 'Description is required'),
  active: z.boolean(),
  base_cost: z.number().min(0, 'Base cost must be positive'),
  available_colors: z.array(z.string()).min(1, 'At least one color required'),
  size_range: z.array(z.string()).min(1, 'At least one size required'),
  pricing_tier_id: z.string().uuid(),
})

// Pricing tier schema
export const pricingTierSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  min_qty: z.number().min(1, 'Minimum quantity required'),
  max_qty: z.number().nullable(),
  garment_markup_percentage: z.number().min(0, 'Markup must be positive'),
})

// Print pricing schema
export const printPricingSchema = z.object({
  tier_id: z.string().uuid(),
  num_colors: z.number().min(1).max(4),
  cost_per_shirt: z.number().min(0),
  setup_fee_per_screen: z.number().min(0),
})

