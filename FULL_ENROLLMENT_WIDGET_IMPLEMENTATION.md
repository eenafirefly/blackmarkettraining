# Complete Multi-Step Enrollment Widget Implementation Guide

## Overview

This guide will help you implement a full-featured aXcelerate enrollment widget in Shopify with:
- ✅ All 4 social login options (Google, Apple, Facebook, aXcelerate)
- ✅ Multi-step form with progress tracking
- ✅ All custom fields (USI, LLN, study background, etc.)
- ✅ Backend API to handle complex enrollments

## Implementation Steps

### Step 1: Add OAuth Routes for Apple & Facebook (Backend)

### Step 2: Create Enhanced Enrollment Endpoint (Backend)

### Step 3: Create Full Multi-Step Widget (Shopify)

### Step 4: Configure OAuth Providers

## Files to Create/Update

1. `src/routes/auth.js` - Add Apple & Facebook OAuth
2. `src/routes/enrollment.js` - NEW - Handle multi-step enrollment
3. `shopify-axcelerate-enrollment-widget-full.liquid` - NEW - Complete widget
4. `render.yaml` - Add Apple & Facebook environment variables

---

## Detailed Implementation

See separate files for each component:
- `src/routes/enrollment.js` - Backend enrollment API
- `shopify-axcelerate-enrollment-widget-full.liquid` - Frontend widget

## Setup Instructions

### 1. Deploy Backend Changes

```bash
cd /Users/sheena/Documents/NODA/BMT/blackmarkettraining

# Add new files
git add src/routes/enrollment.js src/routes/auth.js render.yaml src/index.js

# Commit
git commit -m "Add multi-step enrollment with all OAuth providers"

# Push
git push origin main
```

### 2. Configure OAuth Providers

#### Google (Already Done)
- ✅ Client ID and Secret configured
- ✅ Redirect URI: `https://blackmarkettraining.onrender.com/api/auth/google/callback`

#### Apple Sign In
1. Go to: https://developer.apple.com/account/resources/identifiers/list
2. Create new Services ID
3. Enable "Sign in with Apple"
4. Add redirect URI: `https://blackmarkettraining.onrender.com/api/auth/apple/callback`
5. Get Client ID and generate Client Secret
6. Add to Render env vars:
   ```
   APPLE_CLIENT_ID=com.your.service.id
   APPLE_TEAM_ID=your_team_id
   APPLE_KEY_ID=your_key_id
   APPLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...-----END PRIVATE KEY-----
   ```

#### Facebook Login
1. Go to: https://developers.facebook.com/apps/
2. Create new app → "Consumer" → "Build Connected Experiences"
3. Add "Facebook Login" product
4. Valid OAuth Redirect URIs: `https://blackmarkettraining.onrender.com/api/auth/facebook/callback`
5. Get App ID and App Secret
6. Add to Render env vars:
   ```
   FACEBOOK_APP_ID=your_app_id
   FACEBOOK_APP_SECRET=your_app_secret
   ```

#### aXcelerate Native
- Already configured via `AXCELERATE_WS_URL`
- No additional setup needed

### 3. Add Widget to Shopify

1. Go to Shopify Admin → Online Store → Themes → Edit code
2. Under Snippets, create new: `axcelerate-enrollment-widget-full.liquid`
3. Paste the widget code (see separate file)
4. Update your page template to use it:

```liquid
{% render 'axcelerate-enrollment-widget-full', 
  course_id: course_id, 
  course_type: course_type, 
  instance_id: instance_id
%}
```

### 4. Update Render Environment Variables

Add these to your Render dashboard:

```bash
# Existing (keep these)
AXCELERATE_API_URL=https://blackmarket.app.axcelerate.com/api
AXCELERATE_API_TOKEN=your_token
AXCELERATE_WS_TOKEN=your_token
AXCELERATE_WS_URL=blackmarket.app.axcelerate.com
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_secret

# New (add these)
APPLE_CLIENT_ID=com.blackmarkettraining.signin
APPLE_TEAM_ID=your_apple_team_id
APPLE_KEY_ID=your_apple_key_id
APPLE_PRIVATE_KEY=your_apple_private_key
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
```

## Testing

### Test Each OAuth Provider

**Google:**
```
https://blackmarkettraining.onrender.com/api/auth/google/login?instanceId=123&redirectUrl=https://www.blackmarkettraining.com
```

**Apple:**
```
https://blackmarkettraining.onrender.com/api/auth/apple/login?instanceId=123&redirectUrl=https://www.blackmarkettraining.com
```

**Facebook:**
```
https://blackmarkettraining.onrender.com/api/auth/facebook/login?instanceId=123&redirectUrl=https://www.blackmarkettraining.com
```

**aXcelerate:**
```
https://blackmarkettraining.onrender.com/api/auth/axcelerate/login?instanceId=123&redirectUrl=https://www.blackmarkettraining.com
```

### Test Multi-Step Form

1. Visit qualification page on Shopify
2. Click any social login button
3. Complete OAuth flow
4. Should see multi-step form with:
   - Background questions
   - Personal details
   - Contact information
5. Submit form
6. Should see success message
7. Check aXcelerate for new enrollment with custom fields

## Troubleshooting

### OAuth Errors

**redirect_uri_mismatch:** Check OAuth provider dashboard has exact redirect URI

**invalid_client:** Check Client ID and Secret are correct in Render

**Configuration not found:** Check environment variables are set in Render

### Form Submission Errors

Check Render logs:
```bash
# In Render dashboard → Logs
```

Look for:
- "Custom fields missing"
- "Validation failed"
- "aXcelerate API error"

### Widget Not Showing

1. Check browser console for JavaScript errors
2. Verify widget snippet is included in Shopify template
3. Check RENDER_APP_URL is correct in widget code

## Next Steps

1. ✅ Deploy backend code
2. ✅ Configure all OAuth providers
3. ✅ Add widget to Shopify
4. ✅ Test each provider
5. ✅ Customize styling to match your brand
6. ✅ Add analytics tracking

## Support

If you encounter issues:
1. Check Render deployment logs
2. Check browser console
3. Verify environment variables
4. Test OAuth endpoints directly
5. Check aXcelerate API responses

---

**Created:** December 4, 2025
**For:** Black Market Training - Shopify Integration
**Status:** Ready for Implementation

