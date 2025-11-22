# Color Images Feature Migration Guide

## Overview

This feature replaces the single thumbnail image per garment with individual images for each color variant. This allows customers to see accurate product representations for each color option.

## Changes Made

### 1. Database Schema (`supabase/migration-add-color-images.sql`)

Added a new `color_images` JSONB column to the `garments` table that maps color names to their image URLs:

```sql
ALTER TABLE garments 
ADD COLUMN color_images JSONB DEFAULT '{}';
```

Example structure:
```json
{
  "White": "https://storage.url/white-shirt.jpg",
  "Black": "https://storage.url/black-shirt.jpg",
  "Navy": "https://storage.url/navy-shirt.jpg"
}
```

### 2. TypeScript Types (`types/index.ts`)

Updated the `Garment` interface to include:
```typescript
color_images: Record<string, string> // Maps color name to image URL
```

### 3. Garment Form UI (`components/GarmentForm.tsx`)

**Major UI Changes:**
- Removed single thumbnail upload field
- Added per-color image upload interface
- Each color now displays:
  - Image preview (or placeholder if no image)
  - Upload/Change Image button
  - Remove color button

**New Features:**
- Upload different images for each color
- Preview images before saving
- Automatic cleanup when colors are removed
- Import from URL now populates color images

### 4. API Routes

**Updated:**
- `POST /api/garments` - Now accepts and saves `color_images`
- `PATCH /api/garments/[id]` - Now updates `color_images`
- `GET /api/garments/import-from-url` - Already extracts color images from supplier sites

## Migration Steps

### Step 1: Run Database Migration

In your Supabase SQL Editor, run the migration:

```bash
# Copy the contents of supabase/migration-add-color-images.sql
# and run it in your Supabase SQL Editor
```

Or use the Supabase CLI:
```bash
supabase db push
```

### Step 2: Deploy Updated Code

The code changes are backwards compatible:
- Existing garments with `thumbnail_url` will continue to work
- The migration populates `color_images` from existing `thumbnail_url` values
- New garments can now have per-color images

### Step 3: Update Existing Garments (Optional)

For existing garments, you can:

1. **Keep them as-is**: They'll use the thumbnail as the default
2. **Update manually**: Edit each garment and upload images per color
3. **Re-import**: Use the "Import from URL" feature to fetch color-specific images

## Using the New Feature

### Creating a New Garment

1. Go to Admin → Garments → Add New Garment
2. Enter garment details
3. Add colors (type color name and press Enter)
4. For each color added, you'll see an upload section:
   - Click "Upload Image" to select an image file
   - Image preview appears immediately
   - Can change the image anytime before saving

### Importing from URL

The import feature now extracts color-specific images:

1. Paste a product URL (S&S Activewear or AS Colour)
2. Click "Import"
3. The system will:
   - Extract all available colors
   - Find images for each color (if available on the supplier site)
   - Pre-fill the form with color images

### Editing Existing Garments

1. Go to Admin → Garments → Edit
2. Scroll to the colors section
3. Each color shows its current image (or placeholder)
4. Click "Upload Image" or "Change Image" to update

## Technical Details

### Image Storage

- Images are stored in Supabase Storage bucket: `garment-thumbnails`
- Path format: `garments/{timestamp}-{random}.{ext}`
- Supported formats: JPEG, PNG, WebP
- Max file size: 5MB

### Data Flow

1. **Upload**: User selects image → File stored in state
2. **Preview**: FileReader generates preview URL
3. **Submit**: Files uploaded to Supabase Storage → URLs stored in database
4. **Display**: URLs fetched from database → Images displayed

### Backwards Compatibility

- `thumbnail_url` field is maintained for backwards compatibility
- When saving, the first color's image is also set as `thumbnail_url`
- Old code that only reads `thumbnail_url` will still work
- New code can use `color_images` for better user experience

## UI Changes Summary

### Before
```
┌─────────────────────────────────┐
│ Thumbnail Image                  │
│ [Choose File] No file chosen    │
│ ┌─────────┐                     │
│ │ Preview │                     │
│ └─────────┘                     │
└─────────────────────────────────┘
```

### After
```
┌─────────────────────────────────┐
│ Available Colors                 │
│ [Type color and press Enter]    │
│                                  │
│ ┌──────────────────────────────┐│
│ │ ┌────┐  White                ││
│ │ │Img │  [Upload Image]       ││
│ │ └────┘  [Remove]             ││
│ └──────────────────────────────┘│
│ ┌──────────────────────────────┐│
│ │ ┌────┐  Black                ││
│ │ │Img │  [Change Image]       ││
│ │ └────┘  [Remove]             ││
│ └──────────────────────────────┘│
└─────────────────────────────────┘
```

## Benefits

1. **Better Customer Experience**: See accurate product images for each color
2. **Reduced Confusion**: No more guessing what a color looks like
3. **Higher Conversion**: Better visuals lead to more confident purchases
4. **Supplier Integration**: Auto-import color images from supplier websites
5. **Scalability**: Easy to manage products with many color variants

## Next Steps

After migration, consider:

1. **Update existing garments** with color-specific images
2. **Test the import feature** with your supplier URLs
3. **Update customer-facing pages** to display color images when users select colors
4. **Add image optimization** (resize/compress) if needed for performance

## Troubleshooting

### Images not showing after upload
- Check Supabase Storage bucket permissions
- Verify `garment-thumbnails` bucket is public
- Check browser console for CORS errors

### Import not finding color images
- Some supplier sites may not have structured data
- Claude AI does its best but some sites are harder to parse
- You can always upload images manually

### Old garments showing placeholder
- Run the migration SQL to populate color_images from thumbnail_url
- Or manually edit and upload color images

## Support

For issues or questions, check:
- `supabase/storage-setup.sql` - Storage bucket configuration
- `GARMENT_MANAGEMENT_GUIDE.md` - General garment management
- `FEATURE_GARMENT_AUTO_IMPORT.md` - Import feature details

