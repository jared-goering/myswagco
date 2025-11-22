# Supabase Setup Instructions

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign in and create a new project
3. Choose a name, database password, and region
4. Wait for the project to be created (~2 minutes)

## 2. Run the Schema SQL

1. In your Supabase dashboard, navigate to the SQL Editor
2. Create a new query
3. Copy and paste the entire contents of `supabase/schema.sql`
4. Click "Run" to execute the SQL
5. Verify that all tables were created successfully

## 3. Create Storage Buckets

### A. Artwork Bucket (for customer uploads)

1. Navigate to Storage in the Supabase dashboard
2. Create a new bucket called `artwork`
3. Set the bucket to **Private** (we'll use signed URLs for access)
4. Create a policy for service role access:

```sql
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
```

### B. Garment Thumbnails Bucket (for product images)

1. In Storage, create a new bucket called `garment-thumbnails`
2. Set the bucket to **Public** (so product images are publicly accessible)
3. Create policies for access control:

```sql
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
```

## 4. Get Your API Keys

1. Navigate to Settings > API in your Supabase dashboard
2. Copy the following values to your `.env.local` file:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY`

## 5. Set Up Authentication (For Admin Panel)

1. Navigate to Authentication > Providers
2. Enable Email provider
3. Disable email confirmations (or configure SMTP for production)
4. Create your first admin user:
   - Go to Authentication > Users
   - Click "Add user"
   - Enter email and password
   - This user will be able to access the admin panel

## 6. Environment Variables

Create a `.env.local` file in your project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe (set these up later)
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Email
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Database Structure

The schema creates the following tables:

- **app_config** - Global app settings (deposit %, min quantity, etc.)
- **pricing_tiers** - Quantity-based pricing tiers
- **garments** - Product catalog
- **print_pricing** - Screen print cost matrix
- **orders** - Customer orders
- **artwork_files** - Uploaded artwork references
- **order_activity** - Order activity log

## Sample Data

The schema includes sample data:
- 3 default garments (Comfort Colors, Bella+Canvas, AS Colour)
- 4 pricing tiers (24-47, 48-71, 72-143, 144+)
- Print pricing for 1-4 colors across all tiers
- Default app configuration

You can modify or add to this data through the admin panel once the app is running.

