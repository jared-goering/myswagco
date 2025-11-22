-- Storage Buckets Setup for My Swag Co
-- Run this in your Supabase SQL editor after creating the storage buckets

-- ============================================
-- ARTWORK BUCKET POLICIES (Private bucket)
-- ============================================

-- Allow service role to upload files
CREATE POLICY "Service role can upload artwork"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'artwork');

-- Allow service role to read files
CREATE POLICY "Service role can read artwork"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'artwork');

-- Allow service role to delete files
CREATE POLICY "Service role can delete artwork"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'artwork');

-- ============================================
-- GARMENT THUMBNAILS BUCKET POLICIES (Public bucket)
-- ============================================

-- Allow public read access to garment thumbnails
CREATE POLICY "Public can view garment thumbnails"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'garment-thumbnails');

-- Allow service role to upload files
CREATE POLICY "Service role can upload garment thumbnails"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'garment-thumbnails');

-- Allow service role to update files
CREATE POLICY "Service role can update garment thumbnails"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'garment-thumbnails');

-- Allow service role to delete files
CREATE POLICY "Service role can delete garment thumbnails"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'garment-thumbnails');

-- ============================================
-- NOTES
-- ============================================
-- Before running this SQL:
-- 1. Create the 'artwork' bucket (set as Private)
-- 2. Create the 'garment-thumbnails' bucket (set as Public)
-- 
-- These policies ensure:
-- - Customer artwork is private and only accessible via signed URLs
-- - Garment thumbnails are publicly viewable
-- - Only the server (service role) can upload/modify/delete files

