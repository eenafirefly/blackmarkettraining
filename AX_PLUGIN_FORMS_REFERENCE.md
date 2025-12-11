# aXcelerate Plugin (ax_plugin) - Forms Reference

This document catalogs all forms, steps, and fields available in the WordPress aXcelerate plugin located in `/ax_plugin/`.

## Overview

The aXcelerate plugin provides a comprehensive enrollment system with multiple form steps and field types for capturing student information and managing course enrollments.

---

## Form Step Types

The plugin supports the following step types (defined in `enrollerWidget/config/stepTypes.json`):

### Core Steps

| Step Type | Unlimited | Description | Fields Allowed |
|-----------|-----------|-------------|----------------|
| `user-login` | No | User Login Step - Required for WordPress integration | No |
| `contact-search` | No | Contact Search - For selecting existing contacts | No |
| `contact-update` | **Yes** | Generic contact update step (can have multiple) | **Yes** |
| `address` | Yes | Contact Address Step | No |
| `usi-validation` | No | In-form USI verification | No |

### Course & Enrollment Steps

| Step Type | Unlimited | Description | Fields Allowed |
|-----------|-----------|-------------|----------------|
| `courses` | No | Course Search/Select - Required if not passing course ID | No |
| `review` | No | Enrolment Review - Confirm Details (Required for enrollment) | No |
| `enrol` | No | Billing/Enrolment - Finalizes enrollment | No |
| `enrol-details` | No | Enrollment Settings/Options | **Yes** |
| `agent-courses` | No | Agent Grouped Courses (with commissions) | No |
| `group-booking` | No | Group bookings across course types | No |

### Additional Steps

| Step Type | Unlimited | Description | Fields Allowed |
|-----------|-----------|-------------|----------------|
| `portfolio` | Yes | Portfolio Upload/Download (requires checklist) | No |
| `contact-note` | Yes | Custom data passed as contact note | **Yes** |
| `course-enquiry` | No | Course/General Enquiry | **Yes** |
| `ezypay-plan` | No | Ezypay plan selection | No |
| `complete` | No | Completion message/confirmation | No |

---

## Field Types

Available field types (defined in `enrollerWidget/config/fieldTypes.json`):

| Field Type | Description | Custom Available |
|------------|-------------|------------------|
| `text` | Text Input | ✅ |
| `text-area` | Text Area | ✅ |
| `email` | Email Address Field | ✅ |
| `date` | Date Input | ✅ |
| `select` | Standard Select List | ✅ |
| `search-select` | Searchable Select | ✅ |
| `search-select-add` | Searchable Select + Add New | ✅ |
| `multi-select` | Searchable Multi-Select | ✅ |
| `checkbox` | Set of Checkboxes | ✅ |
| `modifier-checkbox` | Checkboxes with Modifiers | ❌ |
| `flip-switch` | Flip Switch | ✅ |
| `button` | Button | ✅ |
| `signature` | Signature Field | ✅ |
| `information` | Information/Grouping | ✅ |
| `divider` | Divider/Reverse Information | ✅ |
| `info_expandable` | Expandable Info Box | ✅ |

---

## Default Contact Update Forms

The plugin includes pre-configured contact update forms (from `enroller-defaults.js`):

### 1. Personal Details (`contactPersonalDetails`)

**Standard Fields:**
- `GIVENNAME` - Given Name (text, max 40)
- `PREFERREDNAME` - Preferred Name (text, max 30)
- `MIDDLENAME` - Middle Name (text, max 40)
- `SURNAME` - Family Name (text, max 40, **required**)
- `TITLE` - Title (select: Mr, Mrs, Ms, Miss, Other)
- `DOB` - Date of Birth (date)
- `SEX` - Gender (select: Male, Female, Other)
- `EMAILADDRESS` - Email (email, max 60, **required**)
- `EMAILADDRESSALTERNATIVE` - Alternative Email (email, max 60)
- `MOBILEPHONE` - Mobile (text, pattern: 10 digits)
- `PHONE` - Home Phone (text, pattern: 10 digits)
- `WORKPHONE` - Work Phone (text, pattern: 10 digits)
- `FAX` - Fax (text, max 20)
- `ORGANISATION` - Organisation (text, max 250)
- `POSITION` - Position/Job Title (text, max 60)

### 2. Address Details (`contactAddress`)

**Residential Address:**
- `UNITNO` - Unit/Flat Details
- `STREETNO` - Street Number
- `STREETNAME` - Street Name
- `BUILDINGNAME` - Building/Property Name
- `CITY` - Suburb/Locality/Town
- `STATE` - State (select: ACT, NSW, NT, QLD, SA, TAS, VIC, WA)
- `POSTCODE` - Postcode
- `COUNTRYID` - Country (search-select)

**Postal Address:**
- `SUNITNO` - Postal Unit/Flat
- `SSTREETNO` - Postal Street Number  
- `SSTREETNAME` - Postal Street Name
- `SBUILDINGNAME` - Postal Building Name
- `POBOX` - PO Box
- `SCITY` - Postal Suburb
- `SSTATE` - Postal State
- `SPOSTCODE` - Postal Postcode
- `SCOUNTRYID` - Postal Country

### 3. VET/AVETMISS Details (`contactAvetmiss`)

**Citizenship & Nationality:**
- `COUNTRYOFBIRTHID` - Country of Birth (search-select, SACC codes)
- `CITYOFBIRTH` - City of Birth (text, max 50)
- `CITIZENSTATUSID` - Citizenship Status (select: 1-11)
- `COUNTRYOFCITIZENID` - Country of Citizenship (search-select, SACC codes)

