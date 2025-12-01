import { query, getClient } from '../db/index.js';

/**
 * Database operations for sync logs
 */
export const SyncLogRepository = {
  /**
   * Create a new sync log entry
   */
  async create(logData) {
    const {
      shopifyOrderId,
      shopifyOrderNumber,
      shopifyLineItemId,
      customerEmail,
      customerName,
      productTitle,
      axcelerateContactId,
      axcelerateEnrolmentId,
      axcelerateInstanceId,
      status,
      errorMessage = null,
      metadata = {}
    } = logData;

    const result = await query(
      `INSERT INTO sync_logs (
        shopify_order_id, shopify_order_number, shopify_line_item_id,
        customer_email, customer_name, product_title,
        axcelerate_contact_id, axcelerate_enrolment_id, axcelerate_instance_id,
        status, error_message, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        shopifyOrderId, shopifyOrderNumber, shopifyLineItemId,
        customerEmail, customerName, productTitle,
        axcelerateContactId, axcelerateEnrolmentId, axcelerateInstanceId,
        status, errorMessage, JSON.stringify(metadata)
      ]
    );

    return result.rows[0];
  },

  /**
   * Update sync log entry
   */
  async update(id, updates) {
    const {
      axcelerateContactId,
      axcelerateEnrolmentId,
      status,
      errorMessage,
      retryCount
    } = updates;

    const result = await query(
      `UPDATE sync_logs 
       SET axcelerate_contact_id = COALESCE($2, axcelerate_contact_id),
           axcelerate_enrolment_id = COALESCE($3, axcelerate_enrolment_id),
           status = COALESCE($4, status),
           error_message = COALESCE($5, error_message),
           retry_count = COALESCE($6, retry_count),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id, axcelerateContactId, axcelerateEnrolmentId, status, errorMessage, retryCount]
    );

    return result.rows[0];
  },

  /**
   * Check if order has been processed
   */
  async isOrderProcessed(shopifyOrderId, shopifyLineItemId = null) {
    const query_text = shopifyLineItemId
      ? `SELECT id FROM sync_logs 
         WHERE shopify_order_id = $1 AND shopify_line_item_id = $2 
         LIMIT 1`
      : `SELECT id FROM sync_logs 
         WHERE shopify_order_id = $1 
         LIMIT 1`;

    const params = shopifyLineItemId 
      ? [shopifyOrderId, shopifyLineItemId]
      : [shopifyOrderId];

    const result = await query(query_text, params);
    return result.rows.length > 0;
  },

  /**
   * Get recent logs with pagination
   */
  async getRecent(limit = 50, offset = 0, statusFilter = null) {
    const query_text = statusFilter
      ? `SELECT * FROM sync_logs 
         WHERE status = $3
         ORDER BY created_at DESC 
         LIMIT $1 OFFSET $2`
      : `SELECT * FROM sync_logs 
         ORDER BY created_at DESC 
         LIMIT $1 OFFSET $2`;

    const params = statusFilter 
      ? [limit, offset, statusFilter]
      : [limit, offset];

    const result = await query(query_text, params);
    return result.rows;
  },

  /**
   * Get statistics
   */
  async getStats() {
    const result = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as success,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'partial' THEN 1 END) as partial
      FROM sync_logs
    `);

    return result.rows[0];
  },

  /**
   * Get logs by order ID
   */
  async getByOrderId(shopifyOrderId) {
    const result = await query(
      `SELECT * FROM sync_logs 
       WHERE shopify_order_id = $1 
       ORDER BY created_at DESC`,
      [shopifyOrderId]
    );

    return result.rows;
  }
};

/**
 * Database operations for product mappings
 */
export const ProductMappingRepository = {
  /**
   * Create product mapping
   */
  async create(mappingData) {
    const {
      shopifyProductId,
      shopifyVariantId,
      productTitle,
      bookingMetadataKey,
      axcelerateInstanceId,
      axcelerateType = 'p',
      notes
    } = mappingData;

    const result = await query(
      `INSERT INTO product_mappings (
        shopify_product_id, shopify_variant_id, product_title,
        booking_metadata_key, axcelerate_instance_id, axcelerate_type, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        shopifyProductId, shopifyVariantId, productTitle,
        bookingMetadataKey, axcelerateInstanceId, axcelerateType, notes
      ]
    );

    return result.rows[0];
  },

  /**
   * Get mapping by Shopify product ID
   */
  async getByProductId(shopifyProductId) {
    const result = await query(
      `SELECT * FROM product_mappings 
       WHERE shopify_product_id = $1 AND is_active = true
       LIMIT 1`,
      [shopifyProductId]
    );

    return result.rows[0] || null;
  },

  /**
   * Get all active mappings
   */
  async getAllActive() {
    const result = await query(
      `SELECT * FROM product_mappings 
       WHERE is_active = true 
       ORDER BY created_at DESC`
    );

    return result.rows;
  },

  /**
   * Update mapping
   */
  async update(id, updates) {
    const {
      axcelerateInstanceId,
      bookingMetadataKey,
      isActive,
      notes
    } = updates;

    const result = await query(
      `UPDATE product_mappings 
       SET axcelerate_instance_id = COALESCE($2, axcelerate_instance_id),
           booking_metadata_key = COALESCE($3, booking_metadata_key),
           is_active = COALESCE($4, is_active),
           notes = COALESCE($5, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id, axcelerateInstanceId, bookingMetadataKey, isActive, notes]
    );

    return result.rows[0];
  },

  /**
   * Delete mapping
   */
  async delete(id) {
    await query(`DELETE FROM product_mappings WHERE id = $1`, [id]);
  }
};

