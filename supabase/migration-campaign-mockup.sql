-- Migration: Add mockup_image_url to campaigns table
-- This stores a captured preview image of the design on the shirt

ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS mockup_image_url TEXT DEFAULT NULL;

-- Add comment explaining the field
COMMENT ON COLUMN campaigns.mockup_image_url IS 'URL of the captured mockup image showing the design on the shirt';


