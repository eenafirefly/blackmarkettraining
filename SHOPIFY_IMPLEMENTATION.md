# 🚀 Shopify Implementation - Quick Start

## What You Need to Do

Upload the new dynamic widget to Shopify and it will automatically fetch all 14 enrollment form steps!

---

## 📋 Step-by-Step Instructions

### 1. Open Shopify Code Editor

1. Go to your Shopify Admin: https://blackmarket-training.myshopify.com/admin
2. Navigate to: **Online Store → Themes**
3. Click **Actions → Edit Code** (on your active theme)

### 2. Upload Widget Snippet

1. In the left sidebar, find the **Snippets** folder
2. Click **Add a new snippet**
3. Name it: `axcelerate-enrollment-widget` (exactly this name)
4. Click **Create snippet**
5. Open the file: `shopify-axcelerate-enrollment-widget-DYNAMIC.liquid` from your local project
6. Copy **ALL** the code (it's about 1,900 lines)
7. Paste into the Shopify snippet editor
8. Click **Save** (top right)

### 3. Verify Section Template

Your section template should already be set up. Just verify it has:

**File:** `sections/axcelerate-qualifications.liquid`

```liquid
{% assign course_id = request.get_parameters.course_id %}
{% assign course_type = request.get_parameters.course_type %}
{% assign instance_id = request.get_parameters.instance_id %}

{% render 'axcelerate-enrollment-widget',
  course_id: course_id,
  course_type: course_type,
  instance_id: instance_id,
  config_id: '3'
%}
```

**IMPORTANT:** Notice the `config_id: '3'` parameter - this tells the widget to use Config ID 3!

### 4. Test the Widget

1. Go to a qualification page on your store:
   ```
   https://blackmarket-training.myshopify.com/pages/qualification-details?course_id=94138&course_type=w&instance_id=2103212
   ```

2. The widget should:
   - ✅ Load without errors
   - ✅ Display "ENROLLING IN [Course Name]"
   - ✅ Show Login step with Google, aXcelerate, and Manual options
   - ✅ Progress indicators should show at least 7 steps

3. Open browser DevTools (F12 → Console tab)
   - You should see logs like:
   ```
   🚀 Initializing dynamic enrollment widget...
   📋 Fetching form configurations for config ID: 3
   ✅ Loaded config for background: 16 fields
   ✅ Loaded config for subjectmatter: 4 fields
   ... (etc for all steps)
   ✅ All form configurations loaded
   📊 Progress steps built: 14 steps
   ```

4. Test Login Flow:
   - Click **Continue with Google** → Should redirect to Google OAuth
   - OR click **Continue with aXcelerate** → Should go to aXcelerate login
   - OR fill in Name + Email → Should check for existing contact

5. After Login:
   - Should automatically show **Step 2: Background** with 16 fields
   - Fill in some fields and click **Continue**
   - Should advance to **Step 3: Subject Matter Aptitude**
   - Use **Back** button to verify navigation works

6. Test Progress Saving:
   - Fill in a few fields
   - Close the browser tab
   - Reopen the same URL
   - Widget should restore your progress and show the step you were on

---

## 🎯 What the Widget Does

### On Page Load
```
1. Reads course_id, course_type, instance_id from URL
2. Fetches course details from backend API
3. Fetches all 13 step configurations (config ID 3)
4. Builds progress indicator with all 14 steps
5. Renders all step forms dynamically
6. Shows login step first
```

### After User Logs In
```
1. Receives auth_token and contact_id from OAuth
2. Automatically shows Step 2 (Background)
3. User fills in fields and clicks Continue
4. Data saved to sessionStorage + localStorage
5. Advances to next step
6. Repeats for all 14 steps
7. Final step: Declaration & Submit
8. Sends all collected data to backend API
9. Backend creates enrollment in aXcelerate
10. Shows success message
```

### Progress Saving
```
- Auto-saves every 30 seconds to localStorage
- Saves on page unload
- Includes: contactId, currentStep, all formData
- Restores automatically on page load
- Expires after 7 days
```

---

## 🔍 Debugging

### If widget doesn't load:

1. **Check Snippet Name:**
   - Must be exactly: `axcelerate-enrollment-widget`
   - Case-sensitive!

2. **Check Section Render:**
   - Section must use: `{% render 'axcelerate-enrollment-widget', ... %}`
   - NOT: `{% include 'axcelerate-enrollment-widget', ... %}`

3. **Check Browser Console:**
   - Open DevTools (F12)
   - Look for red error messages
   - Common issues:
     - `Widget element not found` → Snippet name mismatch
     - `Failed to fetch` → Backend API issue
     - `CORS error` → Backend CORS config issue

4. **Check Backend:**
   - Go to: https://blackmarkettraining.onrender.com/api/axcelerate/form-config/3/background
   - Should return JSON with fields array
   - If 404: Config files not deployed
   - If 500: Backend error (check Render logs)

### If fields don't show:

1. Check console logs for: `✅ Loaded config for [step]: X fields`
2. If 0 fields, the config might be empty
3. Check the config file in GitHub: `configs/form-config-3-[step].json`
4. Verify `fields` array exists and has items

### If conditional logic doesn't work:

1. Check field has `events` property in config
2. Check console for event listener errors
3. Try manually: console.log field IDs to verify they match

---

## 🎨 Customization

### Change Widget Colors

Find in the widget's `<style>` section:

```css
/* Primary color (buttons, active state) */
.ax-btn-primary {
  background: #2196F3;  /* Change this */
}

/* Success color (completed steps) */
.ax-step.completed .ax-step-indicator {
  background: #4CAF50;  /* Change this */
}
```

### Change Progress Steps Display

Find in the widget's JavaScript:

```javascript
// Limit to first 7 steps for display
const displaySteps = allSteps.slice(0, 7);
```

Change `7` to show more or fewer steps.

### Change Auto-Save Interval

Find in the widget's JavaScript:

```javascript
// Auto-save every 30 seconds
setInterval(() => {
  if (contactId && currentStep !== 'login') {
    saveProgress();
  }
}, 30000);  // Change 30000 to desired milliseconds
```

---

## 📊 All 14 Steps

When fully loaded, the widget will have:

1. **Login** - OAuth + Manual entry
2. **Background** - 16 fields (USI, study history, etc.)
3. **Subject Matter Aptitude** - 4 fields (experience, knowledge)
4. **Personal Details** - 9 fields (name, DOB, gender, USI)
5. **Contact Details** - 7 fields (email, phone, organization)
6. **Address** - 21 fields (residential + postal)
7. **Emergency Contact** - 3 fields
8. **Nationality** - 9 fields (citizenship, language)
9. **Schooling** - 7 fields (education history)
10. **Additional Details** - 7 fields (disability, indigenous, employment)
11. **Study Reason** - 1 field (motivation)
12. **Enrolment Documents** - Portfolio (ID, proof of residency)
13. **Review Details** - Summary of all entered data
14. **Declaration** - Privacy notice + terms acceptance

---

## ✅ Success Criteria

After implementation, you should see:

- [x] Widget loads on qualification pages
- [x] Course name displays correctly
- [x] Login options work (Google, aXcelerate, Manual)
- [x] All steps render with correct fields
- [x] Step navigation works (back/continue)
- [x] Progress saves automatically
- [x] Resume enrollment works after reload
- [x] Form validation prevents empty required fields
- [x] Conditional fields show/hide based on input
- [x] Final submission sends data successfully
- [x] Success message shows after enrollment

---

## 🆘 Need Help?

1. **Check Console Logs:** Open DevTools → Console (F12)
2. **Check Network Tab:** DevTools → Network → Filter by "axcelerate"
3. **Check Render Logs:** Go to Render dashboard → Your service → Logs
4. **Check Config Files:** GitHub → `configs/` directory
5. **Re-read Guide:** `DYNAMIC_WIDGET_GUIDE.md`

---

## 🎉 You're All Set!

Once uploaded, the widget will:
- ✅ Automatically fetch all configurations
- ✅ Render all 14 steps dynamically
- ✅ Handle all field types and validations
- ✅ Save progress and allow resume
- ✅ Submit complete enrollment to aXcelerate

**No more manual HTML updates needed!** 🚀

Just update the JSON files in `configs/` and push to GitHub. The widget will automatically use the new configuration!

