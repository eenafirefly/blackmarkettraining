# 🚫 Disable Booking Confirmation for Existing Contacts

## ⚠️ The Problem

When an existing contact tries to enroll, our system creates a **tentative enrollment**, which triggers aXcelerate's "Booking Confirmation" email immediately.

But we WANT Template 146004 ("Email Validation/Duplicate Detection") instead!

## ✅ Solution: Configure aXcelerate Email Templates

You need to modify the Booking Confirmation templates in aXcelerate to NOT send for tentative/incomplete enrollments.

### Step-by-Step Instructions:

#### 1. Find All Booking Confirmation Templates

**Path**: Settings → Email Content

Look for these templates:
- Booking Confirmation - General
- Booking Confirmation - Invoice Specific  
- Booking Confirmation - Paid Specific
- Booking Confirmation - Will Pay Specific
- Booking Confirmation - Voucher Specific
- Booking Confirmation - Unknown Payment Specific
- Booking Confirmation - Complimentary Specific

#### 2. Edit Each Template

For **EACH** of the above templates:

1. **Click** the template name to edit
2. **Find**: "Note Type" field
3. **Change** from: (empty or "All")
4. **Change** to: **"Standard Booking"** or similar

OR

5. **Look** for "Trigger Conditions" or "Send When"
6. **Add** condition: **"Do NOT send if Note Type = 'Online Enrolments - Enrolment Resumption'"**

This ensures Booking Confirmation only sends for COMPLETED enrollments, not tentative ones.

#### 3. Verify Template 146004 Settings

**Path**: Settings → Email Content → Template ID 146004

**Verify these settings are correct**:
- ✅ Note Type: **"Online Enrolments - Enrolment Resumption"**
- ✅ Subject: "Email Validations/Duplicate Detection - Black Market Training"
- ✅ Content includes: `[Online Enrolment Link]` placeholder

This ensures Template 146004 is sent by the resumption system.

## 📊 How It Should Work After Configuration

### Existing Contact Flow:
```
1. User enters existing email
   ↓
2. System creates tentative enrollment
   ↓  
3. ❌ Booking Confirmation NOT sent (filtered by Note Type)
   ↓
4. WordPress resumption checks (every 2 hours)
   ↓
5. ✅ Template 146004 sent (Email Validation/Duplicate Detection)
   ↓
6. User receives correct "Your email has been detected" message
```

### New Contact Flow:
```
1. User creates account and completes all steps
   ↓
2. System creates confirmed enrollment
   ↓
3. ✅ Booking Confirmation sent (Note Type = Standard)
   ↓
4. User receives welcome email
```

## 🔧 Alternative: Quick Fix Via Note Type

If you can't modify the templates, you can try setting a specific Note Type when creating the enrollment:

**In aXcelerate API call**, add:
```
noteType=Online Enrolments - Enrolment Resumption
```

This might prevent Booking Confirmation and trigger Template 146004 instead.

## 🧪 Testing After Configuration

1. **Test with existing contact**: `sheena+1@noda.com.au`
   - Should NOT get "Booking Confirmation"
   - Should get "Email Validation/Duplicate Detection" within 2 hours

2. **Test with new contact**: Complete full enrollment
   - Should get "Booking Confirmation" immediately
   - Should NOT get "Email Validation" message

## ⏱️ About the 2-Hour Delay

The WordPress plugin's "Enrolment Resumption" system checks every 2 hours for incomplete enrollments and sends Template 146004.

**Options to speed this up**:

1. **Manual trigger**: In aXcelerate admin, manually send Template 146004 to the contact
2. **Reduce cron interval**: In WordPress plugin settings, change from 2 hours to 5 minutes
3. **Custom solution**: We could build a real-time email sender (would require SendGrid setup)

## 📋 Checklist

- [ ] Edit all "Booking Confirmation" templates
- [ ] Add Note Type filter or condition
- [ ] Verify Template 146004 settings
- [ ] Deploy latest code to Render
- [ ] Test with existing contact
- [ ] Test with new contact
- [ ] Verify correct emails are sent
- [ ] Check aXcelerate Activity logs

## 🆘 If This Doesn't Work

If filtering by Note Type doesn't work in aXcelerate templates, we have two other options:

### Option A: Don't Create Enrollment for Existing Contacts
- Skip enrollment creation entirely
- Just show modal
- Let WordPress resumption detect from notes only

### Option B: Build Custom Email Sender
- Use SendGrid API (same as WordPress)
- Send Template 146004 content directly from our backend
- Bypass aXcelerate email system entirely

Let me know if you want to implement Option A or B!

---

**Priority**: 🔴 HIGH - Must configure to get correct emails
**Estimated Time**: 10-15 minutes to configure aXcelerate
**Impact**: Fixes duplicate/incorrect emails for existing contacts

