// routes/axcelerate.js
// Routes for Axcelerate API proxy

const express = require('express');
const router = express.Router();

// Helper function to fetch from Axcelerate API
async function fetchFromAxcelerate(endpoint) {
  // Use dynamic import for node-fetch if using ES modules, or require if CommonJS
  let fetch;
  try {
    // For Node 18+, fetch is built-in
    fetch = global.fetch || (await import('node-fetch')).default;
  } catch (e) {
    fetch = require('node-fetch');
  }
  
  const url = `${process.env.AXCELERATE_API_URL}${endpoint}`;
  
  console.log(`Fetching from Axcelerate: ${url}`);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'apiKey': process.env.AXCELERATE_API_KEY,
      'wsToken': process.env.AXCELERATE_WS_TOKEN,
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
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
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
      hasApiKey: !!process.env.AXCELERATE_API_KEY,
      hasWsToken: !!process.env.AXCELERATE_WS_TOKEN,
      apiUrl: process.env.AXCELERATE_API_URL || 'NOT_SET'
    }
  });
});

// GET /api/axcelerate/courses/qualifications
// Fetches all qualification courses (course_type=p)
router.get('/courses/qualifications', async (req, res) => {
  try {
    console.log('Fetching qualifications...');
    const data = await fetchFromAxcelerate('/course/instance?course_type=p');
    console.log(`Successfully fetched ${data.length || 0} qualifications`);
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
// Fetches all workshop courses (course_type=w)
router.get('/courses/workshops', async (req, res) => {
  try {
    console.log('Fetching workshops...');
    const data = await fetchFromAxcelerate('/course/instance?course_type=w');
    console.log(`Successfully fetched ${data.length || 0} workshops`);
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
// Fetches details for a specific course instance
router.get('/courses/:id', async (req, res) => {
  try {
    const courseId = req.params.id;
    console.log(`Fetching course details for ID: ${courseId}`);
    const data = await fetchFromAxcelerate(`/course/instance/${courseId}`);
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
// Fetches all courses (both qualifications and workshops)
router.get('/courses', async (req, res) => {
  try {
    console.log('Fetching all courses...');
    
    // Fetch both types in parallel
    const [qualifications, workshops] = await Promise.all([
      fetchFromAxcelerate('/course/instance?course_type=p').catch(err => {
        console.error('Error fetching qualifications:', err);
        return [];
      }),
      fetchFromAxcelerate('/course/instance?course_type=w').catch(err => {
        console.error('Error fetching workshops:', err);
        return [];
      })
    ]);
    
    res.json({
      qualifications,
      workshops,
      total: qualifications.length + workshops.length
    });
  } catch (error) {
    console.error('Error fetching all courses:', error);
    res.status(500).json({ 
      error: 'Failed to fetch courses',
      message: error.message 
    });
  }
});

module.exports = router;