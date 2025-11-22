# Testing Browser Automation Import

## What I Fixed

### Issues Found:
1. ❌ Puppeteer timing out on Mac Silicon (ARM64)
2. ❌ Wrong selectors for AS Colour's color swatches
3. ❌ Only 14 colors extracted instead of 70+
4. ❌ No color-specific images (only generic MAIN, FRONT, BACK keys)

### Fixes Applied:
1. ✅ Added system Chrome detection for Mac Silicon compatibility
2. ✅ Increased timeouts (60s launch, 45s navigation)
3. ✅ Better selector patterns for AS Colour's structure:
   - `label[for^="swatch-"]` - Label elements with swatch IDs
   - `input[name="colour"]` - Radio inputs for colors
   - `[data-product-option-value]` - Product option values
4. ✅ Improved image extraction with multiple fallback selectors
5. ✅ Better error handling and logging
6. ✅ Increased wait time between clicks (1200ms)

## Quick Test

### Test the Enhanced Import

1. **Restart your dev server** (to pick up the changes):
   ```bash
   # Press Ctrl+C in your terminal, then:
   npm run dev
   ```

2. **Navigate to**:
   ```
   http://localhost:3000/admin/garments/new
   ```

3. **Paste AS Colour URL**:
   ```
   https://www.ascolour.com/staple-tee-5001
   ```

4. **Check the box**:
   ```
   ☑ Use browser automation (recommended for AS Colour)
   ```

5. **Click "Import"** and watch the terminal

## What to Expect

### In the Terminal (Success):
```
✓ Launching headless browser for AS Colour...
✓ Found Chrome at: /Applications/Google Chrome.app/Contents/MacOS/Google Chrome
✓ Using system Chrome for better ARM64 compatibility
✓ Navigating to: https://www.ascolour.com/staple-tee-5001
✓ Waiting for page elements to load...
✓ Found 72 swatches using selector: label[for^="swatch-"]
✓ Color names extracted: ["White", "Cream", "Natural", ...] (72 total)
✓ Found 72 colors, clicking through each...
✓ Color 1/72: White -> https://cdn11.bigcommerce.com/...white-front.jpg
✓ Color 2/72: Cream -> https://cdn11.bigcommerce.com/...cream-front.jpg
✓ Color 3/72: Natural -> https://cdn11.bigcommerce.com/...natural-front.jpg
...
✓ Extracted 72 color images via browser automation
✓ Successfully extracted data
```

### In the Browser:
After ~30-60 seconds, you should see:
- ✅ Success message
- ✅ All 72 colors listed
- ✅ Each color has its own product image preview
- ✅ Product details filled in

### If It Still Times Out:

If Chrome still doesn't launch, you have a few options:

#### Option 1: Use Standard Import (Fallback)
Uncheck the browser automation box and just use standard import. It will still get basic data, you can add images manually.

#### Option 2: Install Chrome
```bash
# Make sure Google Chrome is installed
open -a "Google Chrome"
```

#### Option 3: Set Environment Variable
Add to your `.env.local`:
```bash
PUPPETEER_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

#### Option 4: Use Different Browser
Install Chromium:
```bash
brew install --cask chromium
```

Then update `.env.local`:
```bash
PUPPETEER_EXECUTABLE_PATH="/Applications/Chromium.app/Contents/MacOS/Chromium"
```

## Expected Performance

| Metric | Value |
|--------|-------|
| **Colors Extracted** | 70-80 (all available) |
| **Color Images** | 70-80 (one per color) |
| **Total Time** | 40-90 seconds |
| **Browser Launch** | 3-5 seconds |
| **Page Load** | 5-10 seconds |
| **Click Each Color** | ~1.2s × 72 = ~90 seconds |
| **Claude Processing** | 2-3 seconds |

## Troubleshooting

### Still Timing Out?

**Check Chrome Installation:**
```bash
ls -la "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

Should show:
```
-rwxr-xr-x  1 user  admin  ... Google Chrome
```

**Check Architecture:**
```bash
file "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

Should include `arm64` for Mac Silicon:
```
Mach-O universal binary with 2 architectures: [x86_64:Mach-O 64-bit executable x86_64] [arm64:Mach-O 64-bit executable arm64]
```

### Only Getting Some Colors?

If you get colors but not all of them:
1. Check the terminal logs - what selector found the swatches?
2. The page might have loaded slowly - increase timeouts
3. Some colors might be hidden/disabled

### Images Not Matching Colors?

If color names don't match images:
1. Check terminal - does it show correct color names?
2. The site might have changed structure
3. Try refreshing and importing again

### Browser Opens But Doesn't Navigate?

Network issue - check:
```bash
curl -I https://www.ascolour.com/staple-tee-5001
```

Should return `200 OK`.

## Manual Verification

After import completes, verify:

1. **Color Count**: Should show 70+ colors in the form
2. **Each Color Has Image**: Scroll through, each should show a preview
3. **Images Are Different**: Click through a few - White should show white shirt, Black should show black shirt
4. **No Duplicates**: Color names should be unique

## Production Deployment

For production (Vercel, etc.), you'll need:

```bash
npm install @sparticuz/chromium puppeteer-core
```

And update the route to use serverless Chrome. See `BROWSER_AUTOMATION_IMPORT.md` section "Vercel/Serverless Considerations".

## Performance Tips

### Speed It Up:
1. **Reduce wait time**: Change `1200ms` to `800ms` if your internet is fast
2. **Parallel processing**: Process 2-3 colors at once (complex)
3. **Cache results**: Save imported data for 24 hours

### Reduce Costs:
1. **Only use when needed**: Uncheck the box for quick imports
2. **Import once, edit later**: Don't re-import just to change price
3. **Batch import**: Import multiple products in one session

## Success Criteria

✅ **Full Success:**
- 70+ colors found
- 70+ color images captured
- Each image URL is unique
- Each image URL contains the product code (5001)
- Total time < 2 minutes

⚠️ **Partial Success:**
- 70+ colors found
- 20-50 color images captured
- Some images missing but core colors present
- You can manually upload missing ones

❌ **Failure:**
- Browser timeout
- < 10 colors found
- No images captured
- Falls back to standard import

## Next Steps After Successful Import

1. **Review the data**: Check product name, description, price
2. **Verify a few colors**: Click through 3-4 colors to ensure images match
3. **Adjust as needed**: Fix any color names, update prices
4. **Save the garment**: Click "Create Garment"
5. **Test on frontend**: View the garment in your customer-facing catalog

## Still Having Issues?

If after all these fixes it still doesn't work:

1. **Check your Chrome version**:
   ```bash
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --version
   ```
   Should be v120+

2. **Check Node version**:
   ```bash
   node --version
   ```
   Should be v18+ and ARM64:
   ```bash
   node -p "process.arch"
   ```
   Should output: `arm64`

3. **Reinstall with correct architecture**:
   ```bash
   # Using nvm for ARM64 Node
   nvm install 20
   nvm use 20
   node -p "process.arch"  # Should be arm64
   ```

4. **Last resort - disable browser automation**:
   Just uncheck the box and use standard import. The HTML scraping will still get basic data, you can add images manually.

## Contact / Issues

If you're still stuck:
- Check the terminal for full error logs
- Try a different AS Colour product URL
- Test with S&S Activewear URL (those work differently)
- Consider using standard import + manual image upload for now

The browser automation is a nice-to-have feature, not required. The system works fine without it!

