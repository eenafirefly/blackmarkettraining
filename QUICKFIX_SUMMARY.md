# OAuth 404 Fix - Quick Summary

## Problem
Social login buttons on Shopify store return **404 Not Found** errors.

## Root Cause
- OAuth routes existed but had callback URL mismatches
- Routes referenced `/api/auth/*` but weren't mounted there
- Environment variables missing from Render

## Solution Applied

### 1. Created Dedicated Auth Routes
**New file:** `src/routes/auth.js`
- Contains all OAuth logic (Google, aXcelerate)
- Properly configured callback URLs
- Clean separation from other API routes

### 2. Updated Main Application
**Modified:** `src/index.js`
- Imported auth routes
- Mounted at `/api/auth`

### 3. Updated Render Configuration  
**Modified:** `render.yaml`
- Added `AXCELERATE_WS_URL`
- Added `GOOGLE_CLIENT_ID`
- Added `GOOGLE_CLIENT_SECRET`

## What You Need to Do NOW

### 1️⃣ Get Google OAuth Credentials (5 minutes)

1. Go to: https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 Client ID
3. Set redirect URI to: `https://YOUR-APP.onrender.com/api/auth/google/callback`
4. Copy Client ID and Client Secret

### 2️⃣ Add to Render Environment (2 minutes)

Go to Render dashboard → your service → Environment tab:

```
AXCELERATE_WS_URL=yourdomain.stg.axcelerate.com
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
```

Click "Save Changes" (Render will auto-deploy)

### 3️⃣ Deploy Code (1 minute)

```bash
git add .
git commit -m "Fix OAuth 404 errors for Shopify"
git push
```

### 4️⃣ Test (1 minute)

Visit:
```
https://YOUR-APP.onrender.com/api/auth/google/login?instanceId=123&redirectUrl=https://www.blackmarkettraining.com/
```

Should redirect to Google login (not 404).

## Endpoints Now Available

✅ `/api/auth/google/login` - Google OAuth login  
✅ `/api/auth/google/callback` - Google OAuth callback  
✅ `/api/auth/axcelerate/login` - aXcelerate native login  
✅ `/api/auth/axcelerate/callback` - aXcelerate callback  
✅ `/api/auth/enroll/authenticated` - Enroll authenticated user

## Files Changed

- ✅ `src/routes/auth.js` - NEW (OAuth routes)
- ✅ `src/index.js` - Updated (mount auth routes)
- ✅ `render.yaml` - Updated (add env vars)
- ✅ `SHOPIFY_AUTH_SETUP.md` - NEW (full guide)

## Quick Test Commands

```bash
# Health check
curl https://YOUR-APP.onrender.com/health

# Test Google OAuth (in browser)
https://YOUR-APP.onrender.com/api/auth/google/login?instanceId=123&redirectUrl=https://www.blackmarkettraining.com/
```

## Full Documentation

See `SHOPIFY_AUTH_SETUP.md` for:
- Complete setup instructions
- Shopify integration examples
- Troubleshooting guide
- Security best practices

---

**Time to fix:** ~10 minutes  
**Status:** Ready to deploy  
**Next:** Add environment variables in Render

