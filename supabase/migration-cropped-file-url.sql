-- Migration: Add cropped_file_url to artwork_files table
-- This column stores the URL of the cropped image (after whitespace removal)
-- which is needed for accurate rendering in admin panel and campaign mockups

-- Add cropped_file_url column to artwork_files
ALTER TABLE artwork_files
ADD COLUMN IF NOT EXISTS cropped_file_url TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN artwork_files.cropped_file_url IS 'URL of the cropped version of the artwork (after whitespace removal). Used for accurate rendering in admin panel and campaign mockups.';

