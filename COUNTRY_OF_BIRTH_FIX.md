# Country of Birth Mapping Fix

## Issue
Country of Birth field in the Nationality step was not saving to Axcelerate's VET Related Details section.

## Root Cause
The field was mapped to the wrong Axcelerate API field:
- **Was using:** `COUNTRYOFBIRTHNAME` (text field)
- **Should use:** `COUNTRYOFBIRTHID` (search-select field that expects country codes)

Axcelerate's VET Related Details section uses a search input for Country of Birth, which expects `COUNTRYOFBIRTHID` with 2-letter ISO country codes (e.g., "AU", "US", "GB").

## Changes Made

### 1. Form Configuration (`configs/form-config-3-nationality.json`)
Updated line 21:
```json
"mapsToContactField": "COUNTRYOFBIRTHID"
```
Previously was: `"mapsToContactField": "COUNTRYOFBIRTHNAME"`

### 2. Backend Mapping (`src/routes/enrollment.js`)
Updated the field mapping logic (lines 713-717):
```javascript
if (keyLower === 'countryofbirth') {
  axFieldName = 'COUNTRYOFBIRTHID';
  // Keep the 2-letter ISO country code as-is for Axcelerate
  // Axcelerate will handle the conversion to display name
}
```

Previously was converting country codes to full names using `getCountryName()` function and mapping to `COUNTRYOFBIRTHNAME`.

### 3. Widget Data Retrieval (`shopify-axcelerate-enrollment-widget-DYNAMIC.liquid`)
Updated line 3120 to prioritize `COUNTRYOFBIRTHID` when loading contact data:
```javascript
countryofbirth: contact.COUNTRYOFBIRTHID || contact.COUNTRYOFBIRTHNAME || contact.COUNTRYOFBIRTH || '',
```

## How It Works Now

1. **Form Display:** Shows full country names (e.g., "Australia", "United States")
2. **Form Value:** Stores 2-letter ISO codes (e.g., "AU", "US")
3. **API Submit:** Sends the 2-letter code to Axcelerate via `COUNTRYOFBIRTHID`
4. **Axcelerate Storage:** Stores the code and displays the full name in the VET Related Details section

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

## Related Files
- `/configs/form-config-3-nationality.json` - Form field definition
- `/src/routes/enrollment.js` - Backend field mapping logic
- `/shopify-axcelerate-enrollment-widget-DYNAMIC.liquid` - Widget data loading
- `/ax_plugin/enrollerWidget/widget/enroller-defaults.js` - Reference showing correct field name (COUNTRYOFBIRTHID)

## Reference
The old WordPress plugin code confirmed that `COUNTRYOFBIRTHID` is the correct field:
- `ax_plugin/classes/ax_ajax.php` line 1008: `$formData['CountryofBirthID']`
- `ax_plugin/enrollerWidget/widget/enroller-defaults.js` line 608: `COUNTRYOFBIRTHID: { TYPE: "search-select" }`

