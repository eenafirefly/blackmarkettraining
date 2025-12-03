// src/routes/axcelerate.js
// Routes for Axcelerate API proxy

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// CORS middleware for widget static files
router.use('/widget', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Serve widget static files
const widgetPath = path.join(__dirname, '../../ax_plugin/enrollerWidget');

router.get('/widget/*', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.removeHeader('Cross-Origin-Resource-Policy');
  res.removeHeader('Cross-Origin-Embedder-Policy');
  
  const filePath = path.join(widgetPath, req.params[0]);
  
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes = {
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.gif': 'image/gif',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.html': 'text/html; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8'
  };
  
  const contentType = contentTypes[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'public, max-age=3600');
  
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error sending widget file:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error serving file' });
      }
    }
  });
});

router.options('/widget/*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(200);
});

// Helper function to search course instances (POST method)
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

// CORS middleware - Allow requests from your Shopify store
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://blackmarket-training.myshopify.com');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
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

// GET /api/axcelerate/courses/:id - FIXED: removed duplicate route
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

// Widget AJAX proxy - handles WordPress-style widget API calls
router.post('/widget-ajax', async (req, res) => {
  try {
    const { action, endpoint, method, ...params } = req.body;
    
    console.log('Widget AJAX POST request:', { action, endpoint, method, params });
    
    // Handle WordPress-style callResourceAX action
    if (action === 'callResourceAX') {
      const apiUrl = `${process.env.AXCELERATE_API_URL}${endpoint}`;
      
      // Handle different HTTP methods
      if (method === 'GET') {
        // Filter out non-API params
        const cleanParams = Object.keys(params)
          .filter(key => !['action', 'endpoint', 'method', 'ax_security', 'ax_session'].includes(key))
          .reduce((obj, key) => {
            obj[key] = params[key];
            return obj;
          }, {});
        
        const searchParams = new URLSearchParams(cleanParams);
        const fullUrl = `${apiUrl}?${searchParams}`;
        
        console.log('→ Proxying GET to:', fullUrl);
        
        const response = await fetch(fullUrl, {
          method: 'GET',
          headers: {
            'APIToken': process.env.AXCELERATE_API_TOKEN,
            'WSToken': process.env.AXCELERATE_WS_TOKEN
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Axcelerate API error:', response.status, errorText);
          return res.status(response.status).json({ 
            error: true,
            message: errorText,
            statusCode: response.status
          });
        }
        
        const data = await response.json();
        console.log('✓ API response received');
        return res.json(data);
        
      } else if (method === 'POST' || method === 'PUT') {
        // Convert params to form-encoded format
        const formDataString = Object.keys(params)
          .filter(key => !['action', 'endpoint', 'method', 'ax_security', 'ax_session'].includes(key))
          .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(String(params[key]))}`)
          .join('&');
        
        console.log('→ Proxying', method, 'to:', apiUrl);
        console.log('Body:', formDataString);
        
        const response = await fetch(apiUrl, {
          method: method,
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
          console.error('Axcelerate API error:', response.status, errorText);
          return res.status(response.status).json({ 
            error: true,
            message: errorText,
            statusCode: response.status
          });
        }
        
        const data = await response.json();
        console.log('✓ API response received');
        return res.json(data);
      }
    }
    
    // Fallback for other actions
    console.log('Unknown action, returning default response');
    return res.json({ 
      error: false,
      data: {},
      message: 'Widget AJAX handler'
    });
    
  } catch (error) {
    console.error('Widget AJAX POST error:', error);
    res.status(500).json({ 
      error: true,
      message: error.message,
      code: 'WIDGET_AJAX_ERROR'
    });
  }
});

// GET endpoint for widget AJAX (some widget calls use GET)
router.get('/widget-ajax', async (req, res) => {
  try {
    const { action, endpoint, ...params } = req.query;
    
    console.log('Widget AJAX GET request:', { action, endpoint, params });
    
    if (!endpoint) {
      return res.json({ 
        error: false,
        data: {},
        message: 'Widget AJAX handler - no endpoint specified'
      });
    }
    
    const apiUrl = `${process.env.AXCELERATE_API_URL}${endpoint}`;
    const searchParams = new URLSearchParams(params);
    const fullUrl = `${apiUrl}?${searchParams}`;
    
    console.log('→ Proxying GET to:', fullUrl);
    
    const apiResponse = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'APIToken': process.env.AXCELERATE_API_TOKEN,
        'WSToken': process.env.AXCELERATE_WS_TOKEN
      }
    });
    
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('Axcelerate API error:', apiResponse.status, errorText);
      return res.status(apiResponse.status).json({ 
        error: true,
        message: errorText
      });
    }
    
    const apiData = await apiResponse.json();
    console.log('✓ API response received');
    res.json(apiData);
  } catch (error) {
    console.error('Widget AJAX GET error:', error);
    res.status(500).json({ 
      error: true,
      message: error.message 
    });
  }
});

export default router;