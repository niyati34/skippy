# 🚀 Vercel Deployment Setup - Complete Guide

## Step 1: Clean Up Old Azure Variables ❌

Go to your Vercel project settings and **DELETE** these old Azure variables:

1. Go to https://vercel.com/dashboard
2. Select your `skippy` project (skippy-kohl.vercel.app)
3. Go to **Settings** → **Environment Variables**
4. **Delete** ALL of these if they exist:
   - `VITE_OPENAI_API_BASE`
   - `VITE_AZURE_OPENAI_KEY`
   - `VITE_AZURE_OPENAI_DEPLOYMENT`
   - `VITE_AZURE_OPENAI_API_VERSION`
   - `OPENAI_API_BASE`
   - `AZURE_OPENAI_API_KEY`
   - `AZURE_OPENAI_DEPLOYMENT_NAME`
   - `AZURE_OPENAI_API_VERSION`

## Step 2: Import New Environment Variables ✅

### Method A: Bulk Import (Recommended - Fastest)

1. In Vercel dashboard → Your project → **Settings** → **Environment Variables**
2. Look for **"Import .env"** or **"Bulk Import"** button (usually at the top right)
3. Copy the contents of `.env.vercel` file and paste it
4. Make sure to select:
   - ✅ **Production**
   - ✅ **Preview**
   - ✅ **Development**
5. Click **Import** or **Save**

### Method B: Manual Entry (If bulk import not available)

Add these variables ONE BY ONE in Vercel:

**Required API Keys:**

```
OPENROUTER_API_KEY = your-openrouter-api-key-here
GEMINI_API_KEY = your-gemini-api-key-here
```

> ⚠️ **Get your keys from:**
>
> - OpenRouter: https://openrouter.ai/keys
> - Gemini: https://aistudio.google.com/app/apikey

**Password Configuration:**

```
UNLOCK_PASSWORDS = password,unlock,skippy,123,admin,test,onestring7
UNLOCK_SESSION_SECRET = prod-secret-change-this-xyz123
```

**Client Variables (VITE\_ prefix):**

```
VITE_GEMINI_API_KEY = your-gemini-api-key-here
VITE_GEMINI_MODEL = gemini-2.5-flash
VITE_GEMINI_API_BASE = https://generativelanguage.googleapis.com/v1beta
VITE_DISABLE_OPENROUTER = false
VITE_OPENROUTER_MODEL = deepseek/deepseek-r1-0528:free
VITE_AI_TIMEOUT_MS = 240000
VITE_PROD_URL = https://skippy-kohl.vercel.app
```

**API Configuration:**

```
OPENROUTER_MODEL = deepseek/deepseek-r1-0528:free
OPENROUTER_API_BASE = https://openrouter.ai/api
GEMINI_MODEL = gemini-2.5-flash
GEMINI_API_BASE = https://generativelanguage.googleapis.com/v1beta
PUBLIC_URL = https://skippy-kohl.vercel.app
OPENROUTER_REFERER = https://skippy-kohl.vercel.app
```

**Security Settings:**

```
UNLOCK_PASSWORD = password
UNLOCK_MAX_ATTEMPTS = 5
UNLOCK_LOCKOUT_SECONDS = 300
UNLOCK_SESSION_TTL = 86400
OPENROUTER_ALLOW_CLIENT_MODEL = 1
VITE_PROXY_PORT = 5174
```

## Step 3: Redeploy 🔄

After updating environment variables:

1. Go to **Deployments** tab in Vercel
2. Find the latest deployment
3. Click the **three dots (⋮)** menu
4. Click **Redeploy**
5. ✅ Check "Use existing Build Cache" (faster)
6. Click **Redeploy**

## Step 4: Test Your Deployed Site 🧪

Once redeployed (takes 1-2 minutes):

1. Visit: https://skippy-kohl.vercel.app
2. When Skippy asks for password, try any of these:
   - `password`
   - `unlock`
   - `skippy`
   - `123`
3. ✅ You should get access!

## Troubleshooting 🔧

### If password still doesn't work:

1. Check browser console (F12) for errors
2. Verify `UNLOCK_PASSWORDS` is set correctly in Vercel
3. Make sure you clicked **Redeploy** after changing env vars
4. Clear browser cache and try again

### If AI features don't work:

1. Check if `GEMINI_API_KEY` is set correctly
2. Verify the key is valid at: https://aistudio.google.com/app/apikey
3. Check browser console for API errors
4. Make sure `VITE_GEMINI_API_KEY` is also set (with VITE\_ prefix)

### If you see "Access Denied" or 401 errors:

1. Verify `UNLOCK_PASSWORDS` includes the password you're typing
2. Check that `UNLOCK_SESSION_SECRET` is set
3. Try a different password from the list
4. Clear cookies and try again

## What Changed? 📝

### ❌ Removed (Old Azure Setup):

- All `AZURE_OPENAI_*` variables
- Azure-specific API configurations
- Azure deployment dependencies

### ✅ Added (New Gemini + OpenRouter Setup):

- Gemini API for free AI features
- OpenRouter API for advanced models
- Flexible password system
- Better session management
- Client-side environment variable support

## Security Note 🔒

The `.env.vercel` file contains your API keys.

**Never commit this file to GitHub!**

It's already in `.gitignore` to prevent accidental commits.

## Quick Reference 📋

**Your site:** https://skippy-kohl.vercel.app
**Vercel dashboard:** https://vercel.com/dashboard
**Google AI Studio (Gemini keys):** https://aistudio.google.com/app/apikey
**OpenRouter (if needed):** https://openrouter.ai/keys

## Need Help? 💬

If you encounter any issues:

1. Check the Vercel deployment logs
2. Look at browser console (F12 → Console tab)
3. Verify all environment variables are set correctly
4. Make sure you redeployed after changing variables

---

**That's it!** Your site should now work with the new API setup and password system. 🎉
