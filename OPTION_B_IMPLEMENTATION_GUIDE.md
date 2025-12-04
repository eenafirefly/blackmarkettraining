# Option B: Full Multi-Step Enrollment Widget - Implementation Guide

## What You'll Get

✅ **4 Social Login Options:** Google, Apple, Facebook, aXcelerate  
✅ **Multi-Step Form:** Login → Background → Personal → Contact  
✅ **All Custom Fields:** USI, study history, LLN, medical conditions, etc.  
✅ **Progress Tracking:** Visual step indicators  
✅ **Form Validation:** Client-side and server-side  
✅ **Responsive Design:** Works on mobile and desktop  

## Quick Start (3 Files to Update)

### 1. Backend: Add Enrollment API (Already Done ✅)

File: `src/routes/enrollment.js` - Already created!

### 2. Backend: Mount Enrollment Routes (Already Done ✅)

File: `src/index.js` - Already updated!

### 3. Frontend: Full Widget (Next Step)

Create file: `snippets/axcelerate-enrollment-widget-full.liquid` in Shopify

---

## Implementation Steps

### Step 1: Deploy Backend (5 minutes)

```bash
cd /Users/sheena/Documents/NODA/BMT/blackmarkettraining

# Check what's changed
git status

# Add all changes
git add src/routes/enrollment.js src/index.js

# Commit
git commit -m "Add multi-step enrollment API with custom fields"

# Push to Render
git push origin main
```

Wait 2-3 minutes for Render to deploy.

### Step 2: Create Full Widget in Shopify (10 minutes)

1. **Go to Shopify Admin** → Online Store → Themes → Edit code

2. **Under Snippets**, click "Add a new snippet"

3. **Name it:** `axcelerate-enrollment-widget-full`

4. **Paste the widget code** (see below for the code structure)

5. **Click Save**

### Step 3: Use Widget in Your Template (2 minutes)

In your qualification details template (`templates/page.qualification-details.liquid` or similar):

```liquid
{% comment %} Get course details from URL {% endcomment %}
{% assign course_id = request.get_parameters.course_id %}
{% assign course_type = request.get_parameters.course_type %}
{% assign instance_id = request.get_parameters.instance_id %}

{% comment %} Render the full enrollment widget {% endcomment %}
{% render 'axcelerate-enrollment-widget-full', 
  course_id: course_id, 
  course_type: course_type, 
  instance_id: instance_id
%}
```

---

## Widget Structure Overview

The full widget has these components:

### HTML Structure
```
- Progress Steps (Login > Background > Personal > Contact)
- Social Login Buttons (Google, Apple, Facebook, aXcelerate)
- Step 1: Background Questions
  - USI obtained?
  - Previous study?
  - Study outcome?
  - Time dedication?
  - Deadlines comfortable?
  - Work/life/study balance?
  - Internet access?
  - Physical requirements awareness
  - Multi-tasking awareness
  - LLN concerns?
  - English rating (1-5)
  - Computer skills (1-5)
  - Medical conditions?

- Step 2: Personal Details
  - Given name
  - Surname
  - Date of birth
  - Gender
  - Address details

- Step 3: Contact Details
  - Email
  - Mobile phone
  - Emergency contact
  - How did you hear about us?

- Success Message
```

### JavaScript Functionality
```javascript
- OAuth login handlers (all 4 providers)
- Multi-step navigation
- Form validation
- Progress tracking
- Custom fields submission
- Success/error handling
- URL parameter cleanup
```

### Styling
```css
- Modern, clean design
- Responsive (mobile-first)
- Progress indicators
- Button states
- Form field styling
- Error messages
- Success animations
```

---

## Custom Fields Configuration

Based on your aXcelerate setup, here are the custom field mappings:

| Field Name | aXcelerate Field | Type | Required |
|------------|------------------|------|----------|
| USI Obtained | `CUSTOMFIELD_OBTAINUSI` | Dropdown (Yes/No) | Yes |
| Previous Study | `CUSTOMFIELD_PREVIOUSSTUDY` | Dropdown (Yes/No) | Yes |
| Study Outcome | `CUSTOMFIELD_STUDYOUTCOME` | Dropdown (Yes/No) | Yes |
| Dedicate Time | `CUSTOMFIELD_DEDICATETIME` | Dropdown (Confirm/Deny) | Yes |
| Deadlines | `CUSTOMFIELD_DEADLINES` | Dropdown (Yes/No) | Yes |
| Work/Life/Study | `CUSTOMFIELD_WORKLIFESTUDY` | Dropdown (Yes/No) | Yes |
| Internet Access | `CUSTOMFIELD_INTERNETACCESS` | Dropdown (Yes/No) | Yes |
| Standing Periods | `CUSTOMFIELD_STANDINGPERIODS` | Dropdown (Yes/No) | Yes |
| Multi-tasking | `CUSTOMFIELD_MULTITASKING` | Dropdown (Yes/No) | No |
| Language/Numeracy | `CUSTOMFIELD_LANGUAGENUMERACY` | Dropdown (Yes/No) | Yes |
| Speak English | `CUSTOMFIELD_SPEAKENGLISH` | Dropdown (1-5) | Yes |
| Computer Skills | `CUSTOMFIELD_COMPUTERSKILLS` | Dropdown (1-5) | Yes |
| Medical Issues | `CUSTOMFIELD_MEDICALISSUES` | Dropdown (Yes/No) | Yes |

