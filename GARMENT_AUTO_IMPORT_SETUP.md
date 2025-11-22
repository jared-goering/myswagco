# Garment Auto-Import Feature - Setup Guide

## Overview

The garment auto-import feature allows admins to automatically extract product information from supplier websites (S&S Activewear and AS Colour) using AI-powered web scraping.

## Features

- **Supported Suppliers**: 
  - S&S Activewear (ssactivewear.com)
  - AS Colour (ascolour.com)
  
- **Extracted Data**:
  - Product name
  - Brand name
  - Description (fabric, weight, fit details)
  - **All available colors** (comprehensive extraction of every color variant)
  - Available sizes
  - Product thumbnail image URL
  - **Color-specific images** (when available, maps each color to its image)
  - Base cost (if visible on page)

- **Cost**: ~$0.02-0.08 per product import (one-time per garment, varies by page size and number of colors)

## Setup Instructions

### 1. Get API Keys

#### For S&S Activewear (Official API - Recommended)
✅ **You already have this!** See `SSACTIVEWEAR_API_SETUP.md`

Your API key: `c7a9a05b-6642-4b15-a03c-2cc97c1d9d83`

#### For AS Colour (AI Extraction)
1. Visit [https://console.anthropic.com/](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to "API Keys"
4. Create a new API key
5. Copy the key (starts with `sk-ant-...`)

### 2. Add Environment Variables

Add the following to your `.env.local` file:

```env
# Required for AS Colour imports (AI extraction)
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Required for S&S Activewear imports (Official API)
SSACTIVEWEAR_API_KEY=c7a9a05b-6642-4b15-a03c-2cc97c1d9d83
```

**Important**: Make sure to restart your Next.js development server after adding environment variables.

**Note**: If you only have one API key, that supplier will work and the other will show an error message.

### 3. Restart Development Server

```bash
npm run dev
```

## Usage

### Adding a New Garment with Auto-Import

1. Log in to the admin panel at `/admin/login`
2. Navigate to Garments → "Add New Garment"
3. At the top of the form, you'll see the "Quick Import from Supplier URL" section
4. Paste a product URL from a supported supplier, for example:
   - `https://www.ssactivewear.com/p/bella/3001cvc`
   - `https://www.ascolour.com/staple-tee-5001`
5. Click the "Import" button
6. Wait for the AI to extract the data (usually 3-6 seconds)
7. **The form will auto-populate** with:
   - Product name, brand, and description
   - ALL available colors (every variant)
   - **Individual images for each color** (displayed in the color image upload sections)
   - Available sizes
   - Base cost (if found)
8. Review the imported data - each color should show its specific image
9. Complete any remaining fields (pricing tier, etc.)
10. Click "Create Garment" to save

## How It Works

1. **URL Validation**: The system checks if the URL is from a supported supplier
2. **HTML Fetching**: The page HTML is downloaded from the supplier website (up to 150KB)
3. **Structured Data Extraction**: Extracts JSON-LD and JavaScript product data from the page
4. **AI Extraction**: Claude AI (via Anthropic API) comprehensively extracts:
   - Product details and description
   - **Every available color** (looks for color swatches, dropdowns, lists, variant data)
   - **Individual color images** (from structured data and page elements)
   - Sizes, pricing, and other metadata
5. **Form Pre-fill**: The extracted data pre-fills ALL form fields including:
   - Basic product information
   - **Per-color image upload fields** (each color shows its imported image)
   - Sizes and pricing
6. **Manual Review**: Admin can review and adjust any fields before saving

## Error Handling

If the import fails, you'll see an error message. Common issues:

- **"Unsupported supplier"**: Only ssactivewear.com and ascolour.com are currently supported
- **"Invalid URL format"**: Make sure you've pasted a complete, valid URL
- **"Failed to fetch URL"**: The website may be down or blocking requests
- **"Failed to extract product data"**: The page structure may have changed or be incompatible

If you encounter errors, you can always manually fill in the form fields.

## Cost Management

Each import costs approximately $0.02-0.08 depending on page complexity:
- Small product pages (10-20 colors): ~$0.02-0.03
- Large product pages (50+ colors with images): ~$0.05-0.08

This is a one-time cost per garment when you add it to your catalog. The enhanced extraction (all colors + images) uses more tokens but provides comprehensive data.

## Future Enhancements

- **S&S Activewear API Integration**: When you obtain API credentials, this can be replaced with direct API calls (free)
- **Additional Suppliers**: More suppliers can be added based on demand
- **Caching**: Avoid re-importing the same product multiple times
- **Bulk Import**: Import multiple products at once

## Troubleshooting

### "API key not configured" error

Make sure:
1. You've added `ANTHROPIC_API_KEY` to your `.env.local` file
2. The key is correct (starts with `sk-ant-`)
3. You've restarted the development server after adding the key

### Import takes too long

- Typical import time: 2-5 seconds
- If it takes longer than 10 seconds, check your internet connection
- Try refreshing and importing again

### Imported data is incorrect

The AI does its best to extract data, but:
- Always review the imported data before saving
- Edit any fields that aren't correct
- Some websites are easier to extract from than others

## Technical Details

- **API Endpoint**: `/api/garments/import-from-url`
- **AI Model**: Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)
- **Max Tokens**: 4,000 per request (increased for comprehensive color extraction)
- **HTML Limit**: 150,000 characters (increased to capture all color variants)
- **Implementation**: `app/api/garments/import-from-url/route.ts`
- **UI Component**: `components/GarmentForm.tsx`

## Support

If you encounter any issues or need to add support for additional suppliers, please contact your developer.

