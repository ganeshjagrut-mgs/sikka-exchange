require('dotenv').config();
const { Pool } = require('pg');

// PostgreSQL connection configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'sikka',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
});

async function updateWithdrawalsTable() {
  const client = await pool.connect();

  try {
    console.log('Starting withdrawals table update migration...');

    // Add bank_account_id column
    await client.query(`
      ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES bank_accounts(id);
    `);
    console.log('✓ Added bank_account_id column');

    // Add utr_number column
    await client.query(`
      ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS utr_number VARCHAR(50);
    `);
    console.log('✓ Added utr_number column');

    // Add failed_reason column
    await client.query(`
      ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS failed_reason TEXT;
    `);
    console.log('✓ Added failed_reason column');

    // Drop inr_sent_at column if it exists
    await client.query(`
      ALTER TABLE withdrawals DROP COLUMN IF EXISTS inr_sent_at;
    `);
    console.log('✓ Dropped inr_sent_at column');

    // Create index on bank_account_id for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_withdrawals_bank_account ON withdrawals(bank_account_id);
    `);
    console.log('✓ Index on bank_account_id created');

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
updateWithdrawalsTable();
