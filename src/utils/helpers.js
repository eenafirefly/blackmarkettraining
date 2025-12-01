import crypto from 'crypto';

/**
 * Verify Shopify webhook HMAC signature
 * @param {Buffer} rawBody - Raw request body
 * @param {string} hmacHeader - HMAC header from Shopify
 * @returns {boolean} True if signature is valid
 */
export function verifyShopifyWebhook(rawBody, hmacHeader) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  
  if (!secret) {
    console.error('SHOPIFY_WEBHOOK_SECRET not configured');
    return false;
  }

  const hash = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('base64');

  return hash === hmacHeader;
}

/**
 * Extract booking metadata from line item
 * Looks for Easy Appointment Booking metadata
 * @param {Object} lineItem - Shopify line item
 * @returns {Object} Booking metadata
 */
export function extractBookingMetadata(lineItem) {
  const metadata = {
    hasBooking: false,
    date: null,
    time: null,
    instanceReference: null,
    attendeeName: null,
    attendeeGivenName: null,
    attendeeSurname: null,
    attendeeEmail: null,
    attendeePhone: null,
    rawData: {}
  };

  // Check for properties that might contain booking data
  if (lineItem.properties && Array.isArray(lineItem.properties)) {
    lineItem.properties.forEach(prop => {
      metadata.rawData[prop.name] = prop.value;

      // Look for common booking property names
      const name = prop.name.toLowerCase();
      
      if (name.includes('date') && !name.includes('booking')) {
        metadata.date = prop.value;
        metadata.hasBooking = true;
      }
      
      if (name.includes('time')) {
        metadata.time = prop.value;
        metadata.hasBooking = true;
      }
      
      if (name.includes('instance') || name.includes('class') || name.includes('booking id')) {
        metadata.instanceReference = prop.value;
        metadata.hasBooking = true;
      }

      // Extract attendee information (from Easy Appointment Booking app)
      if (name.includes('attendee name') || name.includes('name') || name.includes('customer name')) {
        metadata.attendeeName = prop.value;
        metadata.hasBooking = true;

        // Try to split into given name and surname
        if (prop.value) {
          const nameParts = prop.value.trim().split(' ');
          if (nameParts.length > 0) {
            metadata.attendeeGivenName = nameParts[0];
            metadata.attendeeSurname = nameParts.slice(1).join(' ') || nameParts[0]; // Use first name as surname if only one name
          }
        }
      }

      // Check for separate first/last name fields
      if (name.includes('first name') || name.includes('given name')) {
        metadata.attendeeGivenName = prop.value;
        metadata.hasBooking = true;
      }

      if (name.includes('last name') || name.includes('surname') || name.includes('family name')) {
        metadata.attendeeSurname = prop.value;
        metadata.hasBooking = true;
      }

      // Extract attendee contact details (if available)
      if (name.includes('email') && !name.includes('sender')) {
        metadata.attendeeEmail = prop.value;
      }

      if (name.includes('phone') || name.includes('mobile')) {
        metadata.attendeePhone = prop.value;
      }
    });

    // Build full attendee name if we have separate parts
    if (metadata.attendeeGivenName && metadata.attendeeSurname && !metadata.attendeeName) {
      metadata.attendeeName = `${metadata.attendeeGivenName} ${metadata.attendeeSurname}`;
    }
  }

  return metadata;
}

/**
 * Parse customer data from Shopify order
 * @param {Object} order - Shopify order object
 * @returns {Object} Formatted contact data for aXcelerate
 */
export function parseCustomerData(order) {
  const customer = order.customer || {};
  const billing = order.billing_address || {};
  const shipping = order.shipping_address || {};

  // Use billing address first, fall back to shipping
  const address = billing.address1 ? billing : shipping;

  // Split full name if no separate first/last name
  let givenName = customer.first_name || '';
  let surname = customer.last_name || '';

  if (!givenName && !surname && customer.name) {
    const nameParts = customer.name.split(' ');
    givenName = nameParts[0] || '';
    surname = nameParts.slice(1).join(' ') || givenName; // Use first name as surname if only one name
  }

  // Ensure we have at least a surname (required by aXcelerate)
  if (!surname && givenName) {
    surname = givenName;
  } else if (!surname) {
    surname = 'Unknown'; // Fallback
  }

  return {
    givenName,
    surname,
    emailAddress: customer.email || order.email,
    mobilePhone: customer.phone || billing.phone || shipping.phone || '',
    streetAddress: address.address1 || '',
    suburb: address.city || '',
    state: address.province || '',
    postcode: address.zip || '',
    country: address.country || ''
  };
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxAttempts - Maximum retry attempts
 * @param {number} delayMs - Initial delay in milliseconds
 * @returns {Promise} Result of function
 */
export async function retryWithBackoff(fn, maxAttempts = 3, delayMs = 1000) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxAttempts) {
        const delay = delayMs * Math.pow(2, attempt - 1);
        console.log(`Retry attempt ${attempt}/${maxAttempts} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Send alert notification
 * @param {string} message - Alert message
 * @param {Object} data - Additional data
 */
export async function sendAlert(message, data = {}) {
  console.error('🚨 ALERT:', message, data);

  // Could implement Slack/email notifications here
  // For now, just log to console
  
  // Example Slack webhook integration:
  // if (process.env.SLACK_WEBHOOK_URL) {
  //   await axios.post(process.env.SLACK_WEBHOOK_URL, {
  //     text: message,
  //     attachments: [{ text: JSON.stringify(data, null, 2) }]
  //   });
  // }
}

