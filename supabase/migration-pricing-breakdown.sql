-- Migration: Add pricing_breakdown field to orders table
-- This stores the detailed per-shirt pricing at order creation time
-- Run this in your Supabase SQL editor

-- Add pricing_breakdown column to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS pricing_breakdown JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN orders.pricing_breakdown IS 'Stores detailed pricing breakdown at order creation: garment_cost_per_shirt, print_cost_per_shirt, setup_fees, per_shirt_total, and optional garment_breakdown array for multi-garment orders';

-- Example structure stored in pricing_breakdown:
-- {
--   "garment_cost_per_shirt": 9.78,
--   "print_cost_per_shirt": 2.50,
--   "setup_fees": 50.00,
--   "total_screens": 2,
--   "per_shirt_total": 13.32,
--   "garment_breakdown": [
--     { "garment_id": "uuid", "name": "1717", "quantity": 24, "cost_per_shirt": 9.78, "total": 234.72 },
--     { "garment_id": "uuid", "name": "3001CVC", "quantity": 24, "cost_per_shirt": 6.88, "total": 165.12 }
--   ]
-- }


