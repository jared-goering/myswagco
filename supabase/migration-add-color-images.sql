-- Migration: Add color_images field to garments table
-- This allows storing a unique image URL for each color variant

-- Add the color_images column (JSONB to store color -> image_url mapping)
ALTER TABLE garments 
ADD COLUMN color_images JSONB DEFAULT '{}';

-- Example structure for color_images:
-- {
--   "White": "https://...",
--   "Black": "https://...",
--   "Navy": "https://..."
-- }

-- Update existing garments to use thumbnail_url as default for all colors
UPDATE garments
SET color_images = (
  SELECT jsonb_object_agg(color, thumbnail_url)
  FROM unnest(available_colors) AS color
)
WHERE thumbnail_url IS NOT NULL AND array_length(available_colors, 1) > 0;

-- Add a comment to the column
COMMENT ON COLUMN garments.color_images IS 'JSONB mapping of color names to their respective product image URLs';

