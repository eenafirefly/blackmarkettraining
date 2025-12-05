// src/routes/auth.js
// OAuth and Authentication routes for aXcelerate integration

import express from 'express';
import crypto from 'crypto';

const router = express.Router();

// In-memory session storage (use Redis in production)
const sessions = new Map();

/**
 * Generate a secure random state token for OAuth
 */
function generateStateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Store session data temporarily
 */
function storeSession(token, data, expiresInMinutes = 30) {
  const expiresAt = Date.now() + (expiresInMinutes * 60 * 1000);
  sessions.set(token, { ...data, expiresAt });
  
  // Clean up expired sessions
  setTimeout(() => {
    if (sessions.has(token)) {
      sessions.delete(token);
    }
  }, expiresInMinutes * 60 * 1000);
}

/**
 * Retrieve and validate session data
 */
function getSession(token) {
  const session = sessions.get(token);
  if (!session) return null;
  
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }
  
  return session;
}

// =============================================================================
// aXcelerate Native Login Flow
// =============================================================================

/**
 * Initiate aXcelerate login
 * GET /api/auth/axcelerate/login
 * 
 * This redirects the user to aXcelerate's portal login page
 */
router.get('/axcelerate/login', (req, res) => {
  try {
    const { 
      instanceId, 
      courseId, 
      courseType,
      redirectUrl 
    } = req.query;
    
    // Validate required parameters
    if (!instanceId) {
      return res.status(400).json({ 
        error: 'Missing required parameter: instanceId' 
      });
    }
    
    // Generate state token for CSRF protection
    const stateToken = generateStateToken();
    
    // Store enrollment context in session
    storeSession(stateToken, {
      instanceId,
      courseId: courseId || null,
      courseType: courseType || 'p',
      redirectUrl: redirectUrl || req.headers.referer || '/',
      initiatedAt: new Date().toISOString()
    });
    
    // Build aXcelerate login URL
    const axLoginUrl = new URL(`https://${process.env.AXCELERATE_WS_URL}/portal/login`);
    
    // Set return URL to our callback
    const callbackUrl = `${req.protocol}://${req.get('host')}/api/auth/axcelerate/callback`;
    axLoginUrl.searchParams.set('return_url', callbackUrl);
    axLoginUrl.searchParams.set('state', stateToken);
    
    console.log('Redirecting to aXcelerate login:', axLoginUrl.toString());
    
    // Redirect user to aXcelerate login
    res.redirect(axLoginUrl.toString());
    
  } catch (error) {
    console.error('Error initiating aXcelerate login:', error);
    res.status(500).json({ 
      error: 'Failed to initiate login',
      message: error.message 
    });
  }
});

/**
 * aXcelerate login callback
 * GET /api/auth/axcelerate/callback
 * 
 * aXcelerate redirects back here with an access code
 */
router.get('/axcelerate/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    
    // Check for OAuth error
    if (error) {
      console.error('aXcelerate login error:', error);
      return res.redirect(`/?auth_error=${encodeURIComponent(error)}`);
    }
    
    // Validate state token
    if (!state) {
      return res.status(400).send('Missing state parameter');
    }
    
    const session = getSession(state);
    if (!session) {
      return res.status(400).send('Invalid or expired session');
    }
    
    // Validate access code
    if (!code) {
      return res.status(400).send('Missing authorization code');
    }
    
    // Exchange code for contact ID using aXcelerate's login API
    console.log('Exchanging access code for contact ID...');
    
    const loginResponse = await fetch(
      `${process.env.AXCELERATE_API_URL}/user/login`,
      {
        method: 'POST',
        headers: {
          'APIToken': process.env.AXCELERATE_API_TOKEN,
          'WSToken': process.env.AXCELERATE_WS_TOKEN,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `code=${encodeURIComponent(code)}`
      }
    );
    
    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      console.error('aXcelerate login API error:', loginResponse.status, errorText);
      throw new Error('Failed to authenticate with aXcelerate');
    }
    
    const userData = await loginResponse.json();
    console.log('User authenticated:', userData.CONTACTID);
    
    // Store authenticated contact ID
    const authToken = generateStateToken();
    storeSession(authToken, {
      contactId: userData.CONTACTID,
      email: userData.EMAIL,
      givenName: userData.GIVENNAME,
      surname: userData.SURNAME,
      ...session // Include original enrollment context
    });
    
    // Redirect back to enrollment page with auth token
    const redirectUrl = new URL(session.redirectUrl, `${req.protocol}://${req.get('host')}`);
    redirectUrl.searchParams.set('auth_token', authToken);
    redirectUrl.searchParams.set('contact_id', userData.CONTACTID);
    
    res.redirect(redirectUrl.toString());
    
  } catch (error) {
    console.error('aXcelerate callback error:', error);
    res.status(500).send('Authentication failed: ' + error.message);
  }
});

