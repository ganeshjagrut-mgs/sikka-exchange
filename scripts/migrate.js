require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'sikka_exchange',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
});

async function runMigrations() {
  console.log('🚀 Starting database migrations...\n');

  try {
    // Create users table
    console.log('Creating users table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        firebase_uid VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        full_name VARCHAR(255),
        kucoin_sub_account_uid VARCHAR(100),
        kucoin_api_key TEXT,
        kucoin_api_secret TEXT,
        kucoin_api_passphrase TEXT,
        kyc_status VARCHAR(50) DEFAULT 'not_submitted',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);

    // Create kyc_submissions table
    console.log('Creating kyc_submissions table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS kyc_submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
        full_name VARCHAR(255) NOT NULL,
        date_of_birth DATE NOT NULL,
        address TEXT NOT NULL,
        id_type VARCHAR(50) NOT NULL,
        id_number VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        rejection_reason TEXT,
        submitted_at TIMESTAMP DEFAULT NOW(),
        reviewed_at TIMESTAMP,
        kucoin_kyc_id VARCHAR(100)
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_kyc_user_id ON kyc_submissions(user_id);`);

    // Create deposits table
    console.log('Creating deposits table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS deposits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
        amount_inr DECIMAL(15, 2) NOT NULL,
        estimated_usdt DECIMAL(20, 8),
        actual_usdt DECIMAL(20, 8),
        usdt_inr_rate DECIMAL(10, 4),
        status VARCHAR(50) DEFAULT 'initiated',
        cashfree_order_id VARCHAR(255),
        cashfree_payment_id VARCHAR(255),
        kucoin_transfer_id VARCHAR(255),
        requested_at TIMESTAMP DEFAULT NOW(),
        paid_at TIMESTAMP,
        completed_at TIMESTAMP
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_deposits_user_id ON deposits(user_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_deposits_cashfree_order_id ON deposits(cashfree_order_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_deposits_requested_at ON deposits(requested_at);`);

    // Create withdrawals table
    console.log('Creating withdrawals table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS withdrawals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
        amount_inr DECIMAL(15, 2) NOT NULL,
        amount_usdt DECIMAL(20, 8),
        usdt_inr_rate DECIMAL(10, 4),
        status VARCHAR(50) DEFAULT 'pending',
        kucoin_transfer_id VARCHAR(255),
        requested_at TIMESTAMP DEFAULT NOW(),
        inr_sent_at TIMESTAMP,
        completed_at TIMESTAMP,
        admin_notes TEXT
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_withdrawals_requested_at ON withdrawals(requested_at);`);

    // Create trades table
    console.log('Creating trades table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trades (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
        token_symbol VARCHAR(20) NOT NULL,
        side VARCHAR(10) NOT NULL,
        order_type VARCHAR(20) DEFAULT 'market',
        amount_inr DECIMAL(15, 2) NOT NULL,
        amount_usdt DECIMAL(20, 8) NOT NULL,
        quantity DECIMAL(20, 8),
        price_usdt DECIMAL(20, 8),
        usdt_inr_rate DECIMAL(10, 4),
        platform_fee_inr DECIMAL(15, 2),
        status VARCHAR(50) DEFAULT 'pending',
        kucoin_order_id VARCHAR(255),
        kucoin_client_oid VARCHAR(255) UNIQUE,
        fee_usdt DECIMAL(20, 8),
        created_at TIMESTAMP DEFAULT NOW(),
        filled_at TIMESTAMP
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_trades_token_symbol ON trades(token_symbol);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_trades_kucoin_order_id ON trades(kucoin_order_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_trades_created_at ON trades(created_at DESC);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_trades_user_created ON trades(user_id, created_at DESC);`);

    // Create tokens table
    console.log('Creating tokens table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        symbol VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        kucoin_symbol VARCHAR(50) NOT NULL,
        quote_min_size DECIMAL(20, 8),
        quote_max_size DECIMAL(20, 8),
        base_min_size DECIMAL(20, 8),
        is_active BOOLEAN DEFAULT true,
        display_order INT DEFAULT 0,
        icon_url TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_tokens_symbol ON tokens(symbol);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_tokens_is_active ON tokens(is_active);`);

    // Create admin_users table
    console.log('Creating admin_users table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        last_login_at TIMESTAMP
      );
    `);

    // Create admin_config table
    console.log('Creating admin_config table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_config (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW(),
        updated_by UUID REFERENCES admin_users(id)
      );
    `);

    console.log('\n✅ All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigrations();
