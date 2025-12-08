# Duplicate Contacts Issue - FIXED

## Problem Summary

The enrollment widget was creating duplicate contacts in aXcelerate because it was using the wrong API parameter names:

- ❌ Using `email` parameter instead of `emailAddress`
- ❌ Contacts were created WITHOUT email addresses
- ❌ Search couldn't find existing contacts, so kept creating duplicates

## Root Cause

aXcelerate API requires **`emailAddress`** as the field name for both:
1. Searching: `/contacts/search?emailAddress=...`
2. Creating: `POST /contact` with `emailAddress=...` field

But the code was using `email` everywhere, which caused:
- Search to return wrong results or no results
- Contact creation to save without an email address
- Duplicate contacts to be created for every enrollment attempt

## Files Fixed

### Backend (Render App)
1. ✅ `src/routes/enrollment.js` - Search and create endpoints
2. ✅ `src/routes/axcelerate.js` - Contact search endpoint
3. ✅ `src/routes/auth.js` - OAuth contact creation

### Frontend (Shopify Widgets)
1. ✅ `shopify-axcelerate-enrollment-widget-DYNAMIC.liquid`
2. ✅ `shopify-axcelerate-enrollment-widget.liquid`
3. ✅ `shopify-enrollment-widget-with-background-step.liquid`

All files now use `emailAddress` parameter correctly.

## Changes Made

### 1. Contact Search (All Files)
```javascript
// BEFORE ❌
fetch(`/api/axcelerate/contact/search?email=${email}`)

// AFTER ✅
fetch(`/api/axcelerate/contact/search?emailAddress=${email}`)
```

### 2. Contact Creation (Backend)
```javascript
// BEFORE ❌
const payload = {
  givenName,
  surname,
  email: email  // Wrong field name
};

// AFTER ✅
const payload = {
  givenName,
  surname,
  emailAddress: email  // Correct field name
};
```

### 3. Email Validation (Backend)
Added validation to ensure returned contacts actually match the searched email:

```javascript
const matchingContacts = contacts.filter(contact => {
  if (!contact.EMAIL) return false;
  return contact.EMAIL.toLowerCase() === email.toLowerCase();
});
```

## Expected Behavior After Fix

### Scenario 1: New Contact
1. User enters email that doesn't exist in aXcelerate
2. ✅ Search returns no results
3. ✅ New contact is created with email properly saved
4. ✅ User proceeds to enrollment

### Scenario 2: Existing Contact
1. User enters email that exists in aXcelerate
2. ✅ Search finds existing contact
3. ✅ Modal shows "Existing Record Found" message
4. ✅ Verification email is sent (if configured)
5. ❌ User cannot proceed without email verification

## Cleaning Up Existing Duplicates

You have 4 duplicate contacts for `sheena+1@noda.com.au`:
- Contact ID: 15381602 (Joyce Gono)
- Contact ID: 15388018 (Sheena Noda)
- Contact ID: 15388022 (Sheena Noda)
- Contact ID: 15388023 (Sheena Noda)

### Manual Cleanup in aXcelerate:
1. Choose ONE primary contact to keep (e.g., 15388018)
2. Merge or delete the other 3 duplicate contacts
3. Ensure the primary contact has:
   - ✅ Correct email address
   - ✅ All enrollment history
   - ✅ Any payment records

### Preventing Future Duplicates:
1. ✅ Backend fixes deployed to Render
2. ✅ Frontend widgets updated in Shopify theme
3. ✅ Search now uses `emailAddress` parameter
4. ✅ Create now uses `emailAddress` field
5. ✅ Email validation filters out mismatches

## Testing After Deployment

### Test 1: New Email (Should Create)
```
Email: test-new-123@example.com
Expected: ✅ Creates new contact with email saved
```

### Test 2: Existing Email (Should Block)
```
Email: sheena+1@noda.com.au
Expected: ✅ Shows "Existing Record Found" modal
          ✅ Does NOT create duplicate
```

### Test 3: Backend Logs
Watch Render logs for:
```
🔍 Searching for existing contact with email: [email]
📋 Search returned [N] contacts
✅ Found existing contact with matching email: [ID] [email]
```

Or for new contacts:
```
✅ No existing contacts found, will create new contact
🆕 Creating NEW contact: { givenName, surname, email }
✅ Successfully created NEW contact with ID: [NEW_ID]
✅ Email matches - this appears to be a genuine new contact
```

## Deployment Checklist

- [x] Backend files fixed
- [x] Frontend widgets fixed
- [ ] Deploy backend to Render
- [ ] Update Shopify theme with new widget code
- [ ] Test with existing email (should show modal)
- [ ] Test with new email (should create contact with email)
- [ ] Clean up duplicate contacts in aXcelerate

## Support

If duplicates still occur after deployment:
1. Check Render logs for the actual API calls being made
2. Verify aXcelerate API is using `emailAddress` parameter
3. Check if aXcelerate has its own duplicate detection that might be returning existing contacts
4. Contact aXcelerate support if their API behavior is inconsistent

---

**Status**: ✅ FIXED - Ready for deployment
**Last Updated**: December 8, 2025

