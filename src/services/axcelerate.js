import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * aXcelerate API Client
 * 
 * Handles all interactions with the aXcelerate Student Management System API
 * Documentation: https://app.axcelerate.com/apidocs/Export/html
 */
class AxcelerateClient {
  constructor() {
    this.baseURL = process.env.AXCELERATE_API_URL;
    this.apiToken = process.env.AXCELERATE_API_TOKEN;
    this.wsToken = process.env.AXCELERATE_WS_TOKEN;

    if (!this.baseURL || !this.apiToken || !this.wsToken) {
      throw new Error('aXcelerate API credentials not configured');
    }

    // Create axios instance with default headers
    // Note: aXcelerate API uses form fields for POST, not JSON
    // Headers can be case-insensitive, but matching PHP plugin format
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000
      // Don't set headers here - set them per request to avoid conflicts
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      error => {
        if (error.response) {
          console.error('aXcelerate API Error:', {
            status: error.response.status,
            data: error.response.data
          });
        }
        throw error;
      }
    );
  }

  /**
   * Search for a contact by email
   * @param {string} email - Contact email address
   * @returns {Promise<Object|null>} Contact data or null if not found
   */
  async findContactByEmail(email) {
    try {
      // Use /contacts/search/ (plural) as per aXcelerate API
      const response = await this.client.get('/contacts/search/', {
        params: { emailAddress: email },
        headers: {
          'APIToken': this.apiToken,
          'WSToken': this.wsToken
        }
      });

      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        return response.data[0]; // Return first match
      }
      
      return null;
    } catch (error) {
      if (error.response?.status === 404 || error.response?.status === 204) {
        return null; // Contact not found
      }
      throw error;
    }
  }

  /**
   * Create a new contact in aXcelerate
   * @param {Object} contactData - Contact information
   * @returns {Promise<Object>} Created contact with contactID
   */
  async createContact(contactData) {
    const {
      givenName,
      surname,
      emailAddress,
      mobilePhone,
      streetAddress,
      suburb,
      state,
      postcode,
      country
    } = contactData;

    // Surname is required by aXcelerate
    if (!surname) {
      throw new Error('Surname is required to create a contact');
    }

    if (!emailAddress) {
      throw new Error('Email address is required to create a contact');
    }

    const payload = {
      givenName: givenName || '',
      surname,
      emailAddress,
      ...(mobilePhone && { mobilePhone }),
      ...(streetAddress && { streetAddress }),
      ...(suburb && { suburb }),
      ...(state && { state }),
      ...(postcode && { postcode }),
      ...(country && { country })
    };

    try {
      // aXcelerate API expects form-encoded data (form fields), not JSON
      // Filter out empty values and convert to form-encoded string
      const filteredPayload = {};
      Object.keys(payload).forEach(key => {
        if (payload[key] !== null && payload[key] !== undefined && payload[key] !== '') {
          filteredPayload[key] = payload[key];
        }
      });

      // Convert to URL-encoded string manually
      const formDataString = Object.keys(filteredPayload)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(String(filteredPayload[key]))}`)
        .join('&');

      console.log('Creating contact with payload:', Object.keys(filteredPayload));
      console.log('Full URL:', this.baseURL + '/contact/');
      console.log('Form data:', formDataString);
      
      // Use axios directly instead of client instance to ensure headers are sent correctly
      const response = await axios.post(`${this.baseURL}/contact/`, formDataString, {
        headers: {
          'APIToken': this.apiToken,
          'WSToken': this.wsToken,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(formDataString)
        },
        timeout: 30000
      });
      
      console.log('Contact created successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to create contact:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers
      });
      throw new Error(`aXcelerate contact creation failed: ${error.response?.data?.details || error.message}`);
    }
  }

  /**
   * Get or create a contact
   * Searches by email first, creates if not found
   * @param {Object} contactData - Contact information
   * @returns {Promise<Object>} Contact with contactID
   */
  async getOrCreateContact(contactData) {
    // Try to find existing contact
    const existingContact = await this.findContactByEmail(contactData.emailAddress);
    
    if (existingContact) {
      console.log(`Found existing contact: ${existingContact.CONTACTID}`);
      return existingContact;
    }

    // Create new contact
    console.log(`Creating new contact for: ${contactData.emailAddress}`);
    const newContact = await this.createContact(contactData);
    return newContact;
  }

  /**
   * Get class instance details
   * @param {string} instanceID - Class instance ID (PDataID for workshops, ClassID for programs)
   * @returns {Promise<Object>} Class instance data
   */
  async getClassInstance(instanceID) {
    try {
      // Use v2 API endpoint as per PHP plugin implementation
      const response = await axios.get(`${this.baseURL}/v2/course/instances`, {
        params: { 
          instanceID: instanceID,
          type: 'p', // type=p for classes/programs
          fields: 'all'
        },
        headers: {
          'APIToken': this.apiToken,
          'WSToken': this.wsToken
        },
        timeout: 30000
      });
      
      // v2 API returns object with INSTANCEID property
      if (response.data && response.data.INSTANCEID) {
        return response.data;
      }
      
      throw new Error(`Class instance ${instanceID} not found`);
    } catch (error) {
      console.error(`Failed to get class instance ${instanceID}:`, error.response?.data);
      throw new Error(`Class instance ${instanceID} not found or not accessible`);
    }
  }

  /**
   * Enrol a contact into a class
   * @param {Object} enrolmentData - Enrolment information
   * @returns {Promise<Object>} Enrolment result with LEARNERID
   */
  async createEnrolment(enrolmentData) {
    const {
      contactID,
      instanceID,
      type = 'p', // Default to program/class
      tentative = false, // false = confirmed enrolment
      invoiceID = null
    } = enrolmentData;

    if (!contactID || !instanceID) {
      throw new Error('contactID and instanceID are required for enrolment');
    }

    const payload = {
      contactID,
      instanceID,
      type,
      tentative: tentative ? 'true' : 'false'
    };

    // Add invoiceID if payment was processed
    if (invoiceID) {
      payload.invoiceID = invoiceID;
    }

    try {
      // Convert payload to form-encoded format
      const formDataString = Object.keys(payload)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(String(payload[key]))}`)
        .join('&');

      const response = await this.client.post('/course/enrol', formDataString, {
        headers: {
          'APIToken': this.apiToken,
          'WSToken': this.wsToken,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(formDataString)
        }
      });
      console.log(`Enrolment created: LEARNERID ${response.data.LEARNERID}`);
      return response.data;
    } catch (error) {
      console.error('Failed to create enrolment:', error.response?.data);
      
      // Extract error details
      let errorMessage = 'Enrolment failed';
      if (error.response?.data?.details) {
        errorMessage = error.response.data.details;
      } else if (error.response?.data?.messages) {
        errorMessage = error.response.data.messages;
      }
      
      throw new Error(`aXcelerate enrolment failed: ${errorMessage}`);
    }
  }

  /**
   * Create multiple enrolments (for group bookings)
   * @param {string} contactID - Contact ID
   * @param {string} instanceID - Instance ID
   * @param {number} quantity - Number of enrolments to create
   * @returns {Promise<Array>} Array of enrolment results
   */
  async createMultipleEnrolments(contactID, instanceID, quantity) {
    const enrolments = [];
    const errors = [];

    for (let i = 0; i < quantity; i++) {
      try {
        const enrolment = await this.createEnrolment({
          contactID,
          instanceID,
          type: 'p',
          tentative: false
        });
        enrolments.push(enrolment);
        console.log(`Created enrolment ${i + 1}/${quantity}`);
      } catch (error) {
        console.error(`Failed to create enrolment ${i + 1}/${quantity}:`, error.message);
        errors.push({
          index: i + 1,
          error: error.message
        });
      }
    }

    return {
      success: enrolments,
      failed: errors,
      total: quantity,
      successCount: enrolments.length
    };
  }

  /**
   * Search for class instances
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Array>} Array of class instances
   */
  async searchClassInstances(searchParams) {
    try {
      const response = await this.client.get('/course/instances', {
        params: {
          type: 'p',
          ...searchParams
        },
        headers: {
          'APIToken': this.apiToken,
          'WSToken': this.wsToken
        }
      });
      return response.data || [];
    } catch (error) {
      console.error('Failed to search class instances:', error.response?.data);
      return [];
    }
  }
}

// Export singleton instance
const axcelerateClient = new AxcelerateClient();
export default axcelerateClient;

