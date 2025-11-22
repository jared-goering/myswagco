-- Migration: Add color_back_images field to garments table
-- This allows storing back view image URLs for each color variant
-- S&S Activewear API provides both front and back images

-- Add the color_back_images column (JSONB to store color -> back_image_url mapping)
ALTER TABLE garments 
ADD COLUMN IF NOT EXISTS color_back_images JSONB DEFAULT '{}';

-- Example structure for color_back_images:
-- {
--   "White": "https://cdn.ssactivewear.com/.../white_back.jpg",
--   "Black": "https://cdn.ssactivewear.com/.../black_back.jpg",
--   "Navy": "https://cdn.ssactivewear.com/.../navy_back.jpg"
-- }

-- Add a comment to the column
COMMENT ON COLUMN garments.color_back_images IS 'JSONB mapping of color names to their respective back view image URLs';

