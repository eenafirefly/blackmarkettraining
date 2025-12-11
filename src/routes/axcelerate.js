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
    // Search for existing contact (use emailAddress parameter per aXcelerate API)
    const searchResponse = await fetch(
      `${process.env.AXCELERATE_API_URL}/contacts/search?emailAddress=${encodeURIComponent(email)}`,
      {
        headers: {
          'APIToken': process.env.AXCELERATE_API_TOKEN,
          'WSToken': process.env.AXCELERATE_WS_TOKEN
        }
      }
    );
    
    if (searchResponse.ok) {
      const data = await searchResponse.json();
      const contacts = Array.isArray(data) ? data : (data && data.CONTACTID ? [data] : []);
      
      // Filter to only contacts that actually match the email
      const matchingContacts = contacts.filter(contact => {
        if (!contact.EMAIL) return false;
        return contact.EMAIL.toLowerCase() === email.toLowerCase();
      });
      
      if (matchingContacts.length > 0) {
        console.log('Found existing contact:', matchingContacts[0].CONTACTID, matchingContacts[0].EMAIL);
        return matchingContacts[0].CONTACTID;
      }
      
      if (contacts.length > 0 && matchingContacts.length === 0) {
        console.warn(`⚠️ API returned ${contacts.length} contacts but none matched email "${email}"`);
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
        body: `givenName=${encodeURIComponent(givenName)}&surname=${encodeURIComponent(surname)}&emailAddress=${encodeURIComponent(email)}`
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
 * Helper: Get email from contact object (try different field names)
 */
function getContactEmail(contact) {
  return contact.EMAIL || contact.email || contact.emailAddress || contact.EMAILADDRESS || null;
}

/**
 * Get contact by ID (for pre-filling forms)
 * GET /api/axcelerate/contact/:contactId
 */
router.get('/contact/:contactId', async (req, res) => {
  try {
    const { contactId } = req.params;
    
    if (!contactId) {
      return res.status(400).json({ 
        error: 'Missing required parameter: contactId' 
      });
    }
    
    console.log('Fetching contact details for ID:', contactId);
    
    const response = await fetch(
      `${process.env.AXCELERATE_API_URL}/contact/${contactId}`,
      {
        headers: {
          'APIToken': process.env.AXCELERATE_API_TOKEN,
          'WSToken': process.env.AXCELERATE_WS_TOKEN
        }
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('aXcelerate API error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: 'Failed to fetch contact from aXcelerate',
        details: errorText
      });
    }
    
    const contact = await response.json();
    console.log('✅ Contact fetched:', contact.CONTACTID || contact.contactId);
    console.log('📧 Email field debug:');
    console.log('   EMAIL:', contact.EMAIL);
    console.log('   email:', contact.email);
    console.log('   EMAILADDRESS:', contact.EMAILADDRESS);
    console.log('   emailAddress:', contact.emailAddress);
    console.log('   EmailAddress:', contact.EmailAddress);
    console.log('   All contact keys:', Object.keys(contact).filter(k => k.toLowerCase().includes('email')));
    
    res.json(contact);
    
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ 
      error: 'Failed to fetch contact',
      message: error.message 
    });
  }
});

/**
 * Search contacts (for existing record check)
 * GET /api/axcelerate/contact/search
 */
