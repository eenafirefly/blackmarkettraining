# SendGrid Setup for Immediate Verification Emails

## 🎯 Goal

Send Template 146004 (verification email) **immediately** when existing contact is found, just like WordPress does.

## 📧 Solution: Use SendGrid API

WordPress uses SendGrid SMTP (`smtp.sendgrid.net`) - we'll use the same SendGrid account but via API for faster delivery.

## ⚙️ Setup Steps

### Step 1: Get SendGrid API Key

You already have SendGrid configured in WordPress. Now get an API key:

1. **Log in to SendGrid**: https://app.sendgrid.com
2. **Go to**: Settings → API Keys
3. **Click**: "Create API Key"
4. **Name**: `Shopify Enrollment Widget`
5. **Permissions**: Select "Full Access" or "Mail Send" only
6. **Click**: "Create & View"
7. **Copy the API key** (starts with `SG.`)

⚠️ **Important**: Copy the key immediately - you won't be able to see it again!

### Step 2: Add to Render Environment Variables

1. **Go to**: https://dashboard.render.com
2. **Select**: Your `blackmarkettraining` service
3. **Click**: "Environment" tab
4. **Click**: "Add Environment Variable"
5. **Key**: `SENDGRID_API_KEY`
6. **Value**: Paste your API key (e.g., `SG.xxxxxxxxxxxx`)
7. **Click**: "Save Changes"
8. **Optional**: Add `EMAIL_FROM` = `info@blackmarkettraining.com`

### Step 3: Deploy

The code is already updated. Just deploy:

```bash
git add src/routes/enrollment.js SENDGRID_SETUP.md
git commit -m "feat: Send verification email immediately via SendGrid for existing contacts"
git push origin main
```

## 📊 How It Works Now

### Before (WordPress method):
```
Existing contact found
  ↓
Create tentative enrollment
  ↓
❌ "Booking Confirmation" email sent
  ↓
Wait 2 hours for cron
  ↓
✅ Template 146004 sent
```

### After (Shopify immediate):
```
Existing contact found
  ↓
DON'T create enrollment yet
  ↓
✅ Verification email sent immediately via SendGrid API
  ↓
User receives email right away!
  ↓
User clicks link and continues
  ↓
Enrollment created when they complete
```

## 📧 Email Content

The email sent matches Template 146004:

**Subject**: Email Validations/Duplicate Detection - Black Market Training

**Body**:
```
Hi [Name],

Your email has been detected in our system.

You can continue your enrollment by clicking here.

Best regards,
Black Market Training
```

## ✅ Benefits

1. **Immediate delivery** - No waiting for 2-hour cron
2. **No Booking Confirmation spam** - Enrollment not created yet
3. **Same SendGrid account** - Already authenticated domain
4. **Better user experience** - User gets email instantly
5. **Cleaner aXcelerate records** - No orphaned tentative enrollments

## 🧪 Testing

### Test 1: Existing Contact
```
1. Enter: sheena+1@noda.com.au
2. Click CREATE
3. ✅ Modal shows immediately
4. ✅ Check inbox - email should arrive within 1-2 minutes
5. ✅ Email subject: "Email Validations/Duplicate Detection"
6. ❌ Should NOT receive "Booking Confirmation"
```

### Test 2: New Contact
```
1. Enter: new-test@example.com
2. Click CREATE
3. ✅ Proceeds to background step
4. ✅ Can fill forms and save
5. ✅ Booking Confirmation sent only when complete
```

## 🔍 Debugging

### Check Render Logs

**Success**:
```
📧 Sending verification email via SendGrid...
✅ Verification email sent via SendGrid (Template 146004 equivalent)
```

**Missing API Key**:
```
⚠️ SENDGRID_API_KEY not configured - email will not be sent
💡 Add SENDGRID_API_KEY to Render environment variables
```

**SendGrid Error**:
```
❌ SendGrid error: 401 Unauthorized
```
→ Check API key is correct

```
❌ SendGrid error: 403 Forbidden  
```
→ Check domain is authenticated in SendGrid

### Check SendGrid Dashboard

1. Go to: https://app.sendgrid.com
2. Click: "Activity"
3. See recent email sends
4. Check delivery status

### Check Email Inbox

- Check spam/junk folder
- Look for sender: info@blackmarkettraining.com
- Subject contains: "Email Validations/Duplicate Detection"

## 🔐 Security

- ✅ API key is environment variable (not in code)
- ✅ Only visible in Render dashboard (encrypted)
- ✅ Use "Mail Send" permission only (not full access)
- ✅ Can revoke/rotate key anytime in SendGrid

## 💰 Cost

- ✅ Same SendGrid account as WordPress
- ✅ No additional cost
- ✅ Counts toward your existing email quota
- ✅ Free tier: 100 emails/day

## ❓ Troubleshooting

### Email Not Received?

1. **Check Render logs** - Was email sent?
2. **Check spam folder** - Might be filtered
3. **Check SendGrid Activity** - Did it leave SendGrid?
4. **Check email address** - Is it valid?
5. **Check domain authentication** - Is blackmarkettraining.com verified?

### "Booking Confirmation" Still Being Sent?

This means enrollment is being created somewhere else. Check:
- Other code paths that create enrollments
- aXcelerate automatic triggers
- WordPress plugin settings

### SendGrid API Key Not Working?

- Verify key copied correctly (no extra spaces)
- Check key permissions (needs "Mail Send")
- Verify key not expired/revoked
- Try creating new key

## 📝 Environment Variables Summary

Add these to Render:

```env
SENDGRID_API_KEY=SG.your_actual_key_here
EMAIL_FROM=info@blackmarkettraining.com
```

Existing variables (already set):
```env
AXCELERATE_API_URL=https://blackmarket-training.axcelerate.com/api
AXCELERATE_API_TOKEN=your_token
AXCELERATE_WS_TOKEN=your_ws_token
```

---

**Status**: ✅ Code ready, just needs SendGrid API key
**Time to setup**: ~5 minutes
**Result**: Immediate verification emails for existing contacts!

