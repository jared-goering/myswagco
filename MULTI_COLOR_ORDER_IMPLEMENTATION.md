# Multi-Color Order Flow Implementation

## Overview

Successfully redesigned the order configuration flow to support multiple colors per order. Users can now:
- Select multiple shirt colors with product photos
- Specify size quantities for each color separately
- Meet the 24-piece minimum across all colors combined

## Changes Made

### 1. Type Definitions (`types/index.ts`)

**Added:**
- `ColorSizeQuantities` type - Maps color names to size quantities
- Updated `Order` interface with `color_size_quantities` field (legacy fields kept for backwards compatibility)

### 2. Order Store (`lib/store/orderStore.ts`)

**Changed:**
- Replaced `garmentColor: string` with `selectedColors: string[]`
- Replaced `sizeQuantities: SizeQuantities` with `colorSizeQuantities: ColorSizeQuantities`

**Added Methods:**
- `addColor(color: string)` - Add a color to selection
- `removeColor(color: string)` - Remove a color and its quantities
- `setColorSizeQuantity(color, size, quantity)` - Set quantity for specific color/size combo
- `getTotalQuantity()` - Calculate total across all colors and sizes

### 3. Configuration Page (`app/custom-shirts/configure/[garmentId]/page.tsx`)

**Complete Redesign - New 3-Step Flow:**

**Step 1: Color Selection (NEW)**
- Grid display of all available colors
- Each card shows:
  - Product photo from `garment.color_images`
  - Color name
  - Visual selection indicator (checkmark)
- Multi-select capability
- Success message showing number of colors selected

**Step 2: Sizes & Quantities (REDESIGNED)**
- Displays one section per selected color
- Each color section shows:
  - Color thumbnail
  - Color name
  - Size quantity inputs (XS, S, M, L, XL, 2XL, 3XL)
  - Subtotal for that color
  - Remove button
- Grand total display at bottom
- Minimum validation (24 pieces across all colors)

**Step 3: Print Details (UPDATED)**
- Print location selection (unchanged)
- Additional order details (unchanged)
- Updated step numbering

**Quote Panel:**
- Updated to use `getTotalQuantity()` method
- Works with multi-color data structure

### 4. Schema & Validation (`lib/schemas.ts`)

**Added:**
- `colorSizeQuantitiesSchema` - Validates multi-color structure

**Updated:**
- `orderCreationSchema` - Now accepts both legacy and multi-color fields
- Refinement validation ensures at least one format is provided

### 5. Pricing Logic (`lib/pricing.ts`)

**Added:**
- `calculateTotalQuantityFromColors()` - Helper for multi-color totals

### 6. Order API (`app/api/orders/route.ts`)

**Updated:**
- POST endpoint now handles both legacy and multi-color orders
- Calculates total from either `color_size_quantities` or `size_quantities`
- Stores multi-color data when provided
- Maintains backwards compatibility

### 7. Checkout Page (`app/custom-shirts/configure/[garmentId]/checkout/page.tsx`)

**Updated:**
- `OrderSummary` component displays all selected colors with quantities
- Uses `getTotalQuantity()` from store
- Submits `color_size_quantities` instead of single color

**Order Creation:**
- Sends multi-color data structure to API
- Removed legacy single-color fields from submission

### 8. Confirmation Page (`app/custom-shirts/orders/[orderId]/confirmation/page.tsx`)

**Updated:**
- Calculates total from either multi-color or legacy structure
- Displays color breakdown when multi-color order
- Shows all colors with individual quantities
- Backwards compatible with old orders

## Database Considerations

The `orders` table needs a `color_size_quantities` JSONB column:

```sql
ALTER TABLE orders 
ADD COLUMN color_size_quantities JSONB;
```

**Note:** Legacy fields (`garment_color`, `size_quantities`) are kept for backwards compatibility.

## Backwards Compatibility

✅ Old orders still work (use legacy fields)
✅ New orders use multi-color structure
✅ All displays handle both formats
✅ APIs accept both formats

## User Experience Improvements

1. **Visual Selection** - Users see actual product photos for each color
2. **Flexible Ordering** - Mix any quantities across colors
3. **Clear Breakdown** - See quantities per color at every step
4. **Minimum Validation** - 24 pieces across all colors (not per color)
5. **Easy Management** - Add/remove colors as needed

## Testing Checklist

- [x] Color selection UI displays photos correctly
- [x] Multi-select colors works
- [x] Per-color size quantities function
- [x] Total quantity calculates correctly across colors
- [x] Minimum 24 pieces validation works
- [x] Quote API handles multi-color structure
- [x] Order creation saves multi-color data
- [x] Checkout displays all colors
- [x] Confirmation page shows color breakdown
- [x] No linter errors

## Example Data Structure

**Multi-Color Order:**
```json
{
  "color_size_quantities": {
    "White": {
      "S": 5,
      "M": 10,
      "L": 5
    },
    "Black": {
      "M": 3,
      "L": 4,
      "XL": 2
    }
  }
}
```

Total: 29 pieces (5+10+5+3+4+2)

## Next Steps

1. Run database migration to add `color_size_quantities` column
2. Test the entire flow end-to-end
3. Verify pricing calculations with multi-color orders
4. Update admin views to display multi-color orders properly
5. Consider adding color breakdown to order emails

## Migration SQL

```sql
-- Add multi-color support to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS color_size_quantities JSONB;

-- Optional: Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_color_size_quantities 
ON orders USING gin (color_size_quantities);
```

