# Garment Management System - Implementation Guide

## Overview

A complete CRUD (Create, Read, Update, Delete) system has been implemented for managing garments in the admin panel. Admins can now add, edit, activate, and deactivate garments directly from the UI without needing to access the database.

## Features Implemented

### 1. **API Routes**
- `POST /api/garments` - Create new garment
- `GET /api/garments?admin=true` - Get all garments (including inactive)
- `GET /api/garments/[id]` - Get single garment
- `PATCH /api/garments/[id]` - Update garment
- `DELETE /api/garments/[id]` - Soft delete (deactivate) garment
- `POST /api/garments/upload-image` - Upload garment thumbnail
- `GET /api/pricing-tiers` - Get all pricing tiers

### 2. **Admin Pages**

#### Garments List (`/admin/garments`)
- View all garments (active and inactive)
- Visual distinction for inactive garments (grayed out)
- "Add New Garment" button
- Action buttons for each garment:
  - **Edit** - Navigate to edit page
  - **Activate/Deactivate** - Toggle garment status
- Toast notifications for actions

#### New Garment Page (`/admin/garments/new`)
- Form to create new garment with all fields
- Image upload with preview
- Color management (tag-based input)
- Size selection (checkbox toggles)
- Pricing tier dropdown
- Active/inactive toggle
- Client-side validation
- Success/error notifications

#### Edit Garment Page (`/admin/garments/[id]/edit`)
- Pre-populated form with existing garment data
- Same features as new garment page
- Update existing thumbnail or upload new one
- Loading and error states

### 3. **Reusable Components**

#### GarmentForm Component (`components/GarmentForm.tsx`)
- Shared form for both create and edit modes
- Fields:
  - Name, Brand, Description
  - Base Cost
  - Available Colors (dynamic tags)
  - Size Range (multi-select)
  - Pricing Tier (dropdown)
  - Active Status (toggle)
  - Thumbnail Image (file upload with preview)
- Form validation
- Image upload handling
- Loading states
- Toast notifications

## Setup Instructions

### 1. Configure Supabase Storage

You need to create two storage buckets in Supabase:

#### Option A: Manual Setup via Dashboard

1. Go to your Supabase Dashboard → Storage
2. Create bucket `artwork` (Private)
3. Create bucket `garment-thumbnails` (Public)
4. Go to SQL Editor and run the SQL from `supabase/storage-setup.sql`

#### Option B: Quick Setup

Run the following in Supabase SQL Editor:

```sql
-- Create buckets first via the dashboard UI, then run storage-setup.sql
```

See `supabase/README.md` for detailed instructions.

### 2. Verify Environment Variables

Ensure your `.env.local` has:

```env
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Usage Guide

### Adding a New Garment

1. Navigate to `/admin/garments`
2. Click "Add New Garment" button
3. Fill in the form:
   - Enter name, brand, and description
   - Set base cost
   - Add colors (type and press Enter)
   - Select available sizes
   - Choose pricing tier
   - Upload thumbnail image (optional)
   - Set active status
4. Click "Create Garment"
5. You'll be redirected to the garments list upon success

### Editing a Garment

1. Navigate to `/admin/garments`
2. Click "Edit" on the garment row
3. Update any fields as needed
4. To change the thumbnail, upload a new image
5. Click "Update Garment"
6. You'll be redirected to the garments list upon success

### Activating/Deactivating a Garment

1. Navigate to `/admin/garments`
2. Click "Activate" or "Deactivate" on the garment row
3. The status updates immediately
4. Inactive garments are grayed out in the list
5. Inactive garments won't appear in the customer-facing store

## Technical Details

### Image Upload

- **Accepted formats**: JPEG, PNG, WebP
- **Maximum size**: 5MB
- **Storage location**: Supabase Storage `garment-thumbnails` bucket
- **File naming**: `{timestamp}-{random}.{ext}`
- **Access**: Public URLs (can be displayed directly)

### Validation

- Name, brand, description are required
- Base cost must be greater than 0
- At least one color required
- At least one size required
- Pricing tier must be selected

### Soft Delete

The DELETE endpoint performs a soft delete by setting `active = false` rather than removing the record. This preserves historical order data that references the garment.

## Files Created/Modified

### New Files
- `app/api/garments/[id]/route.ts`
- `app/api/garments/upload-image/route.ts`
- `app/api/pricing-tiers/route.ts`
- `app/admin/garments/new/page.tsx`
- `app/admin/garments/[id]/edit/page.tsx`
- `components/GarmentForm.tsx`
- `supabase/storage-setup.sql`

### Modified Files
- `app/api/garments/route.ts` - Added POST endpoint and admin view
- `app/admin/garments/page.tsx` - Added action buttons and state management
- `supabase/README.md` - Added storage bucket setup instructions

## Troubleshooting

### Image Upload Fails
- Verify the `garment-thumbnails` bucket exists in Supabase Storage
- Check that storage policies are configured correctly
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in environment variables

### Can't Create/Edit Garments
- Verify API routes are working (check browser console)
- Ensure `SUPABASE_SERVICE_ROLE_KEY` has proper permissions
- Check Supabase logs for any database errors

### Garments Not Showing
- Make sure you're fetching with `?admin=true` in admin view
- Check that garments exist in the database
- Verify Row Level Security policies allow reading garments

## Next Steps

Consider these enhancements:
- Bulk image upload
- Duplicate garment feature
- Import/export garments via CSV
- Garment categories/tags
- Price history tracking
- Inventory management integration

