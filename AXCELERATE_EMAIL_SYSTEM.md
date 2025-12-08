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
1. **Tentative Enrollment Record** ⭐ **KEY!**:
   - Creates actual enrollment with `tentative: true`
   - This is what triggers the incomplete booking email!
   - Created via `POST /course/enrol`
   - Parameters:
     - `contactID`: User's contact ID
     - `instanceID`: Course instance
     - `type`: Course type (w=workshop, p=program)
     - `tentative`: true (marks as incomplete)
     - `paymentReceived`: false

2. **Contact Custom Fields**:
   - All form field data (usiYesNo, previousStudy, etc.)
   - Updated via `PUT /contact/{contactId}`

3. **Note/Activity**:
   - Step name
   - Date/time
   - Status: "Incomplete enrollment"
   - Course details

### Why This Works:
- ✅ **Tentative enrollment** triggers aXcelerate's incomplete booking email
- ✅ Data persists in aXcelerate
- ✅ Creates learner record (even if incomplete)
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

### ⚠️ CRITICAL: Domain Whitelist (Not the Issue!)

**Question**: "Do I need to add Shopify domain to Domain Whitelist?"
**Answer**: ❌ **NO!** 

The Domain Whitelist in aXcelerate is for **outgoing email domains**, not incoming requests.

Current settings (correct):
- ✅ Domain Whitelist: `blackmarkettraining.com`
- ✅ Primary Sender: `info@blackmarkettraining.com`
- ✅ This allows emails to be sent FROM your domain

The Shopify site or Render backend do NOT need to be whitelisted because:
- They don't SEND emails (aXcelerate does)
- They just make API calls to aXcelerate
- aXcelerate sends emails using your whitelisted domain

### Emails Not Received? Real Causes:

#### 1. **No Tentative Enrollment Created** ⭐ **Most Common!**
   - **Problem**: Only updating contact/notes doesn't trigger email
   - **Solution**: Must create tentative enrollment via `/course/enrol` API
   - **Check**: Look for "Tentative enrollment created" in Render logs
   - **Fixed in latest code**: Now creates tentative enrollment on each save

#### 2. **Check aXcelerate Enrollment Record**:
   - Log in to aXcelerate
   - Find the contact
   - Check "Enrolments" tab
   - Should see course with "Tentative" status
   - If no enrollment = no email sent

#### 3. **Check Email Templates in aXcelerate**:
   - Settings → Email Templates
   - Find "Incomplete Booking" template
   - Ensure it's **enabled**
   - Check trigger conditions
   - Test send from aXcelerate admin

#### 4. **Check SMTP Settings**:
   - Settings → Outgoing Mail Settings
   - Verify SMTP is working (smtp.sendgrid.net)
   - Send test email from aXcelerate
   - Check SendGrid dashboard for send status

#### 5. **Check Contact Record**:
   - Open contact in aXcelerate
   - Activity tab → See email send history
   - If failed, shows error reason
   - Check delivery status

#### 6. **Check Spam Folder**:
   - Emails might be filtered
   - Look for "Black Market Training"
   - Check all inbox tabs (Promotions, Updates, etc.)

### Debugging Steps

#### Step 1: Check Render Logs
```
Look for:
✅ Tentative enrollment created: [LEARNER_ID]
📧 aXcelerate will now send incomplete booking email automatically
```

If you see:
```
⚠️ Enrollment may already exist
```
That's OK - email should still send

#### Step 2: Check aXcelerate Contact
1. Log in to aXcelerate admin
2. Find contact by email
3. Go to "Enrolments" tab
4. Should see the course listed
5. Status should be "Tentative" or "Incomplete"

#### Step 3: Check Activity Log
1. In contact record
2. Go to "Activity" tab
3. Look for email sends
4. Status: Sent, Failed, Queued?

#### Step 4: Manual Email Test
1. In aXcelerate admin
2. Settings → Email Templates
3. Find "Incomplete Booking"
4. Click "Test Send"
5. Enter test email
6. Verify email arrives

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| No email at all | No tentative enrollment created | ✅ Latest code creates enrollment |
| Email template disabled | Template not enabled in aXcelerate | Enable in Settings → Email Templates |
| SMTP not configured | WordPress SMTP not connected | Configure in aXcelerate settings |
| Emails in spam | Domain not authenticated | Already done (blackmarkettraining.com) |
| Wrong email content | Template needs customization | Edit in aXcelerate admin |

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

