# Attendee Handling - How It Works

## Overview

The Shopify to aXcelerate integration now properly extracts and uses **attendee information** from the Easy Appointment Booking app, just like the WooCommerce plugin does.

## How Attendee Information is Captured

### 1. At Checkout (Shopify)
- Customer enters billing details (purchaser information)
- Easy Appointment Booking app captures **attendee name** as a line item property
- This attendee name field is the single field captured per booking

### 2. After Purchase
- Additional intake questions (personal details) are captured via **confirmation email**
- This is handled outside the initial integration

## Enrolment Logic

### Single Attendee (Quantity = 1)

When a line item has `quantity: 1`:

1. **Extract attendee name** from Easy Appointment Booking properties
2. **Parse name** into given name and surname
3. **Create/find contact** in aXcelerate for the attendee
4. **Create ONE enrolment** for that attendee

**Example booking properties:**
```json
"properties": [
  {
    "name": "Attendee Name",
    "value": "Sarah Johnson"
  },
  {
    "name": "Booking Date",
    "value": "2025-12-15"
  },
  {
    "name": "Booking Time",
    "value": "09:00 AM"
  }
]
```

**Result:**
- Contact created: Sarah Johnson
- Enrolment created for: Sarah Johnson
- Logged under: Sarah Johnson

### Group Booking (Quantity > 1)

When a line item has `quantity > 1`:

1. **Extract attendee name** from Easy Appointment Booking properties (same field)
2. **Create/find contact** in aXcelerate for the attendee
3. **Create MULTIPLE enrolments** (equal to quantity) for **the same attendee**

**Example:**
- Quantity: 3
- Attendee Name: "Sarah Johnson"

**Result:**
- Contact created: Sarah Johnson
- 3 enrolments created for: Sarah Johnson
- All logged under: Sarah Johnson

**Note:** This matches how the WooCommerce plugin handles group bookings - all enrolments go to the one named attendee.

## Property Name Detection

The integration automatically detects attendee information from these property names (case-insensitive):

### Full Name
- "Attendee Name"
- "Name"
- "Customer Name"

### Separate Fields
- "First Name" / "Given Name"
- "Last Name" / "Surname" / "Family Name"

### Contact Details (if available)
- "Email" (attendee email)
- "Phone" / "Mobile" (attendee phone)

## Fallback Behavior

If **no attendee information** is found in booking properties:

1. Falls back to **purchaser information**
2. Creates enrolment for the person who made the purchase
3. Uses billing details from order

This ensures the integration never fails due to missing attendee data.

## Technical Implementation

### Metadata Extraction (`src/utils/helpers.js`)

```javascript
export function extractBookingMetadata(lineItem) {
  const metadata = {
    hasBooking: false,
    attendeeName: null,
    attendeeGivenName: null,
    attendeeSurname: null,
    attendeeEmail: null,
    attendeePhone: null,
    // ... other booking fields
  };
  
  // Extracts from lineItem.properties
  // Parses full name into parts
  // Handles various property name formats
  
  return metadata;
}
```

### Enrolment Service (`src/services/enrolment.js`)

**Process:**
1. Extract booking metadata including attendee info
2. If attendee found:
   - Create/find contact for attendee
   - Use attendee contact ID for enrolment
3. If not found:
   - Use purchaser contact ID
4. Create enrolment(s) based on quantity

**Logging:**
- Customer name in logs shows attendee name (not purchaser)
- Metadata includes attendee info and flags
- Easy to identify attendee vs purchaser enrolments

## Database Tracking

### sync_logs Table

Each enrolment is logged with:

```json
{
  "customer_name": "Sarah Johnson",
  "axcelerate_contact_id": "123456",
  "metadata": {
    "attendee": {
      "name": "Sarah Johnson",
      "contactId": "123456",
      "isPurchaser": false
    },
    "bookingMetadata": {
      "attendeeName": "Sarah Johnson",
      "attendeeGivenName": "Sarah",
      "attendeeSurname": "Johnson",
      "date": "2025-12-15",
      "time": "09:00 AM"
    }
  }
}
```

