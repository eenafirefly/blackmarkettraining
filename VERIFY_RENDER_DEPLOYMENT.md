# Verify Render Has Latest Code

## Quick Test

Open this URL in your browser to test if Render has the latest code:

```
https://blackmarkettraining.onrender.com/api/axcelerate/contact/search?emailAddress=sheena+1@noda.com.au
```

### Expected Results:

**If Render has NEW code (✅ Correct):**
- Should return JSON with contacts array containing existing contacts
- Example: `[{"CONTACTID": 15381602, "EMAIL": "sheena+1@noda.com.au", ...}]`

**If Render has OLD code (❌ Wrong):**
- Returns empty array or error because it's looking for `?email=` not `?emailAddress=`
- Example: `[]`

## Check Render Dashboard

1. Go to: https://dashboard.render.com
2. Find: `blackmarkettraining` service
3. Check **"Events"** tab
4. Look for latest deployment timestamp

### Should show:
```
Dec 8, 2025, 10:00 AM - Deployed
Commit: 6279fcf - fix duplicate contacts
```

Or:
```
Dec 8, 2025, 09:46 AM - Deployed  
Commit: d4b0794 - fix contact creation issues
```

If it shows an older timestamp or commit, Render didn't deploy the new code!

## If Render Didn't Deploy

### Option 1: Manual Deploy in Dashboard
1. Go to your service page
2. Click **"Manual Deploy"** button (top right)
3. Select **"Clear build cache & deploy"**
4. Wait 2-3 minutes for deployment

### Option 2: Force Push
```bash
cd /Users/sheena/Documents/NODA/BMT/blackmarkettraining
git commit --allow-empty -m "trigger render deploy"
git push origin main
```

## Test After Deployment

### Test 1: Backend API Direct
```bash
curl "https://blackmarkettraining.onrender.com/api/axcelerate/contact/search?emailAddress=sheena+1@noda.com.au"
```

Should return contacts array with matching email.

### Test 2: Frontend Widget
1. Clear browser cache (Cmd+Shift+R or Ctrl+Shift+R)
2. Go to enrollment page
3. Enter: `sheena+1@noda.com.au`
4. Submit form

**Expected:**
- ✅ Console shows: `Contact search result: Array(1+)`
- ✅ Modal appears: "Existing Record Found"
- ❌ Does NOT create duplicate

**If Still Creating Duplicates:**
Check Shopify theme files were updated with new widget code!

## Shopify Theme Files

Make sure these files in Shopify have the `emailAddress` parameter:

1. **snippets/axcelerate-enrollment-widget-dynamic.liquid**
   - Line ~1401: Should have `?emailAddress=`

2. **Check by searching in Shopify code editor:**
   - Search for: `contact/search?email=`
   - Should find: ZERO results (all should be `emailAddress` now)

---

## Summary Checklist

- [ ] Backend code is on GitHub main branch ✅ (Already confirmed)
- [ ] Render deployed latest commit from main
- [ ] Render API endpoint returns contacts for `?emailAddress=`
- [ ] Shopify theme has updated widget code with `?emailAddress=`
- [ ] Browser cache cleared
- [ ] Test with existing email shows modal (not duplicate)

