require('dotenv').config();
const { Pool } = require('pg');

// PostgreSQL connection configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'sikka_exchange',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
});

async function addPayoutFields() {
  const client = await pool.connect();

  try {
    console.log('Starting Cashfree payout fields migration...');

    // Add cashfree_transfer_id column
    await client.query(`
      ALTER TABLE withdrawals
      ADD COLUMN IF NOT EXISTS cashfree_transfer_id VARCHAR(255);
    `);
    console.log('✓ cashfree_transfer_id column added');

    // Add cashfree_transfer_utr column
    await client.query(`
      ALTER TABLE withdrawals
      ADD COLUMN IF NOT EXISTS cashfree_transfer_utr VARCHAR(255);
    `);
    console.log('✓ cashfree_transfer_utr column added');

    // Add cashfree_payout_status column
    await client.query(`
      ALTER TABLE withdrawals
      ADD COLUMN IF NOT EXISTS cashfree_payout_status VARCHAR(50);
    `);
    console.log('✓ cashfree_payout_status column added');

    // Add bank_account_id column if it doesn't exist
    await client.query(`
      ALTER TABLE withdrawals
      ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES bank_accounts(id);
    `);
    console.log('✓ bank_account_id column added');

    // Check if inr_sent_at column exists
    const columnCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'withdrawals' AND column_name = 'inr_sent_at';
    `);

    if (columnCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE withdrawals
        ADD COLUMN inr_sent_at TIMESTAMP;
      `);
      console.log('✓ inr_sent_at column added');
    } else {
      console.log('✓ inr_sent_at column already exists');
    }

    // Add utr_number and failed_reason columns if they don't exist
    const utrCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'withdrawals' AND column_name = 'utr_number';
    `);

    if (utrCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE withdrawals
        ADD COLUMN utr_number VARCHAR(255);
      `);
      console.log('✓ utr_number column added');
    } else {
      console.log('✓ utr_number column already exists');
    }

    const failedReasonCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'withdrawals' AND column_name = 'failed_reason';
    `);

    if (failedReasonCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE withdrawals
        ADD COLUMN failed_reason TEXT;
      `);
      console.log('✓ failed_reason column added');
    } else {
      console.log('✓ failed_reason column already exists');
    }

    // Create index on cashfree_transfer_id for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_withdrawals_cashfree_transfer_id
      ON withdrawals(cashfree_transfer_id);
    `);
    console.log('✓ Index on cashfree_transfer_id created');

    // Create index on cashfree_payout_status
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_withdrawals_cashfree_payout_status
      ON withdrawals(cashfree_payout_status);
    `);
    console.log('✓ Index on cashfree_payout_status created');

    // Create index on bank_account_id
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_withdrawals_bank_account_id
      ON withdrawals(bank_account_id);
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
addPayoutFields();
