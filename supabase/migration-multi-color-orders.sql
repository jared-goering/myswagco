-- Migration: Add Multi-Color Support to Orders
-- This migration adds the color_size_quantities column to support orders with multiple colors

-- Add the new column for multi-color support
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS color_size_quantities JSONB;

-- Add a GIN index for better query performance on the JSONB column
CREATE INDEX IF NOT EXISTS idx_orders_color_size_quantities 
ON orders USING gin (color_size_quantities);

-- Update the constraint to make garment_color optional (since multi-color orders may not use it)
ALTER TABLE orders 
ALTER COLUMN garment_color DROP NOT NULL;

-- Update the constraint to make size_quantities optional (since multi-color orders use color_size_quantities instead)
ALTER TABLE orders 
ALTER COLUMN size_quantities DROP NOT NULL;

-- Add a check constraint to ensure at least one format is provided
ALTER TABLE orders 
ADD CONSTRAINT orders_quantities_check 
CHECK (
  (garment_color IS NOT NULL AND size_quantities IS NOT NULL) 
  OR 
  (color_size_quantities IS NOT NULL)
);

-- Add comment explaining the new structure
COMMENT ON COLUMN orders.color_size_quantities IS 
'Multi-color order support. Structure: {"White": {"S": 5, "M": 10}, "Black": {"L": 3}}. If present, this takes precedence over garment_color and size_quantities.';

-- Note: No data migration needed as this is purely additive
-- Existing orders will continue to use garment_color and size_quantities
-- New multi-color orders will use color_size_quantities

