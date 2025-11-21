# Deployment Guide - My Swag Co

Complete step-by-step guide to deploying your screen printing web app to production.

## Pre-Deployment Checklist

Before deploying, ensure you have:

- [ ] Supabase project created and database schema applied
- [ ] Stripe account (can start in test mode)
- [ ] GitHub repository with your code
- [ ] Domain name (optional but recommended)
- [ ] Resend API key for emails (optional for MVP)

## Step 1: Prepare Supabase for Production

### 1.1 Create Production Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project (or use existing dev project for testing)
3. Choose a strong database password
4. Select a region close to your users

### 1.2 Run Database Schema

1. Open SQL Editor in Supabase dashboard
2. Paste contents of `supabase/schema.sql`
3. Click "Run" to execute
4. Verify all tables created successfully

### 1.3 Create Storage Bucket

1. Navigate to Storage in Supabase
2. Click "Create bucket"
3. Name: `artwork`
4. Public: **Off** (private bucket)
5. Click "Create"

### 1.4 Configure RLS Policies

The schema already includes RLS policies, but verify:

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- All tables should have rowsecurity = true
```

### 1.5 Create Admin User

1. Go to Authentication → Users
2. Click "Add user"
3. Enter admin email and password
4. Disable "Auto Confirm User" if you want to manually confirm
5. Save

### 1.6 Get API Keys

1. Go to Settings → API
2. Copy these values (you'll need them for Vercel):
   - Project URL
   - `anon` `public` key
   - `service_role` `secret` key

⚠️ **IMPORTANT**: Never commit service role key to git!

## Step 2: Set Up Stripe

### 2.1 Create Stripe Account

1. Go to [stripe.com](https://stripe.com) and sign up
2. Complete business information
3. You can start in test mode and activate later

### 2.2 Get API Keys

1. Go to Developers → API keys
2. For testing: Use test mode keys (starts with `pk_test_` and `sk_test_`)
3. For production: Toggle to live mode and copy live keys
4. Copy:
   - Publishable key → `NEXT_PUBLIC_STRIPE_PUBLIC_KEY`
   - Secret key → `STRIPE_SECRET_KEY`

### 2.3 Set Up Webhook (After Deployment)

We'll do this in Step 4 after deploying to Vercel.

## Step 3: Deploy to Vercel

### 3.1 Push Code to GitHub

```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit"

# Create GitHub repo and push
git remote add origin https://github.com/yourusername/myswagco.git
git branch -M main
git push -u origin main
```

### 3.2 Import to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "Add New Project"
4. Import your repository
5. Configure project:
   - Framework Preset: **Next.js**
   - Root Directory: `./` (leave as is)
   - Build Command: `npm run build`
   - Output Directory: `.next`

### 3.3 Add Environment Variables

In Vercel project settings, add these environment variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# Stripe (use test keys initially)
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_... (we'll add this in Step 4)

# Email (optional - can skip initially)
RESEND_API_KEY=re_...

# App (use your Vercel domain)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

⚠️ Make sure to copy the full values - they're long!

### 3.4 Deploy

1. Click "Deploy"
2. Wait for build to complete (~2-3 minutes)
3. Click "Visit" to see your live site

## Step 4: Configure Stripe Webhook

### 4.1 Create Webhook Endpoint

1. In Stripe Dashboard, go to Developers → Webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://your-app.vercel.app/api/payments/webhook`
4. Description: "My Swag Co Order Payments"
5. Select events to listen to:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
6. Click "Add endpoint"

### 4.2 Get Signing Secret

1. Click on your new webhook
2. Click "Reveal" under "Signing secret"
3. Copy the secret (starts with `whsec_`)

### 4.3 Add to Vercel

1. Go to your Vercel project → Settings → Environment Variables
2. Add new variable:
   - Name: `STRIPE_WEBHOOK_SECRET`
   - Value: `whsec_...` (the secret you just copied)
3. Click "Save"
4. Redeploy your app (Deployments → click ⋯ → Redeploy)

## Step 5: Test in Production

### 5.1 Test Customer Flow

1. Visit your production URL
2. Click "Start Custom Order"
3. Select a garment
4. Configure order (minimum 24 pieces)
5. Upload test artwork
6. Enter test customer info
7. Use Stripe test card: `4242 4242 4242 4242`
8. Complete checkout
9. Verify confirmation page shows

### 5.2 Verify Webhook

1. Check Stripe Dashboard → Webhooks
2. Your webhook should show recent events
3. All should have status "Succeeded"
4. If failed, click to see error details

### 5.3 Test Admin Panel

1. Visit `https://your-app.vercel.app/admin/login`
2. Log in with your admin credentials
3. Verify you can see the test order
4. Update order status
5. Download artwork files

### 5.4 Check Email (if configured)

If you set up Resend:
1. Check if confirmation email was sent
2. Verify email formatting looks good
3. Check spam folder if not received

## Step 6: Configure Domain (Optional)

### 6.1 Add Custom Domain

