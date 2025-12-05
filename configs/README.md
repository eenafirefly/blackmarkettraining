# Form Configurations

This directory contains form configurations exported from the WordPress aXcelerate Integration Plugin (Config ID 3).

## Structure

Each step of the enrollment form is stored as a separate JSON file:

```
configs/
├── form-config-3-background.json     # Step 2: Background questions
├── form-config-3-subjectmatter.json  # Step 3: Subject Matter Aptitude
├── form-config-3-personal.json       # Step 4: Personal Details
├── form-config-3-contact.json        # Step 5: Contact Details
├── form-config-3-address.json        # Step 6: Address
├── form-config-3-emergency.json      # Step 7: Emergency Contact
├── form-config-3-nationality.json    # Step 8: Nationality
├── form-config-3-schooling.json      # Step 9: Schooling
├── form-config-3-additional.json     # Step 10: Additional Details
└── form-config-3-studyreason.json    # Step 11: Study Reason
```

## API Usage

### Get a specific step configuration:
```
GET /api/axcelerate/form-config/3/background
```

### Get all steps for a config:
```
GET /api/axcelerate/form-config/3
```

## Field Structure

Each field in the configuration follows this structure:

```json
{
  "order": 1,
  "fieldId": "uniqueId",
  "name": "Field label/question",
  "type": "select|text|information|textarea",
  "required": true|false,
  "dataField": true,
  "syncToCustomField": true,
  "options": [
    { "display": "Display Text", "value": "value" }
  ],
  "events": {
    "eventName": {
      "action": "show|hide",
      "trigger": "change"
    }
  }
}
```

## Field Types

- `select` - Dropdown selection
- `text` - Single line text input
- `textarea` - Multi-line text input
- `information` - Display-only text (no input)

## Source

These configurations were exported from:
- **WordPress Plugin**: aXcelerate Integration Plugin
- **Config ID**: 3
- **Config Name**: Accredited Enrolment Form - Single - No Payment
- **Date Exported**: December 2025

## Migration Strategy

1. **Short-term**: Use these static JSON files
2. **Long-term**: Configure equivalent forms in aXcelerate's form template system
3. **Transition**: Once aXcelerate templates are ready, switch to dynamic API fetching

