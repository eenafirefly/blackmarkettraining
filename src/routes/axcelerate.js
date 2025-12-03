// src/routes/axcelerate.js
// Routes for Axcelerate API proxy

import express from 'express';

const router = express.Router();

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
    const courseType = req.query.type || 'p'; // Default to 'p' for programs
    console.log(`Fetching course details for ID: ${courseId}, type: ${courseType}`);
    const data = await getCourseInstanceDetails(courseId, courseType);
    res.json(data);
  } catch (error) {
    console.error('Error fetching course details:', error);
    res.status(500).json({ 
      error: 'Failed to fetch course details',
      message: error.message 
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

export default router;
