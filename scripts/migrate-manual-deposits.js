require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'sikka_exchange',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
});

async function addManualDepositColumns() {
  console.log('🚀 Adding manual deposit columns to deposits table...\n');

  try {
    // Add payment_method column (default to 'cashfree' for existing records)
    console.log('Adding payment_method column...');
    await pool.query(`
      ALTER TABLE deposits
      ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'cashfree';
    `);

    // Add utr_number column for bank transfers
    console.log('Adding utr_number column...');
    await pool.query(`
      ALTER TABLE deposits
      ADD COLUMN IF NOT EXISTS utr_number VARCHAR(100);
    `);

    // Add admin_rejection_reason for manual deposit rejections
    console.log('Adding admin_rejection_reason column...');
    await pool.query(`
      ALTER TABLE deposits
      ADD COLUMN IF NOT EXISTS admin_rejection_reason TEXT;
    `);

    // Create index on payment_method for faster queries
    console.log('Creating index on payment_method...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_deposits_payment_method ON deposits(payment_method);
    `);

    // Create index on utr_number for lookup
    console.log('Creating index on utr_number...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_deposits_utr_number ON deposits(utr_number);
    `);

    console.log('\n✅ Manual deposit columns added successfully!');
    console.log('\nNew columns:');
    console.log('  - payment_method (VARCHAR(50)) - "cashfree" or "bank_transfer"');
    console.log('  - utr_number (VARCHAR(100)) - Bank transfer UTR/reference number');
    console.log('  - admin_rejection_reason (TEXT) - Reason if deposit rejected\n');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

addManualDepositColumns();