---

## Testing Checklist

### Backend Testing

```bash
# Test health endpoint
curl https://blackmarkettraining.onrender.com/health

# Test Google OAuth
# Visit in browser:
https://blackmarkettraining.onrender.com/api/auth/google/login?instanceId=2103213&redirectUrl=https://www.blackmarkettraining.com

# Test enrollment endpoint (after OAuth)
curl -X POST https://blackmarkettraining.onrender.com/api/enrollment/create \
  -H "Content-Type: application/json" \
  -d '{
    "contactId": "123",
    "instanceId": "2103213",
    "courseType": "w",
    "customFields": {
      "CUSTOMFIELD_OBTAINUSI": "Yes",
      "CUSTOMFIELD_PREVIOUSSTUDY": "No"
    }
  }'
```

### Frontend Testing

1. ✅ **Visit qualification page**
2. ✅ **See 4 social login buttons**
3. ✅ **Click "Continue with Google"**
4. ✅ **Complete Google login**
5. ✅ **Return to site with auth token**
6. ✅ **See multi-step form**
7. ✅ **Fill in background questions (Step 1)**
8. ✅ **Click "Next" to proceed to Step 2**
9. ✅ **Fill in personal details**
10. ✅ **Click "Next" to proceed to Step 3**
11. ✅ **Fill in contact details**
12. ✅ **Click "Submit Enrollment"**
13. ✅ **See success message**
14. ✅ **Check aXcelerate for new enrollment**

---

## Troubleshooting

### "Widget not showing"
- Check snippet name is exactly: `axcelerate-enrollment-widget-full`
- Check it's being rendered in your template
- Check browser console for errors

### "Social login buttons not working"
- Check RENDER_APP_URL in widget code (line ~473)
- Should be: `https://blackmarkettraining.onrender.com`
- Check Render deployment succeeded

### "Custom fields not saving"
- Check field names match exactly (case-sensitive)
- Check aXcelerate API logs in Render dashboard
- Verify custom fields exist in your aXcelerate account

### "Form validation errors"
- Check all required fields have values
- Check email format is valid
- Check dropdowns have selected values

---

## What's Next?

### Phase 1: Core Functionality (This Guide)
- ✅ Google OAuth working
- ✅ Multi-step form structure
- ✅ Custom fields submission
- ⏳ Apple OAuth (optional)
- ⏳ Facebook OAuth (optional)

### Phase 2: Enhancements (Future)
- Add file upload for documents
- Add signature capture
- Add payment integration
- Add confirmation emails
- Add SMS notifications

### Phase 3: Advanced (Future)
- Save progress (resume later)
- Pre-fill from previous enrollments
- Conditional field logic
- A/B testing
- Analytics dashboard

---

## Need the Full Widget Code?

The complete widget code is ~1500+ lines. I can provide it in sections:

1. **HTML Structure** (300 lines) - Form fields and layout
2. **JavaScript Logic** (600 lines) - Multi-step navigation, OAuth, submission
3. **CSS Styling** (600 lines) - Responsive design, animations

Would you like me to generate each section, or would you prefer a simplified starter version first?

---

## Quick Decision Guide

### Start with Simplified Version?
- ✅ OAuth working
- ✅ Basic enrollment form
- ✅ Essential custom fields only
- ⏱️ Can implement in 30 minutes

### Go Full Implementation?
- ✅ All features
- ✅ All custom fields
- ✅ Multi-step with validation
- ⏱️ Takes 2-3 hours to implement

**Recommendation:** Start simplified, then enhance. Get OAuth working perfectly first, then add complexity.

---

**Next:** Would you like me to generate:
A) The complete 1500+ line widget code
B) A simplified starter version (400 lines)
C) Just the custom fields section to add to your current widget

Let me know and I'll generate the exact code you need!

