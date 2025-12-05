# Fix: Course Listings Not Showing

## Problem
Courses section on Shopify homepage is showing "Loading courses..." forever because the backend API endpoints don't exist.

## What Was Wrong
Your Shopify courses section tries to fetch from:
- `GET /api/axcelerate/courses/qualifications`
- `GET /api/axcelerate/courses/workshops`

But these endpoints weren't in `src/routes/axcelerate.js` (they were in the old `routes/axcelerate.js` file).

## What I Fixed
✅ Added course listing endpoints to `src/routes/axcelerate.js`:
- `/api/axcelerate/courses/qualifications` - Returns all qualification courses
- `/api/axcelerate/courses/workshops` - Returns all workshop courses
- `/api/axcelerate/courses/:id` - Returns specific course details
- `/api/axcelerate/contact/search` - Search contacts by email (for existing record check)

## Deploy Now

### Step 1: Commit and Push

```bash
cd /Users/sheena/Documents/NODA/BMT/blackmarkettraining

# Check what changed
git status

# Add the changes
git add src/routes/axcelerate.js

# Commit
git commit -m "Add course listing endpoints for Shopify homepage"

# Push to trigger Render deployment
git push origin main
```

### Step 2: Wait for Render Deployment
- Go to your Render dashboard
- Watch the deployment logs
- Wait ~2-3 minutes for deployment to complete

### Step 3: Test the Endpoints

After deployment, test these URLs in your browser:

**Test qualifications:**
```
https://blackmarkettraining.onrender.com/api/axcelerate/courses/qualifications
```

**Test workshops:**
```
https://blackmarkettraining.onrender.com/api/axcelerate/courses/workshops
```

You should see JSON data with courses, not an error.

### Step 4: Check Your Shopify Homepage

Visit your Shopify homepage where the courses section is:
```
https://blackmarket-training.myshopify.com/
```

The courses should now load and display!

## Troubleshooting

### Still showing "Loading courses..."?

**Check 1: Render Deployment**
- Make sure deployment succeeded in Render dashboard
- Check logs for any errors

**Check 2: Test API Endpoints**
- Visit the API URLs above in your browser
- You should see JSON data, not 404 or 500 errors

**Check 3: Browser Console**
- Open browser console (F12)
- Refresh your Shopify page
- Look for errors in Network tab
- Check if API calls are succeeding

**Check 4: CORS Errors**
- If you see CORS errors in console, the endpoints need CORS headers
- The code already has CORS configured, so this should work

### Getting 404 errors on API?
- Make sure you pushed to the correct branch (usually `main`)
- Check Render is deploying from the correct branch
- Verify `src/routes/axcelerate.js` has the new endpoints

### Getting 500 errors?
- Check Render logs for error details
- Verify environment variables are set:
  - `AXCELERATE_API_URL`
  - `AXCELERATE_API_TOKEN`
  - `AXCELERATE_WS_TOKEN`

### Empty array returned `[]`?
- This means aXcelerate API returned no courses
- Check if you have active courses in your aXcelerate account
- Check the aXcelerate API is responding correctly

## API Endpoints Added

### GET /api/axcelerate/courses/qualifications
Returns all qualification/program courses (type=p)

**Response:**
```json
[
  {
    "COURSENAME": "Certificate IV in...",
    "STARTDATE": "2025-01-15",
    "FINISHDATE": "2025-12-15",
    "COST": "4500.00",
    "INSTANCEID": "12345",
    "ID": "94138",
    "TYPE": "p"
  }
]
```

### GET /api/axcelerate/courses/workshops
Returns all workshop courses (type=w)

**Response:**
```json
[
  {
    "COURSENAME": "Barista Basics",
    "STARTDATE": "2025-01-20",
    "STARTTIME": "09:00:00",
    "ENDTIME": "17:00:00",
    "LOCATION": "Marrickville",
    "COUNT": 5,
    "COST": "250.00",
    "INSTANCEID": "2103213",
    "ID": "94138",
    "TYPE": "w"
  }
]
```

### GET /api/axcelerate/courses/:id?type=w
Returns specific course details

### GET /api/axcelerate/contact/search?email=user@example.com
Searches for existing contacts by email

---

**Status:** Ready to deploy
**Time:** ~5 minutes to deploy and test
**Next:** Run the deploy commands above!

