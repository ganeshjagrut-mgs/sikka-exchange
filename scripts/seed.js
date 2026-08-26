require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'sikka_exchange',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
});

async function seedData() {
  console.log('🌱 Starting database seeding...\n');

  try {
    // Seed tokens
    console.log('Seeding tokens...');
    const tokensCheck = await pool.query('SELECT COUNT(*) FROM tokens');
    if (parseInt(tokensCheck.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO tokens (symbol, name, kucoin_symbol, quote_min_size, display_order) VALUES
          ('BTC', 'Bitcoin', 'BTC-USDT', 0.1, 1),
          ('ETH', 'Ethereum', 'ETH-USDT', 0.1, 2),
          ('SOL', 'Solana', 'SOL-USDT', 0.1, 3),
          ('XRP', 'Ripple', 'XRP-USDT', 0.1, 4);
      `);
      console.log('  ✓ Inserted 4 tokens (BTC, ETH, SOL, XRP)');
    } else {
      console.log('  ⚠ Tokens already exist, skipping...');
    }

    // Seed admin user
    console.log('\nSeeding admin user...');
    const adminCheck = await pool.query('SELECT COUNT(*) FROM admin_users');
    if (parseInt(adminCheck.rows[0].count) === 0) {
      const passwordHash = await bcrypt.hash('changeme123', 10);
      await pool.query(`
        INSERT INTO admin_users (username, password_hash) VALUES ($1, $2)
      `, ['admin', passwordHash]);
      console.log('  ✓ Created admin user (username: admin, password: changeme123)');
      console.log('  ⚠ IMPORTANT: Change this password in production!');
    } else {
      console.log('  ⚠ Admin user already exists, skipping...');
    }

    // Seed admin config
    console.log('\nSeeding admin config...');
    const configCheck = await pool.query('SELECT COUNT(*) FROM admin_config');
    if (parseInt(configCheck.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO admin_config (key, value) VALUES
          ('inr_to_usdt_rate', '84.50'),
          ('platform_fee_percentage', '0.5');
      `);
      console.log('  ✓ Set USDT/INR rate: 84.50');
      console.log('  ✓ Set platform fee: 0.5%');
    } else {
      console.log('  ⚠ Config already exists, skipping...');
    }

    console.log('\n✅ All seed data inserted successfully!');
    console.log('\n📝 Summary:');
    console.log('  - 4 tokens available for trading');
    console.log('  - Admin credentials: admin / changeme123');
    console.log('  - USDT/INR rate: 84.50');
    console.log('  - Platform fee: 0.5%');
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

seedData();
