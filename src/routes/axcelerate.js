// src/routes/axcelerate.js
// Routes for Axcelerate API proxy

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Serve widget static files from ax_plugin/enrollerWidget
const widgetPath = path.join(__dirname, '../../ax_plugin/enrollerWidget');
router.use('/widget', express.static(widgetPath));

// Helper function to search course instances (POST method)
async function searchCourseInstances(searchParams) {
  const url = `${process.env.AXCELERATE_API_URL}/course/instance/search`;
  
  console.log(`Searching Axcelerate courses: ${url}`, searchParams);
  
  // Convert params to form-encoded format
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

// Helper function to get single instance details (GET method)
async function getCourseInstanceDetails(instanceID, type = 'p') {
  const url = `${process.env.AXCELERATE_API_URL}/v2/course/instances`;
  
  console.log(`Fetching course instance: ${url}`, { instanceID, type });
  
  const params = new URLSearchParams({
    instanceID: instanceID,
    type: type,
    fields: 'all'
  });
  
  const response = await fetch(`${url}?${params}`, {
    method: 'GET',
    headers: {
      'APIToken': process.env.AXCELERATE_API_TOKEN,
      'WSToken': process.env.AXCELERATE_WS_TOKEN,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = { message: await response.text() };
    }
    
    console.error(`Axcelerate API error: ${response.status}`, errorData);
    
    // Create a more detailed error object
    const error = new Error(errorData.MESSAGES || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    error.statusCode = response.status;
    error.apiError = errorData;
    throw error;
  }

  return response.json();
}

// CORS middleware - Allow requests from your Shopify store
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://blackmarket-training.myshopify.com');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'axcelerate-proxy',
    timestamp: new Date().toISOString(),
    environment: {
      hasApiToken: !!process.env.AXCELERATE_API_TOKEN,
      hasWsToken: !!process.env.AXCELERATE_WS_TOKEN,
      apiUrl: process.env.AXCELERATE_API_URL || 'NOT_SET'
    }
  });
});

// GET /api/axcelerate/courses/qualifications
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

// GET /api/axcelerate/courses/workshops
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

// GET /api/axcelerate/courses/:id
router.get('/courses/:id', async (req, res) => {
  try {
    const courseId = req.params.id;
    const courseType = req.query.type || 'p';
    console.log(`Fetching course details for ID: ${courseId}, type: ${courseType}`);
    const data = await getCourseInstanceDetails(courseId, courseType);
    res.json(data);
  } catch (error) {
    console.error('Error fetching course details:', error);
    
    // Pass through the status code from Axcelerate API
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ 
      error: 'Failed to fetch course details',
      message: error.message,
      details: error.apiError,
      instanceId: req.params.id,
      courseType: req.query.type || 'p'
    });
  }
});

// GET /api/axcelerate/courses
router.get('/courses', async (req, res) => {
  try {
    console.log('Fetching all courses...');
    
    const [qualifications, workshops] = await Promise.all([
      searchCourseInstances({ course_type: 'p' }).catch(err => {
        console.error('Error fetching qualifications:', err);
        return [];
      }),
      searchCourseInstances({ course_type: 'w' }).catch(err => {
        console.error('Error fetching workshops:', err);
        return [];
      })
    ]);
    
    res.json({
      qualifications: Array.isArray(qualifications) ? qualifications : [],
      workshops: Array.isArray(workshops) ? workshops : [],
      total: (Array.isArray(qualifications) ? qualifications.length : 0) + 
             (Array.isArray(workshops) ? workshops.length : 0)
    });
  } catch (error) {
    console.error('Error fetching all courses:', error);
    res.status(500).json({ 
      error: 'Failed to fetch courses',
      message: error.message 
    });
  }
});

// Widget AJAX proxy - handles widget API calls
router.post('/widget-ajax', async (req, res) => {
  try {
    const { action, ...params } = req.body;
    
    console.log('Widget AJAX request:', { action, params });
    
    // Handle different widget actions
    switch (action) {
      case 'get_course_instances':
        // Get course instances
        const instances = await searchCourseInstances(params);
        return res.json(instances);
        
      case 'get_course_details':
        // Get course details
        const details = await getCourseInstanceDetails(params.instanceID, params.type);
        return res.json(details);
        
      case 'search_contacts':
        // Search contacts - proxy to aXcelerate API
        const searchUrl = `${process.env.AXCELERATE_API_URL}/contacts/search/`;
        const searchParams = new URLSearchParams(params);
        const searchResponse = await fetch(`${searchUrl}?${searchParams}`, {
          method: 'GET',
          headers: {
            'APIToken': process.env.AXCELERATE_API_TOKEN,
            'WSToken': process.env.AXCELERATE_WS_TOKEN
          }
        });
        const searchData = await searchResponse.json();
        return res.json(searchData);
        
      case 'create_contact':
        // Create contact - proxy to aXcelerate API
        const createUrl = `${process.env.AXCELERATE_API_URL}/contact/`;
        const formData = Object.keys(params)
          .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(String(params[key]))}`)
          .join('&');
        
        const createResponse = await fetch(createUrl, {
          method: 'POST',
          headers: {
            'APIToken': process.env.AXCELERATE_API_TOKEN,
            'WSToken': process.env.AXCELERATE_WS_TOKEN,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(formData)
          },
          body: formData
        });
        const createData = await createResponse.json();
        return res.json(createData);
        
      case 'enrol':
        // Handle enrolment - you can use your existing enrolment service
        // This is a simplified version
        return res.json({ success: true, message: 'Enrolment processed' });
        
      default:
        // For other actions, proxy directly to aXcelerate API
        const apiUrl = `${process.env.AXCELERATE_API_URL}/${action}`;
        const apiResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'APIToken': process.env.AXCELERATE_API_TOKEN,
            'WSToken': process.env.AXCELERATE_WS_TOKEN,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: Object.keys(params)
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(String(params[key]))}`)
            .join('&')
        });
        const apiData = await apiResponse.json();
        return res.json(apiData);
    }
  } catch (error) {
    console.error('Widget AJAX error:', error);
    res.status(500).json({ 
      error: error.message,
      code: 'WIDGET_AJAX_ERROR'
    });
  }
});

// GET endpoint for widget AJAX (some widget calls use GET)
router.get('/widget-ajax', async (req, res) => {
  try {
    const { action, ...params } = req.query;
    
    const apiUrl = `${process.env.AXCELERATE_API_URL}/${action}`;
    const searchParams = new URLSearchParams(params);
    
    const apiResponse = await fetch(`${apiUrl}?${searchParams}`, {
      method: 'GET',
      headers: {
        'APIToken': process.env.AXCELERATE_API_TOKEN,
        'WSToken': process.env.AXCELERATE_WS_TOKEN
      }
    });
    
    const apiData = await apiResponse.json();
    res.json(apiData);
  } catch (error) {
    console.error('Widget AJAX GET error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
