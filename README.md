# My Swag Co - Custom Screen Printing Web App

A modern, full-stack web application for custom screen printing orders with live pricing, artwork uploads, and order management.

## Features

### Customer-Facing
- 🎨 **Custom Product Configurator** - Choose garments, sizes, colors, and print locations
- 💰 **Live Quote Engine** - Real-time pricing based on quantity and configuration
- 📤 **Artwork Upload** - Support for PNG, JPG, PDF, AI, EPS, SVG files
- 💳 **Stripe Payments** - Secure deposit payments with balance due later
- 📧 **Email Notifications** - Automated order confirmations and updates
- 📱 **Responsive Design** - Works perfectly on desktop, tablet, and mobile

### Admin Panel
- 📊 **Dashboard** - Overview of orders, pending reviews, and production status
- 📦 **Order Management** - View, update, and track all orders
- 👕 **Garment Catalog** - Manage product offerings
- 💵 **Pricing Configuration** - Control pricing tiers and print costs
- 🔐 **Secure Authentication** - Admin-only access with Supabase Auth

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage
- **Payments**: Stripe
- **State Management**: Zustand
- **Validation**: Zod
- **Email**: Resend (ready to integrate)

## Prerequisites

- Node.js 18+ and npm
- A Supabase account (free tier works)
- A Stripe account (test mode for development)
- Optional: Resend API key for emails

## Getting Started

### 1. Clone and Install

```bash
cd myswagco
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the SQL schema from `supabase/schema.sql` in your Supabase SQL Editor
3. Create a storage bucket called `artwork`:
   - Go to Storage → Create bucket → Name: `artwork`, Public: Off
4. Get your API keys from Settings → API

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_your-key
STRIPE_SECRET_KEY=sk_test_your-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Email (Optional - for production)
RESEND_API_KEY=re_your-key

# Google Places API (Optional - for smart address autocomplete)
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=your-google-places-api-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Set Up Stripe Webhooks (for local development)

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/payments/webhook
```

Copy the webhook signing secret to your `.env.local` as `STRIPE_WEBHOOK_SECRET`.

### 5. Create Admin User

In your Supabase dashboard:
1. Go to Authentication → Users
2. Click "Add user"
3. Enter email and password for your admin account

### 6. Set Up Google Places API (Optional - Smart Address Fill)

The checkout page includes a smart address autocomplete feature that auto-fills shipping address fields. To enable it:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Places API** (Search: "Places API" → Enable)
4. Go to **APIs & Services** → **Credentials**
5. Create an **API Key**
6. **Important**: Restrict the key for security:
   - Application restrictions: HTTP referrers
   - Add your domains: `localhost:*`, `your-production-domain.com/*`
   - API restrictions: Places API only
7. Copy the API key to your `.env.local` as `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY`

> **Note**: The checkout form works without this key - users can manually type addresses. The smart fill feature is an enhancement for better UX.

### 7. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
myswagco/
├── app/                          # Next.js app directory
│   ├── api/                      # API routes
│   │   ├── artwork/              # Artwork upload endpoints
│   │   ├── garments/             # Garment endpoints
│   │   ├── orders/               # Order management endpoints
│   │   ├── payments/             # Stripe payment endpoints
│   │   └── quote/                # Pricing quote endpoint
│   ├── admin/                    # Admin panel pages
│   │   ├── garments/             # Garment management
│   │   ├── orders/               # Order management
│   │   ├── pricing/              # Pricing configuration
│   │   └── login/                # Admin login
│   ├── custom-shirts/            # Customer-facing pages
│   │   ├── configure/            # Product configurator
│   │   └── orders/               # Order confirmation
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page
├── components/                   # Shared components
│   └── AdminLayout.tsx           # Admin panel layout
├── lib/                          # Utility libraries
│   ├── email.ts                  # Email notification functions
│   ├── pricing.ts                # Pricing calculation logic
│   ├── schemas.ts                # Zod validation schemas
│   ├── store/                    # Zustand stores
│   └── supabase/                 # Supabase clients
├── supabase/                     # Supabase configuration
│   ├── schema.sql                # Database schema
│   └── README.md                 # Supabase setup guide
├── types/                        # TypeScript types
│   └── index.ts                  # Core data models
├── .env.local.example            # Environment variables template
├── next.config.js                # Next.js configuration
├── tailwind.config.ts            # Tailwind CSS configuration
└── package.json                  # Dependencies
```

## Key Workflows

### Customer Order Flow

1. Customer lands on `/custom-shirts`
2. Selects a garment from `/custom-shirts/configure`
3. Configures sizes, quantities, and print locations
4. Uploads artwork files
5. Reviews order and enters shipping info
6. Pays 50% deposit via Stripe
7. Order created with status "Pending Art Review"
8. Confirmation email sent

### Admin Order Processing

1. Admin logs in to `/admin`
2. Views pending orders in dashboard
3. Reviews artwork and updates order status:
   - **Art Approved** → Move to "In Production"
   - **Revision Needed** → Contact customer
4. Before shipping, update to "Balance Due"
5. After final payment, mark "Ready to Ship"
6. Mark "Completed" when shipped

## Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Visit [vercel.com](https://vercel.com) and import your repository
3. Add environment variables from `.env.local`
4. Deploy!

### Set Up Production Stripe Webhook

1. In Stripe Dashboard, go to Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/payments/webhook`
3. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Copy the signing secret to your production environment variables

