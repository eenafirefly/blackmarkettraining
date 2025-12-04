# Shopify Social Login Setup Guide

This guide is for setting up OAuth social authentication for your **Shopify + aXcelerate** integration on Render.

> **Note:** This is for Shopify integration only. The WordPress plugin (`ax_plugin` folder) is not used.

## What Was Fixed

✅ **Created dedicated auth routes** (`src/routes/auth.js`)
✅ **Mounted auth endpoints** at `/api/auth/*`  
✅ **Added environment variables** to `render.yaml`  
✅ **Fixed callback URL mismatches** causing 404 errors

## Step 1: Configure OAuth Providers

### Google OAuth (Recommended)

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/apis/credentials
   - Create a new project or select existing one

2. **Create OAuth 2.0 Client ID:**
   - Click **"Create Credentials"** → **"OAuth client ID"**
   - Application type: **Web application**
   - Name: `Black Market Training - Shopify Auth`

3. **Configure Authorized URLs:**
   
   **Authorized JavaScript origins:**
   ```
   https://shopify-axcelerate-integration.onrender.com
   https://www.blackmarkettraining.com
   ```
   
   **Authorized redirect URIs:**
   ```
   https://shopify-axcelerate-integration.onrender.com/api/auth/google/callback
   https://www.blackmarkettraining.com/api/auth/google/callback
   ```
   
   (Replace with your actual Render app URL)

4. **Save Credentials:**
   - Copy **Client ID** (looks like: `xxxxx.apps.googleusercontent.com`)
   - Copy **Client Secret** (looks like: `GOCSPX-xxxxx`)

## Step 2: Add Environment Variables to Render

1. **Go to your Render Dashboard:**
   - Navigate to your service
   - Click on **"Environment"** tab

2. **Add the following environment variables:**

   ```bash
   # aXcelerate OAuth (Required for aXcelerate login)
   AXCELERATE_WS_URL=yourdomain.stg.axcelerate.com
   # Example: blackmarket.stg.axcelerate.com (NO https://, NO /api)
   
   # Google OAuth (Required for Google login)
   GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-your_secret_here
   ```

3. **Click "Save Changes"** - Render will automatically redeploy

## Step 3: Deploy Your Changes

```bash
# Commit and push the fixes
git add src/routes/auth.js src/index.js render.yaml
git commit -m "Fix OAuth authentication for Shopify integration"
git push origin main
```

Render will automatically deploy when you push.

## Step 4: Test Authentication

### Test Health Endpoint First
```bash
curl https://your-app.onrender.com/health
```

Should return:
```json
{
  "status": "ok",
  "timestamp": "2025-12-04T...",
  "service": "shopify-axcelerate-integration"
}
```

### Test Google Login
Visit this URL in your browser:
```
https://your-app.onrender.com/api/auth/google/login?instanceId=123&redirectUrl=https://www.blackmarkettraining.com/
```

**Expected behavior:**
1. Redirects to Google login page
2. You log in with Google
3. Redirects back to your Shopify store with `?auth_token=xxx&contact_id=123`

### Test aXcelerate Login
Visit:
```
https://your-app.onrender.com/api/auth/axcelerate/login?instanceId=123&redirectUrl=https://www.blackmarkettraining.com/
```

## Available Endpoints

All authentication endpoints are now at `/api/auth/*`:

### Google OAuth
```
GET /api/auth/google/login
    Query params:
    - instanceId (required): Course instance ID
    - courseId (optional): Course ID
    - courseType (optional): Default 'p'
    - redirectUrl (optional): Where to redirect after auth

GET /api/auth/google/callback
    (Handled automatically by Google OAuth flow)
```

### aXcelerate Native Login
```
GET /api/auth/axcelerate/login
    Query params:
    - instanceId (required): Course instance ID
    - courseId (optional): Course ID
    - courseType (optional): Default 'p'
    - redirectUrl (optional): Where to redirect after auth

GET /api/auth/axcelerate/callback
    (Handled automatically by aXcelerate OAuth flow)
```

### Authenticated Enrollment
```
POST /api/auth/enroll/authenticated
    Headers:
    - Authorization: Bearer {auth_token}
    
    Body:
    {
      "instanceId": "123",
      "courseType": "p"
    }
```

## Shopify Integration Examples

### Option 1: Direct Link Buttons

Add these buttons to your Shopify product pages or custom pages:

```html
<!-- Google Login Button -->
<a href="https://your-app.onrender.com/api/auth/google/login?instanceId={{ product.metafields.custom.course_instance_id }}&redirectUrl=https://www.blackmarkettraining.com/pages/enroll-success" 
   class="btn btn-google">
  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width="18" height="18">
  Continue with Google
</a>

<!-- aXcelerate Login Button -->
<a href="https://your-app.onrender.com/api/auth/axcelerate/login?instanceId={{ product.metafields.custom.course_instance_id }}&redirectUrl=https://www.blackmarkettraining.com/pages/enroll-success" 
   class="btn btn-axcelerate">
  Login with aXcelerate
</a>
```

