require('dotenv').config();
const { Pool } = require('pg');

// PostgreSQL connection configuration
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function addWebhookLogsTable() {
  const client = await pool.connect();

  try {
    console.log('Starting webhook_logs table migration...');

    // Create webhook_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS webhook_logs (
        id SERIAL PRIMARY KEY,
        webhook_type VARCHAR(50) NOT NULL,
        order_id VARCHAR(255) NOT NULL,
        payment_id VARCHAR(255),
        payload JSONB NOT NULL,
        signature TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'received',
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ webhook_logs table created');

    // Create indexes for better query performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_logs_order_id ON webhook_logs(order_id);
    `);
    console.log('✓ Index on order_id created');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_logs_payment_id ON webhook_logs(payment_id);
    `);
    console.log('✓ Index on payment_id created');

    console.log('✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
addWebhookLogsTable();
