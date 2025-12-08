# ✅ aXcelerate Email Templates Fix - Using WordPress Plugin Settings

## 🎯 Problem Solved

The WordPress aXcelerate plugin uses **specific email template IDs** that exist in aXcelerate:

- **Template 111502**: Default incomplete/abandoned enrollment notification
- **Template 146004**: Verify contact (existing contact found)

These templates have `[Online Enrolment Link]` placeholder that gets replaced with the resume URL.

## 🔧 What Changed

### Backend (`src/routes/enrollment.js`)

#### 1. **Existing Contact Flow** (send-verification)
Now uses **Template ID 146004**:
```javascript
POST /contact/{contactId}/email
Body: {
  contactID: contactId,
  templateID: 146004,
  "Online Enrolment Link": resumeUrl
}
```

#### 2. **Incomplete Enrollment Flow** (save-step)
Now uses **Template ID 111502**:
```javascript
POST /contact/{contactId}/email
Body: {
  contactID: contactId,
  templateID: 111502,
  "Online Enrolment Link": resumeUrl
}
```

### Frontend (`shopify-axcelerate-enrollment-widget-DYNAMIC.liquid`)

Added `resumeUrl` to save-step requests:
```javascript
resumeUrl: window.location.href
```

## 📧 How It Works Now

### Scenario 1: Existing Contact Found

```
1. User enters existing email
   ↓
2. Frontend calls /api/enrollment/send-verification
   ↓
3. Backend creates tentative enrollment
   ↓
4. Backend sends email via Template 146004 (Verify Contact)
   ↓
5. ✅ User receives "Incomplete Online Booking" email
   ↓
6. Email contains resume link with [Online Enrolment Link] replaced
```

### Scenario 2: New Contact Saves Step

```
1. User fills form and clicks "Save"
   ↓
2. Frontend calls /api/enrollment/save-step
   ↓
3. Backend creates tentative enrollment
   ↓
4. Backend updates contact with step data
   ↓
5. Backend sends email via Template 111502 (Incomplete Enrollment)
   ↓
6. ✅ User receives "Incomplete Online Booking" email
   ↓
7. Email contains resume link
```

## 📊 Template IDs Used

| Template ID | Purpose | When Sent |
|------------|---------|-----------|
| 111502 | Incomplete/Abandoned Enrollment | When user saves any step but hasn't completed |
| 146004 | Verify Contact Identity | When existing contact tries to enroll again |

## 🔄 Comparison with WordPress Plugin

### WordPress Plugin Method:
- Checks every 2 hours for incomplete enrollments
- Sends emails in batch
- Uses same template IDs

### Shopify Widget Method:
- Sends emails immediately when user saves
- Real-time notifications
- Uses same template IDs
- Better user experience (instant feedback)

## ✅ Benefits

1. **Uses existing aXcelerate templates** - No need to create new ones
2. **Same email content** as WordPress - Consistent branding
3. **Immediate notifications** - Better than 2-hour delay
4. **Proper template placeholders** - `[Online Enrolment Link]` replaced correctly

## 🧪 Testing

### Test 1: Existing Contact
```
1. Enter: sheena+1@noda.com.au
2. Click CREATE
3. ✅ Should receive email using Template 146004
4. Check: Email subject "Incomplete Online Booking"
5. Check: Contains resume enrollment link
```

### Test 2: New Contact Incomplete
```
1. Create new account
2. Fill background step
3. Click SAVE
4. ✅ Should receive email using Template 111502
5. Check: Email subject "Incomplete Online Booking"  
6. Check: Contains resume enrollment link
```

### Test 3: Verify in aXcelerate
```
1. Log in to aXcelerate admin
2. Find contact
3. Activity tab → See email sends
4. Check: Template ID 111502 or 146004 used
5. Check: Email status = Sent
```

## 🔍 Debugging

### Check Render Logs For:

**Success:**
```
📧 Sending verification email using aXcelerate template 146004...
✅ Verification email sent via aXcelerate template
```

OR

```
📧 Sending incomplete enrollment email using aXcelerate template 111502...
✅ Incomplete enrollment email sent via aXcelerate template
```

**Failure:**
```
⚠️ Failed to send email via template: [error details]
```

Check:
- Template IDs are correct (111502, 146004)
- Templates are enabled in aXcelerate
- API credentials are correct
- Contact email is valid

## 📝 API Endpoint Used

```
POST {axcelerate_api_url}/contact/{contactId}/email

Headers:
  APIToken: your_api_token
  WSToken: your_ws_token
  Content-Type: application/x-www-form-urlencoded

Body:
  contactID={contactId}
  &templateID={111502 or 146004}
  &Online%20Enrolment%20Link={resume_url}
```

## ⚙️ No Configuration Needed

- ✅ Templates already exist in aXcelerate
- ✅ SMTP already configured (via WordPress)
- ✅ Domain already whitelisted
- ✅ Just deploy and test!

## 🚀 Deployment

```bash
git add src/routes/enrollment.js shopify-axcelerate-enrollment-widget-DYNAMIC.liquid AXCELERATE_EMAIL_TEMPLATES_FIX.md
git commit -m "feat: Use aXcelerate email templates for incomplete booking notifications

- Use Template 146004 for existing contact verification
- Use Template 111502 for incomplete enrollment notifications
- Send emails immediately via aXcelerate API
- Replace [Online Enrolment Link] placeholder with resume URL
- Matches WordPress plugin email functionality"

git push origin main
```

---

**Status**: ✅ READY TO DEPLOY
**Templates Used**: 111502 (Incomplete), 146004 (Verify Contact)
**Email Trigger**: Immediate (not delayed like WordPress)

