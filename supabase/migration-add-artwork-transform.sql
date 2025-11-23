-- Add transform column to artwork_files table to store position, scale, and rotation
-- This allows us to display designs exactly as the customer configured them

ALTER TABLE artwork_files 
ADD COLUMN IF NOT EXISTS transform JSONB DEFAULT NULL;

-- Add comment explaining the transform structure
COMMENT ON COLUMN artwork_files.transform IS 'Stores artwork transform data: {x, y, scale, rotation}. x/y are pixel positions, scale is a multiplier, rotation is in degrees.';

-- Create index for faster queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_artwork_files_transform ON artwork_files USING GIN (transform);

