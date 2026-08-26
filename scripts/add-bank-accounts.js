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

async function addBankAccountsTable() {
  const client = await pool.connect();

  try {
    console.log('Starting bank_accounts table migration...');

    // Create bank_accounts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS bank_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        account_holder_name VARCHAR(255) NOT NULL,
        account_number VARCHAR(50) NOT NULL,
        ifsc_code VARCHAR(11) NOT NULL,
        bank_name VARCHAR(255) NOT NULL,
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✓ bank_accounts table created');

    // Create index on user_id for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON bank_accounts(user_id);
    `);
    console.log('✓ Index on user_id created');

    // Create composite index for default account lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_default ON bank_accounts(user_id, is_default);
    `);
    console.log('✓ Index on user_id and is_default created');

    // Create unique constraint to prevent duplicate accounts
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_accounts_unique ON bank_accounts(user_id, account_number, ifsc_code);
    `);
    console.log('✓ Unique constraint on user_id, account_number, and ifsc_code created');

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
addBankAccountsTable();