router.get('/contact/search', async (req, res) => {
  try {
    // Accept emailAddress from query (frontend sends this) OR email for backwards compatibility
    const email = req.query.emailAddress || req.query.email;
    
    if (!email) {
      return res.status(400).json({ 
        error: 'Missing required query parameter: emailAddress' 
      });
    }
    
    console.log('='.repeat(80));
    console.log('🔍 CONTACT SEARCH REQUEST');
    console.log('='.repeat(80));
    console.log('Searching for email:', email);
    console.log('Encoded email:', encodeURIComponent(email));
    
    const searchUrl = `${process.env.AXCELERATE_API_URL}/contacts/search?emailAddress=${encodeURIComponent(email)}`;
    console.log('Search URL:', searchUrl);
    console.log('API URL from env:', process.env.AXCELERATE_API_URL);
    
    const response = await fetch(searchUrl, {
      headers: {
        'APIToken': process.env.AXCELERATE_API_TOKEN,
        'WSToken': process.env.AXCELERATE_WS_TOKEN
      }
    });
    
    console.log('📥 aXcelerate response status:', response.status);
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ aXcelerate API error: ${response.status}`);
      console.error('Error body:', errorText);
      // Return empty array on error instead of throwing
      return res.json([]);
    }
    
    const data = await response.json();
    console.log('📋 Raw API response type:', typeof data);
    console.log('📋 Is array:', Array.isArray(data));
    console.log('📋 Raw API response:', JSON.stringify(data, null, 2));
    
    // Ensure we always return an array
    let contacts = [];
    if (Array.isArray(data)) {
      contacts = data;
      console.log(`✅ Received array with ${contacts.length} contacts`);
    } else if (data && data.ERROR) {
      // aXcelerate returned an error object
      console.log('❌ aXcelerate returned error:', data.MESSAGES);
      return res.json([]);
    } else if (data && data.CONTACTID) {
      // Single contact returned, wrap in array
      contacts = [data];
      console.log(`✅ Received single contact, wrapped in array`);
    } else if (data && data.contacts && Array.isArray(data.contacts)) {
      // Sometimes aXcelerate returns { contacts: [...] }
      contacts = data.contacts;
      console.log(`✅ Received nested contacts array with ${contacts.length} contacts`);
    } else if (data && data.data && Array.isArray(data.data)) {
      // Sometimes aXcelerate returns { data: [...] }
      contacts = data.data;
      console.log(`✅ Received nested data array with ${contacts.length} contacts`);
    } else {
      // No data
      console.log('⚠️ No contacts found in response');
      return res.json([]);
    }
    
    console.log(`\n📊 Processing ${contacts.length} contacts`);
    console.log(`🎯 Target email: "${email}"`);
    console.log('-'.repeat(80));
    
    // Filter to only return contacts that actually match the email
    const matchingContacts = contacts.filter((contact, index) => {
      console.log(`\n🔍 Contact #${index + 1}:`);
      console.log(`   CONTACTID: ${contact.CONTACTID}`);
      console.log(`   Has EMAIL: ${!!contact.EMAIL}`);
      console.log(`   EMAIL value: "${contact.EMAIL}"`);
      console.log(`   Has email: ${!!contact.email}`);
      console.log(`   email value: "${contact.email}"`);
      console.log(`   All keys: ${Object.keys(contact).join(', ')}`);
      
      const contactEmail = getContactEmail(contact);
      if (!contactEmail) {
        console.log(`   ❌ RESULT: No email field found`);
        return false;
      }
      
      // Case-insensitive email comparison
      const matches = contactEmail.toLowerCase().trim() === email.toLowerCase().trim();
      console.log(`   📧 Contact email: "${contactEmail}"`);
      console.log(`   🎯 Search email:  "${email}"`);
      console.log(`   ${matches ? '✅ MATCH!' : '❌ NO MATCH'}`);
      return matches;
    });
    
    console.log('\n' + '='.repeat(80));
    console.log(`📊 SEARCH SUMMARY`);
    console.log(`   Total contacts returned by aXcelerate: ${contacts.length}`);
    console.log(`   Matching contacts found: ${matchingContacts.length}`);
    if (matchingContacts.length > 0) {
      console.log(`   ✅ Returning contact IDs: ${matchingContacts.map(c => c.CONTACTID).join(', ')}`);
    } else {
      console.log(`   ❌ No matching contacts found`);
      if (contacts.length > 0) {
        console.log(`   📋 Non-matching contacts: ${contacts.map(c => `ID:${c.CONTACTID} EMAIL:"${getContactEmail(c) || 'NONE'}"`).join(', ')}`);
      }
    }
    console.log('='.repeat(80));
    
    res.json(matchingContacts);
  } catch (error) {
    console.error('❌ ERROR in contact search:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to search contacts',
      message: error.message 
    });
  }
});

/**
 * Get enrollment form template for a course instance
 * GET /api/axcelerate/form-template/:instanceId
 * 
 * Fetches the custom form fields for a specific course instance
 */
