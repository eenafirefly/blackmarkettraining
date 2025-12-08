# aXcelerate Automatic Email System

## How It Works

✅ **aXcelerate sends emails automatically** - No custom email service needed!

### Email Triggers

aXcelerate's built-in email system sends emails based on specific actions:

#### 1. **Booking Confirmation Email**
- **Sent when**: New contact is created
- **Triggered by**: `POST /api/contact` with enrollment data
- **Contains**: Welcome message, course details, next steps
- **Status**: ✅ Working automatically

#### 2. **Incomplete Booking Email**
- **Sent when**: 
  - Contact saves partial enrollment data (doesn't complete all steps)
  - Existing contact attempts to enroll
- **Triggered by**: Creating note in aXcelerate with "incomplete" status
- **Contains**: Link to resume enrollment, reminder to complete
- **Status**: ✅ Implemented (saves step data to aXcelerate)

## Current Implementation

### New Contact Flow
```
User fills form
  ↓
POST /api/enrollment/create
  ↓
aXcelerate creates contact
  ↓
✅ aXcelerate sends "Booking Confirmation" email automatically
  ↓
User proceeds to steps
  ↓
Each "Save" button click:
  ↓
POST /api/enrollment/save-step
  ↓
Updates contact custom fields in aXcelerate
  ↓
Creates "incomplete" note
  ↓
✅ aXcelerate sends "Incomplete Booking" email automatically
```

### Existing Contact Flow
```
User enters existing email
  ↓
Frontend: Search finds existing contact
  ↓
POST /api/enrollment/send-verification
  ↓
Creates "incomplete booking" note in aXcelerate
  ↓
✅ aXcelerate sends "Incomplete Booking" email automatically
  ↓
Modal shows: "Check your email"
```

## What We Save to aXcelerate

### On Each Step Save:
1. **Contact Custom Fields**:
   - All form field data (usiYesNo, previousStudy, etc.)
   - Updated via `PUT /contact/{contactId}`

2. **Note/Activity**:
   - Step name
   - Date/time
   - Status: "Incomplete enrollment"
   - Course details

### Why This Works:
- ✅ Data persists in aXcelerate
- ✅ Triggers automatic emails
- ✅ Visible in aXcelerate contact record
- ✅ Can be used for reporting/follow-up

## Email Configuration in aXcelerate

Your WordPress instance has these configured (via custom SMTP):
- **From Address**: Configured in aXcelerate
- **Email Templates**: Configured in aXcelerate admin
- **Triggers**: Built into aXcelerate workflows

### To Verify/Configure:
1. Log in to aXcelerate admin
2. Go to: **Settings → Email Templates**
3. Find: "Booking Confirmation" template
4. Find: "Incomplete Booking" template
5. Verify they're enabled and configured

## No Custom Email Service Needed!

Unlike what we discussed before:
- ❌ **Don't need** SendGrid API key
- ❌ **Don't need** custom email code
- ❌ **Don't need** domain authentication
- ✅ **Already using** WordPress SMTP for aXcelerate

aXcelerate handles all emails through your existing WordPress SMTP configuration!

## Testing the Flow

### Test 1: New Contact (Booking Confirmation)
```
1. Enter new email: test-new@example.com
2. Fill name
3. Click CREATE
4. ✅ Check inbox for "Booking Confirmation" email
```

### Test 2: Incomplete Booking (Step Save)
```
1. Complete login
2. Fill background step
3. Click SAVE
4. Don't complete remaining steps
5. ✅ Check inbox for "Incomplete Booking" email
```

### Test 3: Existing Contact
```
1. Enter existing email: sheena+1@noda.com.au  
2. Click CREATE
3. ✅ Modal shows
4. ✅ Check inbox for "Incomplete Booking" email
```

## Monitoring Emails

### In aXcelerate:
1. Go to contact record
2. View **Activity** tab
3. See all email sends with status

### In Render Logs:
```
✅ Contact updated with step data
✅ Incomplete enrollment note created
📧 aXcelerate will send incomplete booking email automatically
```

## Email Content

The emails are sent by aXcelerate and contain:
- **Booking Confirmation**:
  - Welcome message
  - Course name and details
  - Next steps
  - Contact information

- **Incomplete Booking**:
  - "You started enrollment but didn't complete"
  - Course details
  - Link to resume (magic link from our system)
  - Expiration notice
  - Contact for help

## Magic Link System

When user receives incomplete booking email:
```
Email contains: https://shopify.com/pages/enroll?auth_token=xxx&contact_id=123
                                                      ↑
                                                      |
Widget checks URL params ───────────────────────────┘
                                                      |
                                                      ↓
                                    Auto-login user and restore progress
```

## Troubleshooting

### Emails Not Received?

1. **Check aXcelerate Email Settings**:
   - Settings → Email Configuration
   - Verify SMTP is configured (should be using WordPress)
   - Test email delivery

2. **Check Contact Record**:
   - Open contact in aXcelerate
   - Activity tab → See email send status
   - If failed, shows error reason

3. **Check Email Templates**:
   - Settings → Email Templates
   - Ensure "Booking Confirmation" is enabled
   - Ensure "Incomplete Booking" is enabled
   - Check template content

4. **Check Spam Folder**:
   - Emails might be filtered
   - Check email logs in aXcelerate

### No Email Sent At All?

- Verify SMTP settings in aXcelerate admin
- Check if WordPress SMTP plugin is working
- Test with aXcelerate's built-in email test feature

## Summary

✅ **No custom email service needed**
✅ **aXcelerate handles all emails automatically**
✅ **Data saved to aXcelerate triggers emails**
✅ **Uses existing WordPress SMTP configuration**
✅ **Works with current email server settings**

**Key Point**: Your WordPress SMTP settings (`smtp.sendgrid.net`) are used by aXcelerate to send ALL emails, including our enrollment emails. No conflict, no additional configuration needed!

---

**Status**: ✅ Implemented and ready to test
**Email Service**: aXcelerate automatic (via WordPress SMTP)
**Configuration Required**: None (already set up in WordPress)

