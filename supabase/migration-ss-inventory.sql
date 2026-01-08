-- Migration: Add S&S Activewear inventory tracking fields to garments
-- Run this in your Supabase SQL editor

-- Add ss_style_id field to store the S&S Activewear style identifier
-- This is used to fetch live inventory from the S&S API
ALTER TABLE garments 
ADD COLUMN IF NOT EXISTS ss_style_id VARCHAR(100);

-- Add supplier_source field to track where the garment was imported from
-- Values: 'ssactivewear', 'ascolour', 'manual', etc.
ALTER TABLE garments 
ADD COLUMN IF NOT EXISTS supplier_source VARCHAR(50);

-- Create index on ss_style_id for efficient inventory lookups
CREATE INDEX IF NOT EXISTS idx_garments_ss_style_id ON garments(ss_style_id) WHERE ss_style_id IS NOT NULL;

-- Create index on supplier_source for filtering by supplier
CREATE INDEX IF NOT EXISTS idx_garments_supplier_source ON garments(supplier_source) WHERE supplier_source IS NOT NULL;

-- Comment on columns for documentation
COMMENT ON COLUMN garments.ss_style_id IS 'S&S Activewear style ID for inventory API lookups (e.g., "12345" or style number)';
COMMENT ON COLUMN garments.supplier_source IS 'Origin supplier of the garment: ssactivewear, ascolour, manual, etc.';





