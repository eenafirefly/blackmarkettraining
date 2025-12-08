# 🧪 Test Form Data Saving to aXcelerate

## ✅ What Should Be Saved

When you fill out the Background step and click "Save", these fields should be saved to the aXcelerate contact:

### Background Step Fields:
- `usiYesNo`: Have you obtained your USI?
- `previousStudy`: Undertaken this type of study before?
- `studyOutcome`: Did you achieve a successful outcome?
- `dedicateTime`: Able to dedicate time to pre-reading?
- `deadlines`: Comfortable meeting deadlines?
- `workLifeStudy`: Discussed with partner/family/employer?
- `internet`: Access to reliable Internet?
- `standing`: Aware hospitality requires standing?
- `multiTask`: Aware coffee service requires multi-tasking?
- `llnDiscussYesNo`: Discuss language/literacy concerns?
- `spokenEnglish`: Rate spoken English (1-5)
- `computerSkills`: Rate computer skills (1-5)
- `medicalYesNo`: Any medical/physical conditions?

## 🔍 How to Test

### Step 1: Fill Out the Form

1. **Go to enrollment page**
2. **Enter NEW email** (not existing): `test-save-$(date +%s)@example.com`
3. **Enter name**: Test User
4. **Click CREATE**
5. **Fill out Background step**:
   - USI: Select "No"
   - Previous Study: Select "Yes"
   - Study Outcome: Select "Yes"
   - Dedicate Time: Select "Confirm"
   - Deadlines: Select "Yes"
   - Work/Life/Study: Select "Yes"
   - Internet: Select "Yes"
   - Standing: Select "Yes"
   - Multi-task: Select "Yes"
   - LLN Discuss: Select "No"
   - Spoken English: Select "5"
   - Computer Skills: Select "4"
   - Medical: Select "No"
6. **Click SAVE**

### Step 2: Check Browser Console

Look for these logs:

```
📊 Step data collected for step: background
   Number of fields: 13
   Fields: usiYesNo, previousStudy, studyOutcome, dedicateTime, deadlines, workLifeStudy, internet, standing, multiTask, llnDiscussYesNo, spokenEnglish, computerSkills, medicalYesNo
   Values: { usiYesNo: "No", previousStudy: "Yes", ... }

💾 Saving step data to aXcelerate:
   Step: background
   Contact ID: 15388xxx
   Fields to save: [usiYesNo, previousStudy, ...]
   Field values: { usiYesNo: "No", ... }

✅ Step data saved to aXcelerate successfully
   Saved 13 fields
```

### Step 3: Check Render Backend Logs

Go to: https://dashboard.render.com → Your service → Logs

Look for:

```
📝 Updating contact with step data...
📊 Fields to save: [ 'usiYesNo', 'previousStudy', 'studyOutcome', ... ]
📋 Full payload: {
  "usiYesNo": "No",
  "previousStudy": "Yes",
  "studyOutcome": "Yes",
  ...
}
✅ Contact updated successfully
✅ Saved 13 fields to aXcelerate
```

### Step 4: Verify in aXcelerate

1. **Log in to aXcelerate**
2. **Go to**: Contacts
3. **Search** for the test email you used
4. **Open** the contact
5. **Scroll down** to "Other Information" section
6. **Check**: All field values should be visible:
   - "Are you aware that hospitality may require you to stand" = Yes
   - "How do you rate your computer skills" = 4
   - "How do you rate your spoken English" = 5
   - etc.

## ❌ If Data NOT Saved

### Check 1: Frontend Console
If you see:
```
⚠️ No data collected from step: background
```
**Problem**: Form fields not being read properly

**Fix**: Check field IDs match between form and config

### Check 2: Backend Logs
If you see:
```
❌ Failed to update contact: 400 Bad Request
```
**Problem**: aXcelerate API rejected the data

**Possible causes**:
- Field names don't match aXcelerate custom fields
- Invalid data format
- API credentials wrong

### Check 3: Network Tab
1. Open browser DevTools → Network tab
2. Click Save button
3. Find request to `/api/enrollment/save-step`
4. Check request payload
5. Check response status

## 📊 Expected vs Actual

### Frontend Should Send:
```json
{
  "contactId": 15388071,
  "stepId": "background",
  "stepData": {
    "usiYesNo": "No",
    "previousStudy": "Yes",
    "studyOutcome": "Yes",
    "dedicateTime": "Confirm",
    "deadlines": "Yes",
    "workLifeStudy": "Yes",
    "internet": "Yes",
    "standing": "Yes",
    "multiTask": "Yes",
    "llnDiscussYesNo": "No",
    "spokenEnglish": "5",
    "computerSkills": "4",
    "medicalYesNo": "No"
  },
  "instanceId": "2103212",
  "courseType": "w",
  "courseName": "Accredited Barista Course"
}
```

### Backend Should Save to aXcelerate:
```
PUT /contact/15388071
Body: usiYesNo=No&previousStudy=Yes&studyOutcome=Yes&...
```

### aXcelerate Should Show:
All fields visible in "Other Information" section of contact record

## 🚀 Deploy to Test

```bash
git add src/routes/enrollment.js shopify-axcelerate-enrollment-widget-DYNAMIC.liquid TEST_FORM_DATA_SAVING.md
git commit -m "feat: Enhanced logging for form data saving to aXcelerate"
git push origin main
```

After deployment:
1. Clear browser cache
2. Test with new email
3. Fill background form
4. Click SAVE
5. Check all 3 locations (console, Render logs, aXcelerate)

## 💡 Custom Fields in aXcelerate

**Important**: The field IDs we use (like `usiYesNo`, `previousStudy`) must match custom field names in aXcelerate!

If aXcelerate uses different field names (like `Have you obtained your USI?` instead of `usiYesNo`), the data won't save properly.

**To check**: In aXcelerate admin → Settings → Custom Fields → Contact Fields

See what the actual field names/IDs are.

---

**Status**: ✅ Code ready with enhanced logging
**Next**: Deploy and test to see exact data flow
**Goal**: All 13 background fields visible in aXcelerate contact

