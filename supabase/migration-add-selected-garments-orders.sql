-- Migration: Add selected_garments column to orders table
-- This enables multi-garment order support (multiple styles in one order)

-- Add the selected_garments column for multi-garment order support
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS selected_garments JSONB DEFAULT NULL;

-- Create an index for better query performance on selected_garments
CREATE INDEX IF NOT EXISTS idx_orders_selected_garments ON orders USING GIN (selected_garments);

-- Add comment for documentation
COMMENT ON COLUMN orders.selected_garments IS 'Multi-garment selection: maps garment ID to {selectedColors: string[], colorSizeQuantities: {...}}. When present, garment_id refers to primary/first garment.';


