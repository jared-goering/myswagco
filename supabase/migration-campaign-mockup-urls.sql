-- Migration: Add mockup_image_urls to campaigns table
-- This stores mockup images for each color, enabling color switching on the campaign page

ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS mockup_image_urls JSONB DEFAULT '{}';

-- Add comment explaining the field
COMMENT ON COLUMN campaigns.mockup_image_urls IS 'JSON object mapping color names to mockup image URLs, e.g. {"Bay": "url1", "Kelly": "url2"}';

