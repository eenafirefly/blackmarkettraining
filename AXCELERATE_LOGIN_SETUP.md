# aXcelerate Login Setup Guide

## Issue Fixed
The aXcelerate login was returning 404 because:
1. ❌ Wrong URL: `/portal/login` 
2. ✅ Correct URL: `/auth/user/login.cfm`
3. ❌ Wrong parameter: `return_url`
4. ✅ Correct parameter: `return_to`

## Required: Register Callback URL

**IMPORTANT:** aXcelerate requires you to register your callback URL in their system for security.

### Steps to Register:

1. **Login to aXcelerate Admin Panel**
   - Go to: `https://blackmarket.app.axcelerate.com`
   - Login with your administrator account

2. **Navigate to System Settings**
   - Click on **System Settings** (usually in the top menu)
   - Select **Web & Other Integrations**

3. **Add to Approved Applications Register**
   - Look for **Approved Applications Register** or **Approved Return URLs**
   - Add this URL:
     ```
     https://blackmarkettraining.onrender.com/api/auth/axcelerate/callback
     ```
   - **Save** the settings

4. **Wait a few minutes** for the change to propagate

### What This Does

When users click "Continue with aXcelerate", they will:
1. Be redirected to aXcelerate's login page: 
   ```
   https://blackmarket.app.axcelerate.com/auth/user/login.cfm?return_to=...
   ```
2. Login with their aXcelerate credentials
3. aXcelerate validates the `return_to` URL against the approved list
4. If approved, aXcelerate redirects back to your callback with an authorization code
5. Your backend exchanges the code for user information

### Testing After Registration

1. Go to your enrollment page:
   ```
   https://blackmarket-training.myshopify.com/pages/qualification-details?course_id=94138&course_type=w&instance_id=2103212
   ```

2. Click **"Continue with aXcelerate"**

3. You should see:
   - ✅ aXcelerate login page (not 404)
   - ✅ Login form where users can enter their credentials
   - ✅ After login, redirect back to your Shopify page with authentication

### Troubleshooting

**Still getting 404?**
- Double-check the URL is registered exactly as shown above (no trailing slash)
- Make sure you're logged in as an aXcelerate administrator
- Contact aXcelerate support if you can't find the settings

**Getting "Invalid return URL" error?**
- The callback URL wasn't registered or doesn't match exactly
- Check for typos (http vs https, extra characters, etc.)

**Users not being authenticated?**
- Check your Render logs for errors
- Make sure `AXCELERATE_API_TOKEN` and `AXCELERATE_WS_TOKEN` are set correctly
- Verify the user has an aXcelerate learner portal account

### Environment Variables Required

Make sure these are set in Render:
```
AXCELERATE_API_URL=https://blackmarket.app.axcelerate.com/api
AXCELERATE_API_TOKEN=your_api_token
AXCELERATE_WS_TOKEN=your_ws_token
AXCELERATE_WS_URL=blackmarket.app.axcelerate.com
```

## Reference

- aXcelerate Login Documentation: https://support.axcelerate.com.au/hc/en-gb/articles/360004498156-Login-Experience
- aXcelerate Support: https://www.axcelerate.com.au/support

