# Quick Start: Auto-Import Setup

## ✅ 3-Step Setup (5 minutes)

### Step 1: Add API Keys to Environment

Create or edit `.env.local` in your project root:

```env
# S&S Activewear (Official API - Fast & Free)
SSACTIVEWEAR_API_KEY=c7a9a05b-6642-4b15-a03c-2cc97c1d9d83

# AS Colour (AI Extraction - Costs $0.02-0.05 per import)
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### Step 2: Restart Dev Server

```bash
# Stop your dev server (Ctrl+C)
npm run dev
```

### Step 3: Test Import

1. Navigate to: `http://localhost:3000/admin/garments/new`
2. Paste a product URL:
   - S&S: `https://www.ssactivewear.com/p/bella/3001cvc`
   - AS Colour: `https://www.ascolour.com/staple-tee-5001`
3. Click "Import"
4. Done! ✅

## 🎉 What You Get

After import, the form is automatically filled with:
- ✅ Product name, brand, description
- ✅ All available colors (50-100+ variants)
- ✅ Individual images for each color
- ✅ Available sizes
- ✅ Base cost/pricing

Just review and click "Create Garment"!

## 📚 Detailed Guides

- **S&S Activewear**: See `SSACTIVEWEAR_API_SETUP.md`
- **AS Colour**: See `GARMENT_AUTO_IMPORT_SETUP.md`
- **Full Feature Docs**: See `AUTO_IMPORT_COLOR_IMAGES.md`

## 🆘 Troubleshooting

### Error: "API key not configured"
- Check that you added the key to `.env.local`
- Make sure there are no typos
- Restart the dev server

### Error: "Failed to fetch URL: 403 Forbidden"
- This is S&S Activewear blocking web scraping
- Solution: Add the `SSACTIVEWEAR_API_KEY` to your `.env.local`
- See `SSACTIVEWEAR_API_SETUP.md`

### Import works but missing some color images
- Normal for AS Colour (70-90% success rate with AI)
- S&S Activewear gets 100% with official API
- Manually upload any missing images

## 💰 Cost Summary

| Supplier | Method | Cost per Import |
|----------|--------|-----------------|
| S&S Activewear | Official API | **FREE** ✨ |
| AS Colour | AI Extraction | $0.02-0.05 |

## 🚀 Ready to Import!

You're all set! Start importing products and save hours of manual data entry.