### Option 2: JavaScript Integration

```javascript
// Add to your Shopify theme or custom app

function loginWithGoogle(instanceId) {
  const baseUrl = 'https://your-app.onrender.com/api/auth/google/login';
  const redirectUrl = `${window.location.origin}/pages/enroll-success`;
  
  const params = new URLSearchParams({
    instanceId: instanceId,
    redirectUrl: redirectUrl
  });
  
  window.location.href = `${baseUrl}?${params}`;
}

function loginWithAxcelerate(instanceId) {
  const baseUrl = 'https://your-app.onrender.com/api/auth/axcelerate/login';
  const redirectUrl = `${window.location.origin}/pages/enroll-success`;
  
  const params = new URLSearchParams({
    instanceId: instanceId,
    redirectUrl: redirectUrl
  });
  
  window.location.href = `${baseUrl}?${params}`;
}

// Usage:
// <button onclick="loginWithGoogle('123')">Login with Google</button>
```

### Option 3: Handling the Auth Token

After successful authentication, the user is redirected back with an auth token:

```javascript
// On your success page (e.g., /pages/enroll-success)

const urlParams = new URLSearchParams(window.location.search);
const authToken = urlParams.get('auth_token');
const contactId = urlParams.get('contact_id');

if (authToken) {
  // User is authenticated!
  console.log('User authenticated:', contactId);
  
  // You can now enroll them in a course
  enrollUserInCourse(authToken, instanceId);
}

async function enrollUserInCourse(authToken, instanceId) {
  const response = await fetch('https://your-app.onrender.com/api/auth/enroll/authenticated', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      instanceId: instanceId,
      courseType: 'p'
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    console.log('Enrollment successful:', result.data);
    // Show success message
  } else {
    console.error('Enrollment failed:', result.error);
    // Show error message
  }
}
```

## Troubleshooting

### Still Getting 404 Errors?

**Check 1: Verify Environment Variables**
```bash
# In Render dashboard, check these are set:
AXCELERATE_WS_URL
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
```

**Check 2: Verify Deployment**
- Go to Render dashboard → Events
- Make sure latest deployment succeeded
- Check logs for any errors

**Check 3: Test the Health Endpoint**
```bash
curl https://your-app.onrender.com/health
```

**Check 4: Check Render Logs**
- Go to Render dashboard → Logs
- Look for errors during startup
- Look for "Server running on port 3000" message

### Google Shows "redirect_uri_mismatch"

This means the redirect URI in Google Console doesn't match exactly.

**Fix:**
1. Go to Google Cloud Console
2. Check the redirect URI is EXACTLY: `https://your-app.onrender.com/api/auth/google/callback`
3. No trailing slashes
4. No typos
5. Match the domain exactly (check if it's `.onrender.com` or custom domain)

### "Google OAuth not configured" Error

This means environment variables are missing.

**Fix:**
1. Go to Render dashboard → Environment
2. Add both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
3. Click "Save Changes"
4. Wait for redeployment

### Session Expired Error

Sessions expire after 30 minutes for security.

**Fix:** User needs to start the login process again.

### AXCELERATE_WS_URL Format

**Correct:**
```
yourdomain.stg.axcelerate.com
blackmarket.stg.axcelerate.com
```

**Incorrect:**
```
https://yourdomain.stg.axcelerate.com  ❌ (no https://)
yourdomain.stg.axcelerate.com/api      ❌ (no /api)
```

## Security Best Practices

1. **Never commit secrets to git**
   - All secrets should be in Render environment variables
   - Never in code or `.env` files in the repo

2. **Use HTTPS only**
   - Render provides this automatically
   - Never use OAuth with HTTP

3. **Session expiration**
   - Sessions expire after 30 minutes
   - For production, consider using Redis for session storage

4. **CORS configuration**
   - Update `src/index.js` CORS settings if using custom domain
   - Add your Shopify store domain to allowed origins

## Production Checklist

- [ ] Google OAuth credentials created
- [ ] Environment variables added in Render
- [ ] Code deployed to Render
- [ ] Health endpoint returns 200 OK
- [ ] Google login redirects properly
- [ ] Auth token is returned in redirect URL
- [ ] User can be enrolled after authentication
- [ ] Tested on actual Shopify store
- [ ] Custom domain configured (if applicable)
- [ ] CORS settings updated for custom domain

## Need More OAuth Providers?

To add Facebook, Apple, or other providers:

1. **Add provider configuration** to `src/routes/auth.js`
2. **Follow same pattern** as Google OAuth
3. **Add environment variables** to `render.yaml`
4. **Update this guide** with new provider instructions

## Support

If you're still having issues:

1. Check Render logs for specific error messages
2. Verify all environment variables are set correctly (no typos)
3. Test with health endpoint first
4. Test OAuth flow in incognito/private browser window
5. Check Google Cloud Console for any error messages

---

**Last Updated:** December 4, 2025  
**For:** Shopify + aXcelerate Integration on Render  
**Status:** Ready for Production

