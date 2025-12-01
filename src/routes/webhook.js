import express from 'express';
import { verifyShopifyWebhook } from '../utils/helpers.js';
import enrolmentService from '../services/enrolment.js';

const router = express.Router();

/**
 * Shopify orders/paid webhook handler
 * Fires when an order is fully paid
 */
router.post('/shopify', async (req, res) => {
  try {
    console.log('\n🪝 Webhook received from Shopify');

    // Get HMAC header
    const hmacHeader = req.get('X-Shopify-Hmac-Sha256');
    
    if (!hmacHeader) {
      console.error('❌ No HMAC header found');
      return res.status(401).json({ error: 'Unauthorized - No HMAC header' });
    }

    // Verify webhook authenticity
    const isValid = verifyShopifyWebhook(req.body, hmacHeader);
    
    if (!isValid) {
      console.error('❌ Invalid HMAC signature');
      return res.status(401).json({ error: 'Unauthorized - Invalid signature' });
    }

    console.log('✅ Webhook verified');

    // Parse order data
    const order = JSON.parse(req.body.toString());
    console.log(`📋 Order: ${order.name} (${order.email})`);

    // Respond quickly to Shopify (they expect response within 5 seconds)
    res.status(200).json({ received: true });

    // Process order asynchronously
    try {
      const result = await enrolmentService.processOrder(order);
      console.log('✨ Processing result:', result);
    } catch (error) {
      console.error('❌ Error processing order:', error);
      // Don't throw - we already responded to Shopify
    }

  } catch (error) {
    console.error('❌ Webhook error:', error);
    
    // Only send error response if we haven't sent one yet
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

/**
 * Test endpoint for webhook (development only)
 * Note: This endpoint bypasses the raw body parser to allow JSON parsing
 */
router.post('/test', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    console.log('\n🧪 Test webhook received');
    
    // Parse body - handle both Buffer (from express.raw) and already-parsed JSON
    let order;
    if (Buffer.isBuffer(req.body)) {
      order = JSON.parse(req.body.toString());
    } else if (typeof req.body === 'string') {
      order = JSON.parse(req.body);
    } else {
      order = req.body;
    }
    
    console.log('Parsed order:', order.id ? `ID: ${order.id}` : 'No ID found');

    // Validate order structure
    if (!order || !order.id) {
      console.error('Invalid order data:', order);
      return res.status(400).json({
        success: false,
        error: 'Invalid order data: order.id is required',
        received: order
      });
    }

    const result = await enrolmentService.processOrder(order);
    
    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Test webhook error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router;

