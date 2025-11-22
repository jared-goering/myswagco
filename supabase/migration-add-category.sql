-- Migration: Add category field to garments table

-- Add the category column
ALTER TABLE garments 
ADD COLUMN category VARCHAR(100);

-- Add a comment to the column
COMMENT ON COLUMN garments.category IS 'Product category (e.g., Tee, Hoodie, Hat, etc.)';

-- Update existing garments with a default category if possible, or leave null
-- We can try to infer from the name for existing records
UPDATE garments
SET category = CASE
  WHEN name ILIKE '%tee%' OR name ILIKE '%t-shirt%' THEN 'T-Shirt'
  WHEN name ILIKE '%hoodie%' OR name ILIKE '%hood%' THEN 'Hoodie'
  WHEN name ILIKE '%sweatshirt%' OR name ILIKE '%fleece%' THEN 'Sweatshirt'
  WHEN name ILIKE '%hat%' OR name ILIKE '%cap%' OR name ILIKE '%beanie%' THEN 'Headwear'
  WHEN name ILIKE '%tank%' THEN 'Tank Top'
  WHEN name ILIKE '%long sleeve%' THEN 'Long Sleeve'
  ELSE 'Other'
END
WHERE category IS NULL;

