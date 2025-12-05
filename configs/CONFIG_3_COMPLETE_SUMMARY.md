# Config ID 3 - Complete Form Configuration

## Overview

**Config Name:** Accredited Enrolment Form - Single - No Payment  
**Config ID:** 3  
**Total Steps:** 14  
**Total Fields:** 84+  
**Source:** WordPress aXcelerate Integration Plugin  
**Exported:** December 2025  

---

## Complete Step Structure

| # | Step Name | Type | Fields | File |
|---|-----------|------|--------|------|
| 1 | Login | user-login | - | Built-in |
| 2 | Background | contact-update | 16 | `form-config-3-background.json` |
| 3 | Subject Matter Aptitude | contact-update | 4 | `form-config-3-subjectmatter.json` |
| 4 | Personal Details | contact-update | 9 | `form-config-3-personal.json` |
| 5 | Contact Details | contact-update | 7 | `form-config-3-contact.json` |
| 6 | Address | address | 21 | `form-config-3-address.json` |
| 7 | Emergency Contact | contact-update | 3 | `form-config-3-emergency.json` |
| 8 | Nationality | contact-update | 9 | `form-config-3-nationality.json` |
| 9 | Schooling | contact-update | 7 | `form-config-3-schooling.json` |
| 10 | Additional Details | contact-update | 7 | `form-config-3-additional.json` |
| 11 | Study Reason | enrol-details | 1 | `form-config-3-studyreason.json` |
| 12 | Enrolment Documents | portfolio | - | `form-config-3-documents.json` |
| 13 | Review Details | review | - | `form-config-3-review.json` |
| 14 | Declaration | enrol | 1 | `form-config-3-declaration.json` |

---

## Step Details

### Step 2: Background (16 fields)
- USI verification (with conditional info display)
- Previous study questions
- Time commitment & deadlines
- Work/life/study balance
- Internet access
- Physical requirements (standing, multi-tasking)
- Language/literacy/numeracy (with conditional display)
- English speaking rating (1-5)
- Computer skills rating (1-5)
- Medical conditions (with conditional display)

### Step 3: Subject Matter Aptitude (4 fields)
- Hospitality experience rating (1-5)
- Milk types knowledge
- Non-verbal communication elements
- Food contamination prevention

### Step 4: Personal Details (9 fields)
- Title (Mr/Mrs/Ms/Miss/Other)
- Given Name, Preferred Name, Middle Name, Last Name
- Date of Birth
- Unique Student Identifier (USI) with validation
- USI warning (expandable info)
- Gender (M/F/X)

### Step 5: Contact Details (7 fields)
- Email (required, validated)
- Alternative email
- Organisation, Position
- Mobile (required, validated)
- Home Phone, Work Phone

### Step 6: Address (21 fields)
**Residential Address:**
- Info and help text
- Building/property name, Flat/unit
- Street number, Street name
- Suburb, Postcode, State, Country

**Copy Button**

**Postal Address:**
- Building/property name, Flat/unit
- Street number, Street name, PO Box
- Suburb, Postcode, State, Country

### Step 7: Emergency Contact (3 fields)
- Contact Name
- Relationship
- Contact Number

### Step 8: Nationality (9 fields)
- Country of Birth
- City of Birth
- Citizenship Status (11 options)
- Country of Citizenship
- Speak other language at home?
- Language spoken most often
- English Proficiency

### Step 9: Schooling (7 fields)
- Highest school level completed (with detailed tooltip)
- Year completed
- Still enrolled in secondary?
- Successfully completed post-secondary?
- Prior education (modified checkbox)

### Step 10: Additional Details (7 fields)
- Has disability? (with conditional checkbox)
- Disability types (9 options, conditional)
- Indigenous Status (4 options)
- Employment Status (8 options)
- How did you hear about us?

### Step 11: Study Reason (1 field)
- Main reason for undertaking course (11 options)

### Step 12: Enrolment Documents (Portfolio)
- Portfolio Checklist ID: 3549
- Required: Photo ID, Proof of Residency
- Document upload interface

### Step 13: Review Details (Review Type)
- Displays summary of all previous steps
- Allows navigation back to edit

### Step 14: Declaration (Enrol Type)
- Complete privacy notice (NCVER, DESE, VET data collection)
- Accept terms checkbox (required)
- No payment processing (all payment options disabled)

---

## API Endpoints

### Get Specific Step Configuration
```
GET /api/axcelerate/form-config/3/background
GET /api/axcelerate/form-config/3/subjectmatter
GET /api/axcelerate/form-config/3/personal
GET /api/axcelerate/form-config/3/contact
GET /api/axcelerate/form-config/3/address
GET /api/axcelerate/form-config/3/emergency
GET /api/axcelerate/form-config/3/nationality
GET /api/axcelerate/form-config/3/schooling
GET /api/axcelerate/form-config/3/additional
GET /api/axcelerate/form-config/3/studyreason
GET /api/axcelerate/form-config/3/documents
GET /api/axcelerate/form-config/3/review
GET /api/axcelerate/form-config/3/declaration
```