router.get('/form-template/:instanceId', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const { templateID } = req.query;
    
    if (!instanceId) {
      return res.status(400).json({ 
        error: 'Missing required parameter: instanceId' 
      });
    }
    
    console.log('Fetching form template for instance:', instanceId, 'with template:', templateID);
    
    // Build the request to aXcelerate
    const requestBody = {
      instanceID: instanceId
    };
    
    // Add templateID if provided
    if (templateID) {
      requestBody.templateID = templateID;
    }
    
    const formDataString = Object.keys(requestBody)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(String(requestBody[key]))}`)
      .join('&');
    
    // Fetch form template from aXcelerate
    const response = await fetch(
      `${process.env.AXCELERATE_API_URL}/course/enrolment/form`,
      {
        method: 'POST',
        headers: {
          'APIToken': process.env.AXCELERATE_API_TOKEN,
          'WSToken': process.env.AXCELERATE_WS_TOKEN,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formDataString
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`aXcelerate form template API error: ${response.status}`, errorText);
      
      // Return a default/fallback form structure if API fails
      return res.json({
        success: false,
        error: 'Failed to fetch form template',
        message: errorText,
        fallback: true,
        fields: [] // Empty fields array for fallback
      });
    }
    
    const formData = await response.json();
    console.log('Form template fetched successfully');
    console.log('Form fields:', formData);
    
    res.json({
      success: true,
      instanceId,
      templateId: templateID,
      formData
    });
    
  } catch (error) {
    console.error('Error fetching form template:', error);
    res.status(500).json({ 
      error: 'Failed to fetch form template',
      message: error.message,
      fallback: true,
      fields: []
    });
  }
});

/**
 * Get enrollment form template with course details
 * GET /api/axcelerate/enrollment-form/:instanceId
 * 
 * Fetches both course details and form template in one call
 */
router.get('/enrollment-form/:instanceId', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const { templateID, type } = req.query;
    const courseType = type || 'w';
    
    console.log(`Fetching enrollment form for instance ${instanceId}, type: ${courseType}, template: ${templateID || 'default'}`);
    
    // Fetch course details
    const courseResponse = await searchCourseInstances({ 
      course_type: courseType 
    });
    
    const course = Array.isArray(courseResponse) 
      ? courseResponse.find(c => String(c.INSTANCEID) === String(instanceId))
      : null;
    
    if (!course) {
      return res.status(404).json({ 
        error: 'Course not found',
        message: `No course found with instance ID ${instanceId}`
      });
    }
    
    // Build form request
    const requestBody = {
      instanceID: instanceId
    };
    
    if (templateID) {
      requestBody.templateID = templateID;
    }
    
    const formDataString = Object.keys(requestBody)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(String(requestBody[key]))}`)
      .join('&');
    
    // Fetch form template
    let formFields = [];
    let formError = null;
    
    try {
      const formResponse = await fetch(
        `${process.env.AXCELERATE_API_URL}/course/enrolment/form`,
        {
          method: 'POST',
          headers: {
            'APIToken': process.env.AXCELERATE_API_TOKEN,
            'WSToken': process.env.AXCELERATE_WS_TOKEN,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: formDataString
        }
      );
      
      if (formResponse.ok) {
        const formData = await formResponse.json();
        formFields = formData.fields || formData || [];
      } else {
        const errorText = await formResponse.text();
        formError = `Form API error: ${formResponse.status} - ${errorText}`;
        console.warn(formError);
      }
    } catch (error) {
      formError = error.message;
      console.warn('Failed to fetch form fields:', error.message);
    }
    
    // Return combined data
    res.json({
      success: true,
      course: {
        instanceId: course.INSTANCEID,
        name: course.NAME || course.COURSENAME,
        code: course.COURSECODE,
        type: courseType,
        startDate: course.STARTDATE,
        endDate: course.ENDDATE,
        location: course.LOCATION,
        cost: course.COST
      },
      form: {
        templateId: templateID,
        fields: formFields,
        error: formError
      }
    });
    
  } catch (error) {
    console.error('Error fetching enrollment form:', error);
    res.status(500).json({ 
      error: 'Failed to fetch enrollment form',
      message: error.message 
    });
  }
});

/**
 * Get WordPress plugin form configuration
 * GET /api/axcelerate/form-config/:configId/:step
 * 
 * Serves form configurations exported from WordPress aXcelerate plugin
 */
router.get('/form-config/:configId/:step?', async (req, res) => {
  try {
    const { configId, step } = req.params;
    
    console.log(`Fetching form config ${configId}, step: ${step || 'all'}`);
    
    // Import the config file
    const fs = await import('fs/promises');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    // Build config file path
    const configFileName = step 
      ? `form-config-${configId}-${step}.json`
      : `form-config-${configId}.json`;
    
    const configPath = path.join(__dirname, '..', '..', 'configs', configFileName);
    
    // Read config file
    const configData = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configData);
    
    console.log(`✅ Loaded form config: ${configFileName}`);
    
    res.json({
      success: true,
      config
    });
    
  } catch (error) {
    console.error('Error loading form config:', error);
    
    // Return empty config if file not found
    if (error.code === 'ENOENT') {
      return res.status(404).json({
        success: false,
        error: 'Config not found',
        message: `Form configuration ${req.params.configId}/${req.params.step || 'default'} not found`
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to load form config',
      message: error.message
    });
  }
});

