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
    // Correct endpoint: /auth/user/login.cfm with return_to parameter
    const axLoginUrl = new URL(`https://${process.env.AXCELERATE_WS_URL}/auth/user/login.cfm`);
    
    // Build callback URL with enrollment context as fallback (in case state is not preserved)
    const callbackUrl = new URL(`${req.protocol}://${req.get('host')}/api/auth/axcelerate/callback`);
    callbackUrl.searchParams.set('state', stateToken);
    callbackUrl.searchParams.set('instanceId', instanceId);
    if (courseId) callbackUrl.searchParams.set('courseId', courseId);
    if (courseType) callbackUrl.searchParams.set('courseType', courseType);
    if (redirectUrl) callbackUrl.searchParams.set('redirectUrl', redirectUrl);
    
    // Set return_to parameter for aXcelerate
    axLoginUrl.searchParams.set('return_to', callbackUrl.toString());
    
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
    // Log all query parameters to see what aXcelerate actually sends
    console.log('aXcelerate callback received with params:', req.query);
    console.log('Full URL:', req.url);
    
    const { code, state, error, token, contactid, access_code } = req.query;
    
    // Check for OAuth error
    if (error) {
      console.error('aXcelerate login error:', error);
      return res.redirect(`/?auth_error=${encodeURIComponent(error)}`);
    }
    
    // Check if aXcelerate sent contactid directly (some implementations do this)
    if (contactid) {
      console.log('Direct contactID received:', contactid);
      // Create auth token and redirect
      const authToken = generateStateToken();
      storeSession(authToken, {
        contactId: contactid,
        // Get enrollment context from query params if available
        instanceId: req.query.instanceId || req.query.instance_id,
        courseType: req.query.courseType || req.query.course_type || 'w',
        redirectUrl: req.query.redirectUrl || req.headers.referer || '/'
      });
      
      const redirectUrl = new URL(req.query.redirectUrl || req.headers.referer || '/', `${req.protocol}://${req.get('host')}`);
      redirectUrl.searchParams.set('auth_token', authToken);
      redirectUrl.searchParams.set('contact_id', contactid);
      return res.redirect(redirectUrl.toString());
    }
    
    // Try to get session from state if available
    let session = null;
    if (state) {
      session = getSession(state);
    }
    
    // If no state or session, try to get enrollment context from URL params
    if (!session) {
      console.log('No session found from state, using URL params or defaults');
      session = {
        instanceId: req.query.instanceId || req.query.instance_id,
        courseType: req.query.courseType || req.query.course_type || 'w',
        redirectUrl: req.query.redirectUrl || req.headers.referer || '/'
      };
    }
    
    // Validate access code or token
    if (!code && !token && !access_code) {
      console.error('Missing authorization code/token. Received params:', Object.keys(req.query));
      return res.status(400).send('Missing authorization code or token. Check Render logs for details.');
    }
    
    // Exchange access_code for contact ID using aXcelerate's login API
    const authCode = access_code || code || token;
    console.log('Exchanging access code for contact ID:', authCode);
    
    // aXcelerate expects "accessCode" (camelCase) not "code"
    const loginResponse = await fetch(
      `${process.env.AXCELERATE_API_URL}/user/login`,
      {
        method: 'POST',
        headers: {
          'APIToken': process.env.AXCELERATE_API_TOKEN,
          'WSToken': process.env.AXCELERATE_WS_TOKEN,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `accessCode=${encodeURIComponent(authCode)}`
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
// Google OAuth Integration
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
  // Force HTTPS for redirect_uri (Render always uses HTTPS)
  googleAuthUrl.searchParams.set('redirect_uri', `https://${req.get('host')}/api/auth/google/callback`);
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
        // Force HTTPS for redirect_uri (Render always uses HTTPS)
        redirect_uri: `https://${req.get('host')}/api/auth/google/callback`,
        grant_type: 'authorization_code'
      })
    });
    
    const tokens = await tokenResponse.json();
    
    if (!tokenResponse.ok) {
      console.error('Google token exchange failed:', tokens);
      return res.status(400).send('Failed to exchange authorization code');
    }
    
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
    redirectUrl.searchParams.set('contact_id', contactId);
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

export default router;

