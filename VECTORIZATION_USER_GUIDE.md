# How to Use the Vectorization Feature

## For Your Current Situation

You've uploaded PNG files but don't see the vectorization button. Here's what to do:

### Quick Fix Steps:

1. **First Time Setup** (if not done yet):
   - Run the database migration in Supabase SQL editor:
     ```sql
     -- Copy and paste from supabase/migration-add-vectorization.sql
     ```
   - Add your Vectorizer.ai API key to `.env.local`:
     ```env
     VECTORIZER_AI_API_KEY=your_key_here
     ```

2. **Refresh the Page**:
   - Simply refresh your browser (Cmd+R or Ctrl+R)
   - The files should now show with vectorization badges

3. **If Still Not Working**:
   - Click "Remove" on each uploaded file
   - Re-upload them
   - You should now see:
     - Yellow "Raster" badge
     - "Vectorize for Print" button in the toolbar

## How It Works

### Step 1: Upload Your Artwork
- Upload PNG or JPG files as usual
- You'll see a yellow "Raster" badge appear
- The design toolbar will show a prominent "Vectorize for Print" button

### Step 2: Vectorize
- Click the "Vectorize for Print" button
- Wait 5-15 seconds while processing
- The button will show a spinner: "Vectorizing..."

### Step 3: Preview
- Once complete, you'll see:
  - Green "Vectorized ✓" badge
  - A toggle button to switch between original and vectorized preview
- The vectorized version is automatically selected for production

### Step 4: Checkout
- You **must** vectorize all raster files before checkout
- If you try to checkout without vectorizing, you'll see:
  - Disabled "Continue to Checkout" button
  - Warning: "Please vectorize all raster artwork before continuing"

## File Types

### Vector Files (No Vectorization Needed)
- ✅ SVG files
- ✅ AI files
- ✅ EPS files
- These show a green "Vector" badge
- No vectorization button appears

### Raster Files (Need Vectorization)
- ⚠️ PNG files
- ⚠️ JPG/JPEG files
- These show a yellow "Raster" badge
- Must be vectorized before checkout

## Tips

1. **Upload Vector Files When Possible**
   - If you have SVG, AI, or EPS files, upload those instead
   - They don't need vectorization and save processing time

2. **Preview Both Versions**
   - After vectorization, use the toggle button to compare
   - Original vs Vectorized
   - Make sure the vectorized version looks good

3. **Large Files**
   - Vectorization may take longer for complex or large images
   - Be patient during processing

4. **Quality Check**
   - The vectorized version is optimized for screen printing
   - It will have clean edges and solid colors
   - Perfect for creating screens

## Troubleshooting

### "Vectorize" Button Not Showing
1. Refresh the page
2. If still not showing, remove and re-upload the file
3. Make sure database migration was run
4. Check browser console for errors

### Vectorization Fails
1. Check that file is under 50MB
2. Verify Vectorizer.ai API key is configured
3. Try uploading a different file to test
4. Check browser console for error details

### Can't Proceed to Checkout
- Make sure ALL raster files are vectorized
- Look for any yellow "Raster" badges
- Click "Vectorize for Print" on any remaining files

## What Happens Behind the Scenes

1. **File Upload**: Your PNG/JPG is uploaded to Supabase storage
2. **API Call**: File is sent to Vectorizer.ai for conversion
3. **SVG Creation**: Vectorizer.ai creates a clean vector version
4. **Storage**: Both original and vectorized files are saved
5. **Production**: Admin downloads the vectorized SVG for screen printing

## Admin View

When viewing orders, admins will see:
- Both original and vectorized files
- Separate download buttons for each
- Clear indication of which file is for production
- File type badges (Vector/Raster/Vectorized)

## Cost Information

- Vectorization costs approximately $0.02-$0.10 per image
- Charged to your Vectorizer.ai account
- Monitor usage in Vectorizer.ai dashboard
- Consider educating customers to upload vector files when possible