/**
 * Get course instance details
 * GET /api/axcelerate/instance/:instanceId
 * 
 * Fetches course instance information from aXcelerate for enrollment summary
 */
router.get('/instance/:instanceId', async (req, res) => {
  try {
    const { instanceId } = req.params;
    
    console.log('📚 Fetching course instance details:', instanceId);
    console.log('   API URL:', process.env.AXCELERATE_API_URL);
    console.log('   Full URL:', `${process.env.AXCELERATE_API_URL}/course/instance/${instanceId}`);
    
    // Fetch instance details from aXcelerate
    const response = await fetch(
      `${process.env.AXCELERATE_API_URL}/course/instance/${instanceId}`,
      {
        headers: {
          'APIToken': process.env.AXCELERATE_API_TOKEN,
          'WSToken': process.env.AXCELERATE_WS_TOKEN
        }
      }
    );
    
    console.log('📥 aXcelerate response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ aXcelerate error:', errorText);
      throw new Error(`aXcelerate API returned ${response.status}: ${errorText}`);
    }
    
    const instance = await response.json();
    console.log('✅ Course instance fetched:', instance);
    
    // Format the response
    const formattedData = {
      courseName: instance.COURSENAME || instance.courseName || instance.name || 'Course',
      startDate: instance.STARTDATE || instance.startDate || instance.start || '',
      endDate: instance.ENDDATE || instance.endDate || instance.end || '',
      location: instance.LOCATION || instance.location || instance.venue || instance.VENUENAME || '',
      fee: instance.FEE || instance.fee || instance.price || instance.COURSEFEE || '',
      status: instance.STATUS || instance.status || '',
      courseCode: instance.COURSECODE || instance.courseCode || ''
    };
    
    console.log('📤 Sending formatted data:', formattedData);
    res.json(formattedData);
    
  } catch (error) {
    console.error('❌ Failed to fetch course instance:', error);
    console.error('   Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      error: 'Failed to load course instance',
      message: error.message
    });
  }
});

/**
 * Get portfolio documents for a contact
 * GET /api/axcelerate/portfolio/:contactId
 */
router.get('/portfolio/:contactId', async (req, res) => {
  try {
    const { contactId } = req.params;
    const { checklistId } = req.query;
    
    if (!contactId) {
      return res.status(400).json({ 
        error: 'Missing required parameter: contactId' 
      });
    }
    
    console.log('📄 Fetching portfolio documents for contact:', contactId);
    if (checklistId) {
      console.log('   Filtering by checklist ID:', checklistId);
    }
    
    // Fetch portfolio documents from Axcelerate
    let url = `${process.env.AXCELERATE_API_URL}/contact/portfolio/?contactID=${contactId}`;
    if (checklistId) {
      url += `&portfolioChecklistID=${checklistId}`;
    }
    
    console.log('   Request URL:', url);
    
    const response = await fetch(url, {
      headers: {
        'APIToken': process.env.AXCELERATE_API_TOKEN,
        'WSToken': process.env.AXCELERATE_WS_TOKEN
      }
    });
    
    if (!response.ok) {
      console.error('❌ Failed to fetch portfolio:', response.status);
      const errorText = await response.text();
      console.error('   Response:', errorText);
      return res.status(response.status).json({
        error: 'Failed to fetch portfolio documents from Axcelerate'
      });
    }
    
    const portfolioData = await response.json();
    console.log(`✅ Retrieved ${Array.isArray(portfolioData) ? portfolioData.length : 0} portfolio item(s)`);
    
    // Log each item for debugging
    if (Array.isArray(portfolioData)) {
      portfolioData.forEach((item, index) => {
        console.log(`   Item ${index + 1}:`, {
          PORTFOLIOTYPENAME: item.PORTFOLIOTYPENAME,
          FILENAME: item.FILENAME,
          PORTFOLIOID: item.PORTFOLIOID
        });
      });
    }
    
    res.json(portfolioData);
    
  } catch (error) {
    console.error('❌ Error fetching portfolio documents:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

export default router;