### Response Format
```json
{
  "success": true,
  "config": {
    "configId": 3,
    "step": "background",
    "stepName": "Background",
    "stepType": "contact-update",
    "fields": [ /* array of field definitions */ ]
  }
}
```

---

## Field Types Supported

- `select` - Dropdown selection
- `text` - Text input
- `email` - Email input with validation
- `tel` - Phone number input
- `date` - Date picker
- `textarea` - Multi-line text
- `checkbox` - Multiple selections
- `radio` - Single selection from group
- `information` - Display-only text
- `info_expandable` - Expandable information panel
- `button` - Action button (e.g., copy address)
- `search-select` - Searchable dropdown
- `modified-checkbox` - Custom checkbox variant
- `portfolio` - Document upload

---

## Conditional Logic

### Show/Hide Events
Many fields have conditional logic based on user selections:

**Background Step:**
- USI info shows when "No" selected
- Language/literacy info shows when "Yes" selected  
- Medical info shows when "Yes" selected

**Address Step:**
- Copy button clones residential to postal fields
- postal_toggle event for conditional display

**Additional Details:**
- Disability types checkbox shows when "Yes" selected

**Schooling:**
- School year fields show/hide based on highest level
- Conditional display for current enrollment status

---

## aXcelerate Field Mapping

### Direct Contact Fields
These map to standard aXcelerate contact fields:
- GIVENNAME, SURNAME, MIDDLENAME
- DOB, GENDER, USI
- EMAIL, ALTERNATIVEEMAIL
- MOBILE, HOMEPHONE, WORKPHONE
- ORGANISATION, POSITION
- COUNTRYOFBIRTH, CITYOFBIRTH
- CITIZENSHIPSTATUS, COUNTRYOFCITIZENSHIP
- LANGUAGESPOKEN, ENGLISHPROFICIENCY
- SCHOOLLEVEL, PRIOREDUCATIONSTATUS, PRIOREDUCATION
- INDIGENOUSSTATUS, EMPLOYMENTSTATUS
- STUDYREASON

### Custom Fields
Background questions sync to custom fields with prefix:
- CUSTOMFIELD_OBTAINUSI
- CUSTOMFIELD_PREVIOUSSTUDY
- CUSTOMFIELD_STUDYOUTCOME
- CUSTOMFIELD_DEDICATETIME
- CUSTOMFIELD_DEADLINES
- CUSTOMFIELD_WORKLIFESTUDY
- etc.

---

## Implementation Status

✅ **Backend API** - Complete
- Form config endpoint implemented
- Serves all 13 step configurations
- Error handling and fallbacks

⏳ **Frontend Widget** - Needs Update
- Dynamic form rendering code exists
- Needs integration with form-config API
- Conditional logic implementation needed

---

## Next Steps

1. ✅ All configurations exported - DONE
2. ⏳ Update Shopify widget to fetch and render from configs
3. ⏳ Implement conditional show/hide logic
4. ⏳ Test complete enrollment flow
5. ⏳ Deploy to Shopify production

---

## Testing Checklist

- [ ] Step 1: Login works (Google & aXcelerate OAuth)
- [ ] Step 2: All 16 background fields render
- [ ] Step 2: Conditional fields show/hide correctly
- [ ] Step 3: Subject matter questions display
- [ ] Step 4: Personal details with USI validation
- [ ] Step 5: Contact details with email/phone validation
- [ ] Step 6: Address with copy residential→postal button
- [ ] Step 7: Emergency contact fields
- [ ] Step 8: Nationality with citizenship dropdown
- [ ] Step 9: Schooling with conditional fields
- [ ] Step 10: Additional details with disability checkbox
- [ ] Step 11: Study reason selection
- [ ] Step 12: Document upload (portfolio 3549)
- [ ] Step 13: Review all entered data
- [ ] Step 14: Accept terms and submit
- [ ] Data submits correctly to aXcelerate
- [ ] Progress saving/resume works
- [ ] Email notifications sent

---

## Configuration Files Summary

Total: 13 JSON configuration files + 1 README

```
configs/
├── README.md
├── form-config-3-background.json       (16 fields)
├── form-config-3-subjectmatter.json    (4 fields)
├── form-config-3-personal.json         (9 fields)
├── form-config-3-contact.json          (7 fields)
├── form-config-3-address.json          (21 fields)
├── form-config-3-emergency.json        (3 fields)
├── form-config-3-nationality.json      (9 fields)
├── form-config-3-schooling.json        (7 fields)
├── form-config-3-additional.json       (7 fields)
├── form-config-3-studyreason.json      (1 field)
├── form-config-3-documents.json        (portfolio)
├── form-config-3-review.json           (review)
└── form-config-3-declaration.json      (1 field)
```

**All configurations deployed to GitHub and Render! ✅**