## Admin Dashboard Display

The admin dashboard shows:
- **Customer Name:** The attendee name (if available) or purchaser
- **Contact ID:** The aXcelerate contact ID for the attendee
- **Metadata:** Full details including attendee vs purchaser flag

This makes it easy to see who actually got enrolled.

## Comparison with WooCommerce Plugin

| Feature | WooCommerce Plugin | Shopify Integration |
|---------|-------------------|-------------------|
| Attendee field capture | Single field | Single field ✅ |
| Property extraction | ✅ | ✅ |
| Contact creation | ✅ | ✅ |
| Single enrolment | Attendee | Attendee ✅ |
| Group booking (qty > 1) | Same attendee | Same attendee ✅ |
| Fallback to purchaser | ✅ | ✅ |
| Email intake questions | After purchase | After purchase ✅ |

**Result:** Feature parity achieved! ✅

## Example Scenarios

### Scenario 1: Single Booking with Attendee

**Order:**
- Purchaser: John Smith (john@example.com)
- Product: First Aid Training
- Quantity: 1
- Attendee Name: Sarah Johnson

**Result:**
- Contact created: Sarah Johnson
- Enrolment created for: Sarah Johnson (contactID: 123456)
- Log shows: customer_name = "Sarah Johnson"

### Scenario 2: Group Booking

**Order:**
- Purchaser: John Smith (john@example.com)
- Product: First Aid Training
- Quantity: 3
- Attendee Name: Sarah Johnson

**Result:**
- Contact created: Sarah Johnson
- 3 enrolments created for: Sarah Johnson
- All logs show: customer_name = "Sarah Johnson"
- Metadata shows: groupBooking = true, quantity = 3

### Scenario 3: No Attendee Info (Fallback)

**Order:**
- Purchaser: John Smith (john@example.com)
- Product: First Aid Training
- Quantity: 1
- Attendee Name: (not provided)

**Result:**
- Contact used: John Smith (from billing)
- Enrolment created for: John Smith
- Log shows: customer_name = "John Smith", isPurchaser = true

## Testing

### Test with Attendee

```bash
# Use test-order.json which includes attendee information
curl -X POST http://localhost:3000/webhook/test \
  -H "Content-Type: application/json" \
  -d @test-order.json
```

Check logs for:
- "Attendee found in booking: Sarah Johnson"
- "Attendee contact ready: [contactID]"
- Customer name in database = "Sarah Johnson"

### Test without Attendee

1. Remove "Attendee Name" property from test-order.json
2. Send webhook
3. Check logs for: "No attendee info found, using purchaser"
4. Customer name in database = "John Smith" (purchaser)

## Configuration

No additional configuration needed! The integration automatically:
- ✅ Detects attendee information from booking properties
- ✅ Creates contacts for attendees
- ✅ Falls back to purchaser if no attendee data
- ✅ Handles group bookings correctly
- ✅ Logs all information for audit

## Future Enhancements

While the current implementation matches the WooCommerce plugin functionality, potential future enhancements include:

1. **Multiple Attendees for Group Bookings**
   - Capture separate attendee names for each quantity
   - Create individual contacts and enrolments
   - Requires Easy Appointment Booking app update or custom form

2. **Enhanced Attendee Contact Details**
   - Extract attendee email and phone if provided
   - Use for better contact matching
   - Improve deduplication

3. **Post-Purchase Attendee Collection**
   - Send form to collect full attendee details
   - Update aXcelerate contacts with additional info
   - Link to USI collection process

4. **Attendee Transfer**
   - Allow purchaser to transfer booking to different attendee
   - Update enrolment contact in aXcelerate
   - Send notifications

These are **not currently needed** as they exceed the WooCommerce plugin capabilities.

---

**Summary:** The Shopify integration now handles attendee information exactly like the WooCommerce plugin, with a single attendee field per booking that can be used for multiple enrolments (group bookings).

