import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
  console.log('📦 Database connection established');
});

pool.on('error', (err) => {
  console.error('Database pool error:', err);
});

/**
 * Execute a query
 */
export async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 */
export async function getClient() {
  return await pool.connect();
}

/**
 * Initialize database schema
 */
export async function initDatabase() {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    // Create sync_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sync_logs (
        id SERIAL PRIMARY KEY,
        shopify_order_id VARCHAR(255) NOT NULL,
        shopify_order_number VARCHAR(255),
        shopify_line_item_id VARCHAR(255),
        customer_email VARCHAR(255),
        customer_name VARCHAR(255),
        product_title VARCHAR(500),
        axcelerate_contact_id VARCHAR(255),
        axcelerate_enrolment_id VARCHAR(255),
        axcelerate_instance_id VARCHAR(255),
        status VARCHAR(50) NOT NULL,
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create product_mappings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS product_mappings (
        id SERIAL PRIMARY KEY,
        shopify_product_id VARCHAR(255) NOT NULL UNIQUE,
        shopify_variant_id VARCHAR(255),
        product_title VARCHAR(500),
        booking_metadata_key VARCHAR(255),
        axcelerate_instance_id VARCHAR(255) NOT NULL,
        axcelerate_type VARCHAR(10) DEFAULT 'p',
        is_active BOOLEAN DEFAULT true,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sync_logs_order_id 
      ON sync_logs(shopify_order_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sync_logs_status 
      ON sync_logs(status)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at 
      ON sync_logs(created_at DESC)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_product_mappings_product_id 
      ON product_mappings(shopify_product_id)
    `);

    await client.query('COMMIT');
    console.log('✅ Database schema initialized successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to initialize database:', error);
    throw error;
  } finally {
    client.release();
  }
}

export default pool;