**Language:**
- `MAINLANGUAGEID` - Main Language (search-select, SACC codes)
- `ENGLISHPROFICIENCYID` - English Proficiency (select: 1-4)
  - 1: Very Well
  - 2: Well
  - 3: Not Well
  - 4: Not at all
- `ENGLISHASSISTANCEFLAG` - English Assistance (select: boolean)

**Education:**
- `HIGHESTSCHOOLLEVELID` - Highest School Level (select: 0, 2, 8-12)
- `HIGHESTSCHOOLLEVELYEAR` - Year Completed (text)
- `ATSCHOOLFLAG` - Currently At School (select: boolean)
- `ATSCHOOLNAME` - School Name (text, max 250)
- `PRIOREDUCATIONSTATUS` - Prior Education Status (select: boolean)
- `PRIOREDUCATIONIDS` - Prior Education (modifier-checkbox)
  - Values: 008, 410, 420, 511, 514, 521, 524, 990
  - Modifiers: A (Australian), E (Equivalent), I (International)

**Employment & Demographics:**
- `INDIGENOUSSTATUSID` - Indigenous Status (select: 1-4)
- `LABOURFORCEID` - Employment Status (select)
- `OCCUPATIONIDENTIFIER` - Occupation Code (text, 6 digits)
- `ANZSCOCODE` - ANZSCO Code (text, 6 digits)
- `INDUSTRYOFEMPLOYMENT` - Industry Code (text)
- `ANZSICCODE` - ANZSIC Code (text, 4 digits)

**Disability:**
- `DISABILITYFLAG` - Has Disability (select: Y/N)
- `DISABILITYTYPEIDS` - Disability Types (checkbox, 11-99)

**Survey:**
- `SURVEYCONTACTSTATUSID` - Survey Contact Status (select: A/N/U)

### 4. Emergency Contact

- `EMERGENCYCONTACT` - Emergency Contact Name (text, max 50)
- `EMERGENCYCONTACTRELATION` - Relationship (text, max 50)
- `EMERGENCYCONTACTPHONE` - Phone Number (text, max 50)

### 5. Learner Identifiers

- `USI` - Unique Student Identifier (text, 10 chars)
- `VSN` - Victorian Student Number (text, 9 chars)

---

## Configuration Files

### Widget Configurations

Located in `/ax_plugin/enrollerWidget/config/`:

- `addressStep.json` - Address step configuration
- `contactNoteStep.json` - Contact note step
- `contactUpdateStep.json` - Contact update step
- `portfolioStep.json` - Portfolio upload step
- `usiValidationStep.json` - USI validation step
- `paymentMethods.json` - Payment method options
- `specialSteps.json` - Special step configurations

### Settings

Located in `/ax_plugin/enrollerWidget/config/settings/`:

- `basic.json` - Basic widget settings
- `advanced.json` - Advanced configurations
- `appearance.json` - UI/styling settings
- `contactSearch.json` - Contact search settings
- `courseSearch.json` - Course search settings
- `enquiry.json` - Enquiry form settings
- `enrolment.json` - Enrollment settings
- `messages.json` - User-facing messages
- `terminology.json` - Custom terminology
- `users.json` - User management settings

---

## SACC Codes Reference

### Country Codes (Common)

| Country | SACC Code |
|---------|-----------|
| Australia | 1101 |
| New Zealand | 1201 |
| United Kingdom | 2101 |
| United States | 8104 |
| Canada | 8102 |
| India | 7103 |
| China | 6101 |
| Japan | 6201 |

*See `/src/utils/country-codes.js` for complete mapping*

### Language Codes (Common)

| Language | SACC Code |
|----------|-----------|
| English | 1201 |
| Mandarin | 7104 |
| Cantonese | 7101 |
| Arabic | 4202 |
| Spanish | 2303 |
| Hindi | 5203 |
| Vietnamese | 6302 |

*Full list available in `/ax_plugin/classes/common.php`*

---

## Key PHP Classes

Located in `/ax_plugin/classes/`:

- `ax_ajax.php` - AJAX handlers for form submissions
- `ax_api.php` - aXcelerate API integration
- `AxcelerateForm.php` - Form builder class
- `common.php` - Common functions and data arrays
- `settings.php` - Plugin settings management

### Shortcodes

Located in `/ax_plugin/classes/_shortcodes/`:

- `sc_enroller_widget.php` - Main enrollment widget
- `sc_course_list.php` - Course listing
- `sc_event_calendar.php` - Event calendar
- `sc_shopping_cart.php` - Shopping cart functionality

---

## Integration with Modern Form System

The new form system (in `/configs/`) maps to these aXcelerate fields:

| Modern Form Step | Maps to ax_plugin |
|------------------|-------------------|
| `form-config-3-personal.json` | `contactPersonalDetails` |
| `form-config-3-contact.json` | Contact fields |
| `form-config-3-address.json` | `contactAddress` |
| `form-config-3-nationality.json` | `contactAvetmiss` (Citizenship/Language) |
| `form-config-3-schooling.json` | `contactAvetmiss` (Education) |
| `form-config-3-additional.json` | `contactAvetmiss` (Employment/Disability) |

---

## Notes

- All SACC codes are 4-digit numeric codes used by Australian VET system
- Citizenship Status uses numeric IDs (1-11)
- Boolean flags accept true/false or "Y"/"N" depending on field
- Prior Education uses modifier-checkbox format: `{code}{modifier}` (e.g., "008A")
- Most fields are optional unless marked as required
- Field validation patterns enforced on frontend

---

## References

- Official aXcelerate API Documentation
- AVETMISS Data Standards
- Plugin files: `/ax_plugin/enrollerWidget/`
- Modern configs: `/configs/form-config-3-*.json`

