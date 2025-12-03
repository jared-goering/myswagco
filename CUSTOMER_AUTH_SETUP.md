# Customer Authentication Setup Guide

This guide explains how to set up customer authentication with email/password and Google OAuth.

## Prerequisites

1. Supabase project already configured
2. Google Cloud Console account (for OAuth)

## Step 1: Run Database Migration

Run the `supabase/migration-customers.sql` file in your Supabase SQL Editor to create:
- `customers` table
- `saved_artwork` table
- Add `customer_id` column to `orders` table
- Row Level Security policies
- Auto-create customer profile trigger

## Step 2: Configure Google OAuth in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Navigate to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth 2.0 Client IDs**
5. Configure the consent screen if prompted
6. Select **Web application** as application type
7. Add authorized redirect URIs:
   - `https://<your-project-ref>.supabase.co/auth/v1/callback`
   - For local dev: `http://localhost:3000/auth/callback`
8. Copy the **Client ID** and **Client Secret**

## Step 3: Configure Google OAuth in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Authentication > Providers**
3. Find **Google** in the list and enable it
4. Paste your Google Client ID and Client Secret
5. Save the configuration

## Step 4: Configure Email Authentication

Email/password auth is enabled by default in Supabase. To customize:

1. Go to **Authentication > Providers > Email**
2. Configure options:
   - **Enable email confirmations**: 
     - ✅ **Enabled** (default): Users must confirm their email before signing in. More secure but adds friction.
     - ❌ **Disabled**: Users are immediately signed in after signup. Better UX, less secure.
   - **Enable double confirmation**: Optional extra security (only relevant if email confirmations are enabled)
   - **Minimum password length**: Default is 6

**To disable email confirmation for easier sign-up:**
1. Go to **Authentication > Providers > Email** in Supabase Dashboard
2. Toggle off **"Enable email confirmations"**
3. Save the configuration
4. Users will now be automatically signed in immediately after creating an account

## Step 5: Set Up Email Templates (Optional)

Customize authentication emails in Supabase:

1. Go to **Authentication > Email Templates**
2. Customize templates for:
   - Confirm signup
   - Magic link
   - Reset password
   - Change email

## Step 6: Environment Variables

Make sure these are set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Step 7: Configure Redirect URLs (IMPORTANT!)

In Supabase Dashboard under **Authentication > URL Configuration**:

1. Set **Site URL**: `https://myswagco.vercel.app` (production URL)

2. Add **Redirect URLs** (ALL of these are required):
   ```
   http://localhost:3000/auth/callback
   http://localhost:3001/auth/callback
   http://localhost:3002/auth/callback
   https://myswagco.vercel.app/auth/callback
   ```

⚠️ **Without localhost URLs, OAuth will redirect to production instead of your dev server!**

The app automatically uses `window.location.origin` for redirects, but Supabase must whitelist each URL.

## Testing Authentication

### Test Email/Password:
1. Sign up with a new email
2. Check for confirmation email (if enabled)
3. Log in with credentials

### Test Google OAuth:
1. Click "Continue with Google"
2. Complete Google sign-in flow
3. Verify redirect back to app

## Troubleshooting

### Common Issues:

1. **OAuth redirects to production instead of localhost**: 
   - Add `http://localhost:3000/auth/callback`, `http://localhost:3001/auth/callback`, `http://localhost:3002/auth/callback` to Supabase Redirect URLs
   - Go to Authentication > URL Configuration > Redirect URLs
   
2. **"redirect_uri_mismatch" error**: Ensure the redirect URI in Google Console matches exactly

3. **No confirmation email**: Check spam folder, or disable confirmation in Supabase for testing

4. **OAuth popup blocked**: Allow popups for your domain

5. **Session not persisting**: Ensure cookies are enabled and not being blocked

### Debug Tips:
- Check browser console for errors (look for "Auth state changed" logs)
- Check Supabase Dashboard > Authentication > Users for sign-up attempts
- Check Supabase Dashboard > Database > Logs for trigger errors
- For OAuth issues, check the redirect URL in the browser address bar

