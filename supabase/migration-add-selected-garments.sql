-- Migration: Add selected_garments column to order_drafts table
-- Run this in your Supabase SQL editor

-- Add the selected_garments column for multi-garment order support
ALTER TABLE order_drafts 
ADD COLUMN IF NOT EXISTS selected_garments JSONB DEFAULT '{}';

-- Create an index for better query performance on selected_garments
CREATE INDEX IF NOT EXISTS idx_order_drafts_selected_garments ON order_drafts USING GIN (selected_garments);

-- Comment explaining the column
COMMENT ON COLUMN order_drafts.selected_garments IS 'Multi-garment selection: maps garment ID to {selectedColors: string[], colorSizeQuantities: {...}}';


