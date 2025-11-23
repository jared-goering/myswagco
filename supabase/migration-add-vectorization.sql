-- Add vectorization support to artwork_files table
-- Run this in your Supabase SQL editor

ALTER TABLE artwork_files
ADD COLUMN vectorized_file_url TEXT,
ADD COLUMN is_vector BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN vectorization_status VARCHAR(20) DEFAULT 'pending' NOT NULL
  CHECK (vectorization_status IN ('not_needed', 'pending', 'processing', 'completed', 'failed'));

-- Create index for querying by vectorization status
CREATE INDEX idx_artwork_files_vectorization_status ON artwork_files(vectorization_status);

-- Update existing records: mark vector files as not_needed
UPDATE artwork_files
SET is_vector = true,
    vectorization_status = 'not_needed'
WHERE file_name ILIKE '%.svg'
   OR file_name ILIKE '%.ai'
   OR file_name ILIKE '%.eps';

-- Update existing raster files to pending
UPDATE artwork_files
SET is_vector = false,
    vectorization_status = 'pending'
WHERE file_name ILIKE '%.png'
   OR file_name ILIKE '%.jpg'
   OR file_name ILIKE '%.jpeg';