/**
 * Create authenticated enrollment
 * POST /api/auth/enroll/authenticated
 * 
 * Enrolls an authenticated user directly
 */
router.post('/enroll/authenticated', async (req, res) => {
  try {
    const authToken = req.headers.authorization?.replace('Bearer ', '');
    
    if (!authToken) {
      return res.status(401).json({ 
        error: 'Missing authentication token' 
      });
    }
    
    // Retrieve authenticated session
    const session = getSession(authToken);
    if (!session || !session.contactId) {
      return res.status(401).json({ 
        error: 'Invalid or expired authentication' 
      });
    }
    
    const { instanceId, courseType } = req.body;
    
    // Validate required fields
    if (!instanceId) {
      return res.status(400).json({ 
        error: 'Missing required parameter: instanceId' 
      });
    }
    
    console.log('Creating authenticated enrollment:', {
      contactId: session.contactId,
      instanceId,
      courseType: courseType || 'p'
    });
    
    // Create enrollment using aXcelerate API
    const enrollmentData = {
      contactID: session.contactId,
      instanceID: instanceId,
      type: courseType || 'p',
      tentative: true // Mark as tentative until payment
    };
    
    const enrollResponse = await fetch(
      `${process.env.AXCELERATE_API_URL}/course/enrol`,
      {
        method: 'POST',
        headers: {
          'APIToken': process.env.AXCELERATE_API_TOKEN,
          'WSToken': process.env.AXCELERATE_WS_TOKEN,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: Object.keys(enrollmentData)
          .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(enrollmentData[key])}`)
          .join('&')
      }
    );
    
    if (!enrollResponse.ok) {
      const errorText = await enrollResponse.text();
      console.error('Enrollment error:', enrollResponse.status, errorText);
      throw new Error('Failed to create enrollment');
    }
    
    const enrollResult = await enrollResponse.json();
    
    console.log('Enrollment created successfully:', enrollResult);
    
    res.json({
      success: true,
      message: `Welcome back, ${session.givenName}! Your enrollment has been created.`,
      data: {
        contactId: session.contactId,
        invoiceId: enrollResult.invoiceID,
        invoiceNumber: enrollResult.invoiceNumber,
        instanceId: instanceId
      }
    });
    
  } catch (error) {
    console.error('Authenticated enrollment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create enrollment',
      message: error.message
    });
  }
});

// =============================================================================
// Google OAuth Integration (Optional)
// =============================================================================

/**
 * Initiate Google OAuth
 * GET /api/auth/google/login
 */
router.get('/google/login', (req, res) => {
  const { instanceId, courseId, courseType, redirectUrl } = req.query;
  
  // Check if Google OAuth is configured
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(501).json({ 
      error: 'Google OAuth not configured',
      message: 'Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables'
    });
  }
  
  // Generate state token
  const stateToken = generateStateToken();
  
  // Store enrollment context
  storeSession(stateToken, {
    provider: 'google',
    instanceId,
    courseId,
    courseType: courseType || 'p',
    redirectUrl: redirectUrl || req.headers.referer || '/'
  });
  
  // Build Google OAuth URL
  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID);
  googleAuthUrl.searchParams.set('redirect_uri', `${req.protocol}://${req.get('host')}/api/auth/google/callback`);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'email profile');
  googleAuthUrl.searchParams.set('state', stateToken);
  
  res.redirect(googleAuthUrl.toString());
});

/**
 * Google OAuth callback
 * GET /api/auth/google/callback
 */
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    
    if (error) {
      return res.redirect(`/?auth_error=${encodeURIComponent(error)}`);
    }
    
    const session = getSession(state);
    if (!session) {
      return res.status(400).send('Invalid or expired session');
    }
    
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${req.protocol}://${req.get('host')}/api/auth/google/callback`,
        grant_type: 'authorization_code'
      })
    });
    
    const tokens = await tokenResponse.json();
    
    // Get user info
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { 'Authorization': `Bearer ${tokens.access_token}` }
    });
    
    const userInfo = await userResponse.json();
    
    // Find or create contact in aXcelerate
    const contactId = await findOrCreateContact(
      userInfo.given_name,
      userInfo.family_name,
      userInfo.email
    );
    
    // Store authenticated session
    const authToken = generateStateToken();
    storeSession(authToken, {
      contactId,
      email: userInfo.email,
      givenName: userInfo.given_name,
      surname: userInfo.family_name,
      ...session
    });
    
    // Redirect back
    const redirectUrl = new URL(session.redirectUrl, `${req.protocol}://${req.get('host')}`);
    redirectUrl.searchParams.set('auth_token', authToken);
    res.redirect(redirectUrl.toString());
    
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(500).send('Authentication failed');
  }
});

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Find existing contact or create new one in aXcelerate
 */
