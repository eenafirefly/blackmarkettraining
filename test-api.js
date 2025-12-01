import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const API_URL = process.env.AXCELERATE_API_URL;
const API_TOKEN = process.env.AXCELERATE_API_TOKEN;
const WS_TOKEN = process.env.AXCELERATE_WS_TOKEN;

console.log('🔍 Testing aXcelerate API...\n');
console.log('API URL:', API_URL);
console.log('API Token:', API_TOKEN ? `${API_TOKEN.substring(0, 10)}...` : 'NOT SET');
console.log('WS Token:', WS_TOKEN ? `${WS_TOKEN.substring(0, 10)}...` : 'NOT SET');
console.log('');

if (!API_URL || !API_TOKEN || !WS_TOKEN) {
  console.error('❌ Missing API credentials in .env file');
  process.exit(1);
}

// Test 1: GET request - Search for contact (safe, read-only)
console.log('📋 Test 1: GET /contact/search (read-only test)');
try {
  const searchResponse = await axios.get(`${API_URL}/contact/search`, {
    params: { emailAddress: 'sheena@noda.com.au' },
    headers: {
      'APIToken': API_TOKEN,
      'WSToken': WS_TOKEN
    }
  });
  console.log('✅ GET request successful!');
  console.log('Response:', JSON.stringify(searchResponse.data, null, 2));
} catch (error) {
  console.error('❌ GET request failed:');
  console.error('Status:', error.response?.status);
  console.error('Status Text:', error.response?.statusText);
  console.error('Data:', error.response?.data);
}

console.log('\n---\n');

// Test 2: POST request - Create contact
console.log('📝 Test 2: POST /contact/ (create contact test)');
const testContact = {
  givenName: 'Test',
  surname: 'API',
  emailAddress: `test-api-${Date.now()}@example.com`
};

const formData = Object.keys(testContact)
  .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(testContact[key])}`)
  .join('&');

console.log('Creating contact:', testContact.emailAddress);
console.log('Form data:', formData);
console.log('Full URL:', `${API_URL}/contact/`);

try {
  const createResponse = await axios.post(`${API_URL}/contact/`, formData, {
    headers: {
      'APIToken': API_TOKEN,
      'WSToken': WS_TOKEN,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(formData)
    }
  });
  console.log('✅ POST request successful!');
  console.log('Response:', JSON.stringify(createResponse.data, null, 2));
  if (createResponse.data.CONTACTID) {
    console.log(`\n✅ Contact created with ID: ${createResponse.data.CONTACTID}`);
  }
} catch (error) {
  console.error('❌ POST request failed:');
  console.error('Status:', error.response?.status);
  console.error('Status Text:', error.response?.statusText);
  console.error('Data:', JSON.stringify(error.response?.data, null, 2));
  console.error('Request URL:', error.config?.url);
  console.error('Request Method:', error.config?.method);
  console.error('Request Headers:', JSON.stringify(error.config?.headers, null, 2));
}

