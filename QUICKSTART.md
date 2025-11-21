# Quick Start Guide

Get your screen printing app running in 15 minutes!

## Prerequisites Check

Before starting, ensure you have:
- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] A Supabase account (sign up at supabase.com)
- [ ] A Stripe account (sign up at stripe.com - test mode is fine)

## 5-Step Setup

### Step 1: Install Dependencies (2 min)

```bash
npm install
```

### Step 2: Set Up Supabase (5 min)

1. Go to [supabase.com](https://supabase.com) → Create new project
2. Name it "myswagco-dev", choose a password, select a region
3. Wait for project to provision (~2 minutes)
4. Once ready, go to **SQL Editor** → New Query
5. Copy everything from `supabase/schema.sql` and paste it
6. Click **Run** (bottom right)
7. Go to **Storage** → Create bucket:
   - Name: `artwork`
   - Public: **Off**
8. Go to **Authentication** → Users → Add user:
   - Email: your-email@example.com
   - Password: choose a secure password
   - Click **Create user**
9. Go to **Settings** → API and copy:
   - Project URL
   - `anon` `public` key  
   - `service_role` key (click "Reveal" first)

### Step 3: Set Up Stripe (3 min)

1. Go to [stripe.com](https://stripe.com) → Sign in or create account
2. Stay in **Test Mode** (toggle in top right)
3. Go to **Developers** → **API keys**
4. Copy:
   - Publishable key (starts with `pk_test_`)
   - Secret key (starts with `sk_test_`)

### Step 4: Configure Environment (2 min)

Create `.env.local` in the root directory:

```env
# Supabase (paste your values from Step 2)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# Stripe (paste your values from Step 3)
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_skip_for_now

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

⚠️ For now, you can leave `STRIPE_WEBHOOK_SECRET` as `whsec_skip_for_now` - we'll set it up properly in Step 5.

### Step 5: Run the App (1 min)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

## Test Drive

### Test the Customer Flow

1. Click **"Start Custom Order"**
2. Select **Comfort Colors 1717**
3. Enter quantities (minimum 24 total):
   - M: 12
   - L: 12
4. Click **Next**
5. Check **Front** and select **1 color**
6. Click **Next**
7. Select a shirt color
8. Click **Continue to Artwork**
9. Upload any image file (or create a test .txt file)
10. Click **Continue to Checkout**
11. Fill in your info:
    - Name: Test Customer
    - Email: test@example.com
    - Phone: 555-1234
    - Address: 123 Main St, City, ST 12345
12. Click **Continue to Payment**
13. Enter Stripe test card:
    - Card: `4242 4242 4242 4242`
    - Expiry: Any future date
    - CVC: Any 3 digits
    - ZIP: Any 5 digits
14. Click **Pay Deposit**
15. You should see a confirmation page! ✅

### Test the Admin Panel

1. Go to [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
2. Login with the email/password you created in Supabase
3. You should see:
   - Dashboard with your test order
   - Stats showing 1 pending art review
4. Click **View** on the order
5. Try changing the status to **"Art Approved"**
6. Add some internal notes
7. Download the artwork file

## Set Up Webhooks (Optional - For Full Payment Testing)

If you want payment confirmations to work locally:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe  # macOS
# or download from: https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Forward webhooks (keep this running in a separate terminal)
stripe listen --forward-to localhost:3000/api/payments/webhook
```

Copy the webhook signing secret that appears (starts with `whsec_`) and update it in your `.env.local`:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

Restart your dev server (`npm run dev`).

Now when you place an order, the webhook will fire and the confirmation email flow will be triggered.

## Common Issues

### "Failed to fetch garments"

**Solution**: Double-check your Supabase URL and keys in `.env.local`. Make sure you copied them correctly (they're very long!).

### Admin login doesn't work

**Solution**: 
1. Check that you created the user in Supabase → Authentication → Users
2. The user should be "Confirmed" (green checkmark)
3. Try the password you set - it's case-sensitive

### Artwork upload fails

**Solution**: 
1. Go to Supabase → Storage
2. Make sure bucket named `artwork` exists
3. Make sure it's set to **Private** (not Public)

### Quote not showing

**Solution**: 
1. Make sure you entered at least 24 total pieces
2. Check browser console (F12) for errors
3. Verify the database schema ran successfully

### Payment fails

**Solution**:
1. Use test card `4242 4242 4242 4242`
2. Make sure Stripe keys are from Test Mode
3. Check that keys don't have extra spaces

## Next Steps

Now that you have it running:

1. **Customize**: Edit garments in Supabase table editor
2. **Adjust Pricing**: Update pricing_tiers and print_pricing tables
3. **Brand It**: Update colors in `tailwind.config.ts`
4. **Deploy**: Follow `DEPLOYMENT.md` to go live

## Need Help?

- Check `README.md` for full documentation
- Review `supabase/README.md` for database details
- See `DEPLOYMENT.md` for production deployment

## What You Just Built

✅ Full customer order configurator  
✅ Live pricing engine  
✅ Artwork file uploads  
✅ Stripe payment processing  
✅ Admin dashboard  
✅ Order management system  
✅ Email notifications (framework ready)  

**You're ready to take custom screen printing orders online!** 🎨👕

---

**Pro Tip**: Keep the dev server running and experiment! Any changes to the code will auto-reload in the browser.

