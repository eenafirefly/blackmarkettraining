# Widget Testing & Debugging Guide

## Issues Fixed in Latest Version

✅ **Fixed widget_id inconsistencies** - All elements now use widget_id consistently  
✅ **Added data attributes** - Widget reads course info from HTML  
✅ **Added console logging** - Better debugging  
✅ **Added validation** - Checks if instanceId exists before OAuth  

## How to Test

### Step 1: Upload Widget to Shopify

1. Go to **Shopify Admin** → **Online Store** → **Themes** → **Edit code**
2. Under **Snippets**, find or create: `axcelerate-enrollment-widget`
3. Replace ALL content with the updated version from:
   ```
   shopify-axcelerate-enrollment-widget.liquid
   ```
4. **Save**

### Step 2: Update Your Section to Pass Parameters

Your section file (in **Sections** folder) should look like this:

```liquid
{% comment %} Extract URL parameters {% endcomment %}
{% assign course_id = request.get_parameters.course_id %}
{% assign course_type = request.get_parameters.course_type %}
{% assign instance_id = request.get_parameters.instance_id %}

<div class="qualification-section">
  
  {% comment %} Render the widget with parameters {% endcomment %}
  {% render 'axcelerate-enrollment-widget', 
    course_id: course_id, 
    course_type: course_type, 
    instance_id: instance_id,
    config_id: 'default'
  %}
  
</div>
```

### Step 3: Test with Browser Console

1. Visit: `https://blackmarket-training.myshopify.com/pages/qualification-details?course_id=94138&course_type=w&instance_id=2103213`

2. **Open Browser Console** (F12 or Right-click → Inspect → Console)

3. **Look for these console logs:**

```
Widget initialized: { widgetId: "default", courseId: "94138", courseType: "w", instanceId: "2103213" }
```

```
Elements found: { loading: true, error: true, form: true, stepLogin: true, stepBackground: true }
```

### Step 4: Test Google Login

1. Click "Continue with Google"
2. **Check console** - should see:
   ```
   Initiating OAuth login: google
   Course data: { instanceId: "2103213", courseId: "94138", courseType: "w" }
   Redirecting to: https://blackmarkettraining.onrender.com/api/auth/google/login?instanceId=...
   ```

3. Should redirect to Google (not get alert or error)

### Step 5: Test aXcelerate Login

1. Click "Continue with aXcelerate"
2. Should redirect to aXcelerate login page

### Step 6: Test Manual Form

1. Enter name and email
2. Click "CREATE"
3. Should either:
   - Show "Existing Record Found" modal (if email exists)
   - OR proceed to Background step (if new email)

## Common Issues & Fixes

### Issue: "Widget element not found"

**Cause:** The snippet name doesn't match what's in your section.

**Fix:** 
- Check snippet name is exactly: `axcelerate-enrollment-widget`
- Check render tag uses same name: `{% render 'axcelerate-enrollment-widget' %}`

### Issue: Alert "Missing instance ID"

**Cause:** URL parameters not being passed to widget.

**Fix in your section file:**
```liquid
{% assign instance_id = request.get_parameters.instance_id %}

{% render 'axcelerate-enrollment-widget', 
  instance_id: instance_id,
  course_id: course_id,
  course_type: course_type
%}
```

### Issue: Console shows "undefined" for courseId/instanceId

**Cause:** Data attributes not set on widget div.

**Check:** Line 13-21 of widget should have:
```liquid
<div id="ax-enrol-widget-{{ widget_id }}" 
     data-course-id="{{ course_id }}"
     data-course-type="{{ course_type }}"
     data-instance-id="{{ instance_id }}">
```

### Issue: Google login doesn't redirect

**Check:**
1. RENDER_APP_URL is correct (line 703)
2. instanceId is not undefined
3. No JavaScript errors in console

### Issue: Background step doesn't show after OAuth

**Cause:** OAuth callback parameters not being detected.

**Fix:** Check if URL has `?auth_token=xxx&contact_id=xxx` after OAuth redirect.

## Debug Checklist

Open browser console and check:

- [ ] Widget element found (`Widget initialized: ...`)
- [ ] All elements found (`Elements found: { ... }`)
- [ ] instanceId is not undefined
- [ ] Google button click logs "Initiating OAuth login"
- [ ] Redirect URL is built correctly
- [ ] After OAuth, URL contains `auth_token` parameter

## Test Each Feature

### ✅ Google OAuth
1. Click "Continue with Google"
2. Should redirect to Google
3. Log in with Google
4. Should return to Shopify
5. Should show Background step

### ✅ aXcelerate OAuth  
1. Click "Continue with aXcelerate"
2. Should redirect to aXcelerate
3. Log in with aXcelerate
4. Should return to Shopify
5. Should show Background step

### ✅ Manual Form - New User
1. Enter NEW email
2. Enter name
3. Click "CREATE"
4. Should show Background step

### ✅ Manual Form - Existing User
1. Enter email that EXISTS in aXcelerate
2. Enter name
3. Click "CREATE"
4. Should show "Existing Record Found" modal

### ✅ Background Form
1. After login, fill all fields
2. Click "Continue"
3. Should submit enrollment
4. Should show success message

## Quick Debug Commands

In browser console, type these to check values:

```javascript
// Check if widget found
console.log(document.getElementById('ax-enrol-widget-default'));

// Check data attributes
const widget = document.getElementById('ax-enrol-widget-default');
console.log({
  courseId: widget?.dataset.courseId,
  courseType: widget?.dataset.courseType,
  instanceId: widget?.dataset.instanceId
});

// Check RENDER_APP_URL
console.log(RENDER_APP_URL);
```

## Still Not Working?

**Share these details:**
1. Screenshot of browser console
2. What you see when clicking login buttons
3. Your section code (how you're rendering the widget)
4. The URL you're testing on

---

**Next:** 
1. Upload updated widget to Shopify
2. Make sure section passes parameters
3. Test and check console logs
4. Report what you see!

