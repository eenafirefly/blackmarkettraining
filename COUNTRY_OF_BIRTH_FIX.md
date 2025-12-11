# Country of Birth Mapping Fix

## Issue
Country of Birth field in the Nationality step was not saving to Axcelerate's VET Related Details section.

## Root Cause
Two issues were identified:
1. **Wrong field mapping:** Was using `COUNTRYOFBIRTHNAME` (text field) instead of `COUNTRYOFBIRTHID` (ID field)
2. **Wrong code format:** Was using 2-letter ISO codes (e.g., "AU", "US") instead of 4-digit SACC codes (e.g., "1101", "8104")

Axcelerate's VET Related Details section expects:
- Field: `COUNTRYOFBIRTHID`  
- Format: 4-digit SACC codes (Standard Australian Classification of Countries)
- Example: Australia = "1101", USA = "8104"

## Changes Made

### 1. Created SACC Code Mapping Utility (`src/utils/country-codes.js`)
- Added complete ISO to SACC code mapping for all countries
- Created `convertISOtoSACC()` function to handle code conversion
- Handles both legacy ISO codes and new SACC codes

### 2. Form Configuration (`configs/form-config-3-nationality.json`)
Updated to use SACC codes:
- Changed `mapsToContactField` from `COUNTRYOFBIRTHNAME` to `COUNTRYOFBIRTHID`
- Updated all country values from ISO codes (e.g., "AU") to SACC codes (e.g., "1101")
- Examples:
  - Australia: "AU" → "1101"
  - United States: "US" → "8104"
  - United Kingdom: "GB" → "2101"

### 3. Backend Mapping (`src/routes/enrollment.js`)
- Added import for `convertISOtoSACC` utility function
- Updated field mapping to use `COUNTRYOFBIRTHID` with SACC code conversion
```javascript
if (keyLower === 'countryofbirth') {
  axFieldName = 'COUNTRYOFBIRTHID';
  // Convert ISO code to 4-digit SACC code (e.g., AU → 1101)
  value = convertISOtoSACC(value);
}
```
- Conversion function handles both ISO and SACC codes automatically

### 4. Widget Data Retrieval (`shopify-axcelerate-enrollment-widget-DYNAMIC.liquid`)
- Updated to prioritize `COUNTRYOFBIRTHID` when loading contact data:
```javascript
countryofbirth: contact.COUNTRYOFBIRTHID || contact.COUNTRYOFBIRTHNAME || contact.COUNTRYOFBIRTH || '',
```

### 5. Modal Fix (`shopify-axcelerate-enrollment-widget-DYNAMIC.liquid`)
- Added null checks to `showExistingRecordModal()` and `closeModal()` functions
- Added console logging for debugging modal display issues
- Prevents errors when modal element is not found

## How It Works Now

1. **Form Display:** Shows full country names (e.g., "Australia", "United States")
2. **Form Value:** Stores 4-digit SACC codes (e.g., "1101", "8104")
3. **Backend Processing:** Converts any legacy ISO codes to SACC codes automatically
4. **API Submit:** Sends the 4-digit SACC code to Axcelerate via `COUNTRYOFBIRTHID`
5. **Axcelerate Storage:** Accepts the SACC code and displays correctly in VET Related Details

## Testing
To verify the fix:
1. Open an enrollment form
2. Navigate to the Nationality step
3. Select a Country of Birth (e.g., "Australia")
4. Save the step
5. Check in Axcelerate:
   - Go to the contact record
   - Open VET Related Details section
   - Verify "Country of Birth" shows the selected country

## SACC Code Reference
Some common SACC codes:
- Australia: 1101
- New Zealand: 1201
- United Kingdom: 2101  
- United States: 8104
- Canada: 8102
- India: 7103
- China: 6101
- Japan: 6201

Full mapping available in `/src/utils/country-codes.js`

## Related Files
- `/src/utils/country-codes.js` - ISO to SACC code mapping utility (NEW)
- `/configs/form-config-3-nationality.json` - Form field definition
- `/src/routes/enrollment.js` - Backend field mapping logic
- `/shopify-axcelerate-enrollment-widget-DYNAMIC.liquid` - Widget data loading and modal
- `/ax_plugin/classes/common.php` - Source of SACC code mappings from old plugin

## Reference
The old WordPress plugin code confirmed both the field name and SACC code requirement:
- `ax_plugin/classes/ax_ajax.php` line 1008: `$formData['CountryofBirthID']`
- `ax_plugin/template/include/_form.php` line 515: Uses `$row->SACCCODE` for values
- `ax_plugin/classes/common.php` line 11: Complete SACC code JSON array
- `ax_plugin/enrollerWidget/widget/enroller-defaults.js` line 608: `COUNTRYOFBIRTHID: { TYPE: "search-select" }`

