# Troubleshooting Google Generative AI API Key Error

If you're getting a "Invalid API key" error, follow these steps:

## Quick Fixes

### 1. Restart Your Dev Server
Environment variables are only loaded when Next.js starts. After changing `.env.local`:

```bash
# Stop your dev server (Ctrl+C)
# Then restart it:
npm run dev
```

### 2. Verify API Key in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Find your API key
3. Check:
   - ✅ Key is **enabled**
   - ✅ Key has **API restrictions** set to allow **Generative Language API** (or no restrictions)
   - ✅ Key hasn't been deleted or regenerated

### 3. Enable Required APIs

Make sure these APIs are enabled in your Google Cloud project:

1. Go to [API Library](https://console.cloud.google.com/apis/library)
2. Enable:
   - **Generative Language API**
   - **Gemini API** (if separate)

### 4. Check Billing

The Gemini API may require billing to be enabled:

1. Go to [Billing](https://console.cloud.google.com/billing)
2. Ensure billing is enabled for your project
3. Check if you've exceeded any quotas

### 5. Verify API Key Format

Your `.env.local` should have:

```env
GOOGLE_GENERATIVE_AI_API_KEY=your-actual-api-key-here
```

- No quotes around the value
- No extra whitespace
- Key starts with `AIza...` (typically)

### 6. Check Server Logs

Look at your terminal where `npm run dev` is running. You should see detailed error logs like:

```
========== AI DESIGN GENERATION START ==========
ERROR generating artwork: [actual error message]
  - Error name: [error type]
  - Error status: [status code]
  - Error details: [details]
```

The actual error message will help identify the specific issue.

### 7. Preview Model Access

The code uses `gemini-3-pro-image-preview` which may require:
- Special access/approval from Google
- Being in a preview program
- Different API endpoints

If you lost access to the preview model, you may need to:
- Request access again
- Use a different model (would require code changes)

## Common Error Messages

| Error | Solution |
|-------|----------|
| "API key not valid" | Key expired/revoked - create new key |
| "API key not found" | Key deleted - check Cloud Console |
| "Permission denied" | Enable Generative Language API |
| "Quota exceeded" | Check billing/quota limits |
| "Model not found" | Preview model access lost |

## Get a New API Key

If you need to create a new key:

1. Go to [Credentials](https://console.cloud.google.com/apis/credentials)
2. Click "Create Credentials" → "API Key"
3. Copy the key
4. Update `.env.local`:
   ```env
   GOOGLE_GENERATIVE_AI_API_KEY=your-new-key-here
   ```
5. Restart your dev server