1. In Vercel project settings → Domains
2. Add your domain (e.g., `myswagco.com`)
3. Follow DNS configuration instructions

### 6.2 Update Environment Variables

1. Update `NEXT_PUBLIC_APP_URL` to your custom domain
2. Redeploy

### 6.3 Update Stripe Webhook

1. In Stripe, update webhook URL to use custom domain
2. Test again to verify it works

## Step 7: Go Live with Stripe

### 7.1 Activate Stripe Account

1. Complete Stripe onboarding
2. Add bank account details
3. Verify business information
4. Activate account

### 7.2 Switch to Live Keys

1. In Stripe Dashboard, toggle to "Live mode"
2. Go to Developers → API keys
3. Copy live keys (start with `pk_live_` and `sk_live_`)
4. Update Vercel environment variables:
   - `NEXT_PUBLIC_STRIPE_PUBLIC_KEY`
   - `STRIPE_SECRET_KEY`

### 7.3 Create Live Webhook

1. In live mode, go to Developers → Webhooks
2. Add endpoint with your production URL
3. Select same events as before
4. Copy new signing secret
5. Update `STRIPE_WEBHOOK_SECRET` in Vercel
6. Redeploy

## Step 8: Set Up Email (Production)

### 8.1 Get Resend API Key

1. Sign up at [resend.com](https://resend.com)
2. Verify your domain (for custom sender)
3. Get API key from dashboard

### 8.2 Configure in App

1. Add `RESEND_API_KEY` to Vercel env vars
2. Update sender email in `lib/email.ts` if using custom domain
3. Redeploy

### 8.3 Test Emails

1. Place a test order
2. Verify confirmation email arrives
3. Check email rendering in different clients

## Step 9: Production Hardening

### 9.1 Review Security

- [ ] Verify all RLS policies are correct
- [ ] Check that service role key is not exposed
- [ ] Ensure CORS is properly configured
- [ ] Review Supabase auth settings

### 9.2 Set Up Monitoring

Optional but recommended:

1. Enable Vercel Analytics
2. Set up error tracking (Sentry)
3. Configure uptime monitoring
4. Set up database backup schedules in Supabase

### 9.3 Performance Optimization

- [ ] Enable Vercel Analytics
- [ ] Test page load times
- [ ] Optimize images if needed
- [ ] Enable caching where appropriate

## Step 10: Launch!

### 10.1 Final Checks

- [ ] All environment variables set correctly
- [ ] Stripe webhook working
- [ ] Admin login works
- [ ] Test orders process successfully
- [ ] Emails sending correctly
- [ ] Artwork uploads work
- [ ] Custom domain configured (if applicable)

### 10.2 Soft Launch

1. Share with internal team first
2. Process a few real test orders
3. Verify everything works end-to-end
4. Get feedback and fix issues

### 10.3 Public Launch

1. Update any marketing materials
2. Share link with customers
3. Monitor closely for first few orders
4. Be ready to provide support

## Troubleshooting

### Webhook Not Receiving Events

- Check URL is correct in Stripe dashboard
- Verify environment variable is set correctly
- Check Vercel function logs
- Test with Stripe CLI: `stripe trigger payment_intent.succeeded`

### Admin Login Fails

- Verify admin user exists in Supabase Auth
- Check if email is confirmed
- Try password reset
- Check browser console for errors

### Images Not Loading

- Verify Supabase storage bucket exists
- Check bucket policies allow service role access
- Ensure `next.config.js` has correct image domains

### Quote Not Calculating

- Check that pricing tiers exist in database
- Verify print_pricing table has data
- Check browser console for API errors
- Verify Supabase keys are correct

### Deployment Fails

- Check build logs in Vercel
- Verify all dependencies are in package.json
- Run `npm run build` locally to test
- Check for TypeScript errors

## Rollback Procedure

If something goes wrong:

1. Go to Vercel project → Deployments
2. Find last working deployment
3. Click ⋯ → Promote to Production
4. Redeploy instantly reverts to previous version

## Maintenance

### Regular Tasks

- **Weekly**: Check order volume and system performance
- **Monthly**: Review Supabase database usage
- **Monthly**: Check Stripe settlement reports
- **Quarterly**: Review and update pricing if needed
- **Yearly**: Update dependencies and review security

### Updating Garments

1. Go to Supabase dashboard
2. Open Table Editor → garments
3. Insert, update, or deactivate garments
4. Changes reflect immediately

### Adjusting Pricing

1. Go to Supabase dashboard
2. Update pricing_tiers or print_pricing tables
3. Changes apply to new quotes immediately

## Support Resources

- **Vercel**: [vercel.com/docs](https://vercel.com/docs)
- **Supabase**: [supabase.com/docs](https://supabase.com/docs)
- **Stripe**: [stripe.com/docs](https://stripe.com/docs)
- **Next.js**: [nextjs.org/docs](https://nextjs.org/docs)

## Questions?

Review the main README.md for detailed documentation of all features and customization options.

---

**Congratulations on deploying your custom screen printing platform! 🎉**