async function findOrCreateContact(givenName, surname, email) {
  try {
    // Search for existing contact
    const searchResponse = await fetch(
      `${process.env.AXCELERATE_API_URL}/contacts/search?email=${encodeURIComponent(email)}`,
      {
        headers: {
          'APIToken': process.env.AXCELERATE_API_TOKEN,
          'WSToken': process.env.AXCELERATE_WS_TOKEN
        }
      }
    );
    
    if (searchResponse.ok) {
      const contacts = await searchResponse.json();
      if (contacts && contacts.length > 0) {
        console.log('Found existing contact:', contacts[0].CONTACTID);
        return contacts[0].CONTACTID;
      }
    }
    
    // Create new contact
    console.log('Creating new contact:', { givenName, surname, email });
    
    const createResponse = await fetch(
      `${process.env.AXCELERATE_API_URL}/contact`,
      {
        method: 'POST',
        headers: {
          'APIToken': process.env.AXCELERATE_API_TOKEN,
          'WSToken': process.env.AXCELERATE_WS_TOKEN,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `givenName=${encodeURIComponent(givenName)}&surname=${encodeURIComponent(surname)}&email=${encodeURIComponent(email)}`
      }
    );
    
    if (!createResponse.ok) {
      throw new Error('Failed to create contact');
    }
    
    const newContact = await createResponse.json();
    console.log('Created new contact:', newContact.CONTACTID);
    return newContact.CONTACTID;
    
  } catch (error) {
    console.error('Error in findOrCreateContact:', error);
    throw error;
  }
}

/**
 * Verify authentication token (middleware)
 */
export function requireAuth(req, res, next) {
  const authToken = req.headers.authorization?.replace('Bearer ', '');
  
  if (!authToken) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const session = getSession(authToken);
  if (!session || !session.contactId) {
    return res.status(401).json({ error: 'Invalid or expired authentication' });
  }
  
  req.auth = session;
  next();
}

// =============================================================================
// Course Listing Endpoints (for Shopify frontend)
// =============================================================================

/**
 * Helper function to search course instances (POST method required by aXcelerate)
 */
async function searchCourseInstances(searchParams) {
  const url = `${process.env.AXCELERATE_API_URL}/course/instance/search`;
  
  console.log(`Searching Axcelerate courses: ${url}`, searchParams);
  
  const formDataString = Object.keys(searchParams)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(String(searchParams[key]))}`)
    .join('&');
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'APIToken': process.env.AXCELERATE_API_TOKEN,
      'WSToken': process.env.AXCELERATE_WS_TOKEN,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(formDataString)
    },
    body: formDataString
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Axcelerate API error: ${response.status} - ${errorText}`);
    throw new Error(`Axcelerate API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get all qualifications (Programs)
 * GET /api/axcelerate/courses/qualifications
 */
router.get('/courses/qualifications', async (req, res) => {
  try {
    console.log('Fetching qualifications...');
    const data = await searchCourseInstances({ course_type: 'p' });
    console.log(`Successfully fetched ${Array.isArray(data) ? data.length : 0} qualifications`);
    res.json(data);
  } catch (error) {
    console.error('Error fetching qualifications:', error);
    res.status(500).json({ 
      error: 'Failed to fetch qualifications',
      message: error.message 
    });
  }
});

/**
 * Get all workshops
 * GET /api/axcelerate/courses/workshops
 */
router.get('/courses/workshops', async (req, res) => {
  try {
    console.log('Fetching workshops...');
    const data = await searchCourseInstances({ course_type: 'w' });
    console.log(`Successfully fetched ${Array.isArray(data) ? data.length : 0} workshops`);
    res.json(data);
  } catch (error) {
    console.error('Error fetching workshops:', error);
    res.status(500).json({ 
      error: 'Failed to fetch workshops',
      message: error.message 
    });
  }
});

/**
 * Get specific course details
 * GET /api/axcelerate/courses/:id
 */
router.get('/courses/:id', async (req, res) => {
  try {
    const instanceId = req.params.id;
    const courseType = req.query.type || 'p';
    console.log(`Fetching course instance details for ID: ${instanceId}, type: ${courseType}`);
    
    // Fetch all courses of this type
    const allCourses = await searchCourseInstances({ 
      course_type: courseType 
    });
    
    // Filter to find the specific instance
    const course = Array.isArray(allCourses) 
      ? allCourses.find(c => String(c.INSTANCEID) === String(instanceId))
      : null;
    
    if (!course) {
      console.log(`❌ Course instance ${instanceId} not found`);
      return res.status(404).json({ 
        error: 'Course not found',
        message: `No course found with instance ID ${instanceId}`,
        instanceId: instanceId,
        courseType: courseType
      });
    }
    
    console.log(`✅ Successfully found course instance ${instanceId}`);
    
    // Return as array to match the format expected by frontend
    res.json([course]);
  } catch (error) {
    console.error('❌ Error fetching course details:', error);
    
    res.status(500).json({ 
      error: 'Failed to fetch course details',
      message: error.message,
      instanceId: req.params.id,
      courseType: req.query.type || 'p'
    });
  }
});

/**
 * Search contacts (for existing record check)
 * GET /api/axcelerate/contact/search
 */
router.get('/contact/search', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ 
        error: 'Missing required query parameter: email' 
      });
    }
    
    console.log('Searching for contact:', email);
    
    const response = await fetch(
      `${process.env.AXCELERATE_API_URL}/contacts?email=${encodeURIComponent(email)}`,
      {
        headers: {
          'APIToken': process.env.AXCELERATE_API_TOKEN,
          'WSToken': process.env.AXCELERATE_WS_TOKEN
        }
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`aXcelerate API error: ${response.status}`, errorText);
      // Return empty array on error instead of throwing
      return res.json([]);
    }
    
    const data = await response.json();
    console.log('Contact search result:', data);
    
    // Ensure we always return an array
    if (Array.isArray(data)) {
      res.json(data);
    } else if (data && data.ERROR) {
      // aXcelerate returned an error object
      console.log('aXcelerate returned error:', data.MESSAGES);
      res.json([]);
    } else if (data) {
      // Single contact returned, wrap in array
      res.json([data]);
    } else {
      // No data
      res.json([]);
    }
  } catch (error) {
    console.error('Error searching contacts:', error);
    res.status(500).json({ 
      error: 'Failed to search contacts',
      message: error.message 
    });
  }
});

export default router;