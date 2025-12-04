# Quick Fix & Deploy - OAuth redirect_uri_mismatch

## What Was Wrong

Your Render app was detecting `http://` instead of `https://` because Express doesn't automatically detect HTTPS behind a reverse proxy.

## Changes Made

✅ **Fixed:** Force HTTPS for Google OAuth redirect URIs
✅ **Fixed:** Added `app.set('trust proxy', 1)` to detect HTTPS correctly

## Deploy Steps (2 minutes)

### Step 1: Deploy to Render

```bash
cd /Users/sheena/Documents/NODA/BMT/blackmarkettraining

# Add changes
git add src/routes/auth.js src/index.js

# Commit
git commit -m "Fix OAuth redirect_uri to use HTTPS"

# Push to trigger Render deployment
git push origin main
```

Wait 2-3 minutes for Render to deploy.

### Step 2: Configure Google Cloud Console

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click on your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**, add:

```
https://blackmarkettraining.onrender.com/api/auth/google/callback
```

**IMPORTANT:** Make sure it's `https://` (not `http://`)!

4. Click **SAVE**

### Step 3: Test Again

After deploying and updating Google Console:

```
https://blackmarkettraining.onrender.com/api/auth/google/login?instanceId=123&redirectUrl=https://www.google.com
```

You should now be redirected to Google's login page (not get an error).

## Your Correct URLs

Your Render app URL:
```
https://blackmarkettraining.onrender.com
```

**Google OAuth Redirect URI (add to Google Console):**
```
https://blackmarkettraining.onrender.com/api/auth/google/callback
```

**Shopify store URL:**
```
https://blackmarket-training.myshopify.com
```

## After Successful Deploy

Update your Shopify snippet (`snippets/axcelerate-enrollment-widget.liquid`) line 473:

```javascript
const RENDER_APP_URL = 'https://blackmarkettraining.onrender.com';
```

## Environment Variables Checklist

Make sure these are set in Render:
- ✅ `AXCELERATE_WS_URL=blackmarket.app.axcelerate.com`
- ✅ `GOOGLE_CLIENT_ID=your_google_client_id`
- ✅ `GOOGLE_CLIENT_SECRET=your_google_client_secret`

---

**Total time:** ~5 minutes (deploy + Google Console config)