### Configure Supabase for Production

1. Create a production Supabase project (or use the same one)
2. Update RLS policies if needed for production
3. Configure custom domain for Supabase (optional)

## Database Management

All database management is done through Supabase:

- **Add Garments**: Insert rows in the `garments` table
- **Adjust Pricing**: Update `pricing_tiers` and `print_pricing` tables
- **Configure App Settings**: Update `app_config` table
- **View Orders**: Query `orders` table

Example SQL to add a garment:

```sql
INSERT INTO garments (name, brand, description, active, base_cost, available_colors, size_range, pricing_tier_id)
VALUES (
  'Premium Heavy Cotton Tee',
  'Gildan',
  'Ultra-comfortable heavyweight cotton t-shirt',
  true,
  7.50,
  ARRAY['White', 'Black', 'Navy', 'Grey'],
  ARRAY['S', 'M', 'L', 'XL', '2XL'],
  (SELECT id FROM pricing_tiers WHERE name = 'Tier 1: 24-47')
);
```

## Customization

### Modify Pricing Logic

Edit `lib/pricing.ts` to change how costs are calculated.

### Add New Print Locations

1. Update the `PrintLocation` type in `types/index.ts`
2. Add to the `PRINT_LOCATIONS` array in configuration wizard
3. Update validation in `lib/schemas.ts`

### Customize Email Templates

Edit functions in `lib/email.ts` to modify email content and styling.

### Change Minimum Order Quantity

Update the `min_order_quantity` in the `app_config` table and the validation in `lib/schemas.ts`.

## Testing

### Test Customer Flow

1. Navigate to `/custom-shirts`
2. Select a garment
3. Configure with at least 24 pieces
4. Choose print locations
5. Upload test artwork files
6. Use Stripe test card: `4242 4242 4242 4242`
7. Verify order appears in admin panel

### Test Admin Flow

1. Login at `/admin/login`
2. View dashboard statistics
3. Click into an order
4. Update status
5. Add internal notes
6. Download artwork files

### Stripe Test Cards

- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- **Requires Auth**: 4000 0025 0000 3155

## Troubleshooting

### "Failed to fetch garments"

- Check Supabase URL and anon key in `.env.local`
- Verify RLS policies allow public read access to garments table

### "Payment intent creation failed"

- Verify Stripe secret key is correct
- Check that amount is > 0
- Ensure Stripe is in test mode during development

### Middleware authentication errors

- Run `npm install @supabase/auth-helpers-nextjs @supabase/ssr`
- Clear browser cookies and try again
- Check Supabase auth configuration

### Artwork upload fails

- Verify storage bucket named "artwork" exists
- Check bucket policies allow service role uploads
- Ensure file size is under 50MB

## Production Checklist

- [ ] Update all environment variables for production
- [ ] Set up Stripe webhook with production endpoint
- [ ] Configure production Supabase project
- [ ] Set up custom domain
- [ ] Enable SSL/HTTPS
- [ ] Configure email service (Resend) with production API key
- [ ] Test complete order flow in production
- [ ] Set up error monitoring (optional: Sentry)
- [ ] Configure analytics (optional: Vercel Analytics)
- [ ] Review and tighten Supabase RLS policies
- [ ] Set up database backups
- [ ] Document admin procedures

## Future Enhancements

Phase 2 features (not in current implementation):
- Shopify integration for storefront
- Printavo API integration for production workflow
- Customer portal for order tracking
- Advanced analytics and reporting
- Bulk order templates
- Design mockup generator with product images
- Multi-location shipping addresses
- Subscription/recurring orders

## Support

For issues or questions:
1. Check the Supabase logs in your dashboard
2. Review Next.js build logs in Vercel
3. Check Stripe webhook delivery in dashboard
4. Enable verbose logging in development

## License

This project is proprietary software for My Swag Co.

---

Built with ❤️ using Next.js, Supabase, and Stripe

