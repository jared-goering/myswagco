-- Migration: Add fit_type field to garments for Unisex/Women's filtering
-- Run this in your Supabase SQL editor

-- Add fit_type column with default 'unisex'
ALTER TABLE garments 
ADD COLUMN IF NOT EXISTS fit_type VARCHAR(20) DEFAULT 'unisex';

-- Set all existing garments to 'unisex' (as requested)
UPDATE garments SET fit_type = 'unisex' WHERE fit_type IS NULL;

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_garments_fit_type ON garments(fit_type);

-- Drop existing constraint if it exists (in case updating)
ALTER TABLE garments DROP CONSTRAINT IF EXISTS valid_fit_type;

-- Add check constraint for valid values
ALTER TABLE garments 
ADD CONSTRAINT valid_fit_type CHECK (fit_type IN ('unisex', 'womens', 'mens', 'youth'));

-- Comment for documentation
COMMENT ON COLUMN garments.fit_type IS 'Fit type: unisex, womens, mens, or youth';

