-- Multi-Garment Campaign Support Migration
-- Run this in your Supabase SQL editor after previous campaign migrations

-- Add garment_configs to campaigns table
-- Structure: { "garment_id": { "price": 24.99, "colors": ["Bay", "Navy"] }, ... }
-- This allows campaigns to offer multiple shirt styles with individual prices
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS garment_configs JSONB DEFAULT '{}';

-- Add garment_id to campaign_orders table
-- Tracks which specific garment style the participant ordered
ALTER TABLE campaign_orders 
ADD COLUMN IF NOT EXISTS garment_id UUID REFERENCES garments(id);

-- Create index for better query performance on garment_id lookups
CREATE INDEX IF NOT EXISTS idx_campaign_orders_garment_id ON campaign_orders(garment_id);

-- Migrate existing campaigns to use garment_configs
-- This populates garment_configs from the existing garment_id, selected_colors, and price_per_shirt
UPDATE campaigns 
SET garment_configs = jsonb_build_object(
  garment_id::text, 
  jsonb_build_object(
    'price', price_per_shirt,
    'colors', selected_colors
  )
)
WHERE garment_configs = '{}' 
  AND garment_id IS NOT NULL;

-- Migrate existing campaign_orders to include garment_id from their campaign
UPDATE campaign_orders co
SET garment_id = c.garment_id
FROM campaigns c
WHERE co.campaign_id = c.id
  AND co.garment_id IS NULL
  AND c.garment_id IS NOT NULL;

-- Add comment explaining the schema
COMMENT ON COLUMN campaigns.garment_configs IS 'Multi-garment support: maps garment_id to { price: number, colors: string[] }. For backwards compatibility, garment_id field is kept for single-style campaigns.';
COMMENT ON COLUMN campaign_orders.garment_id IS 'The specific garment style ordered by the participant (for multi-garment campaigns)';





