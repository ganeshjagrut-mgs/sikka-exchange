require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'sikka_exchange',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
});

async function flushDatabase() {
  console.log('🗑️  Flushing database...\n');

  try {
    console.log('Dropping all tables...');

    await pool.query('DROP TABLE IF EXISTS admin_config CASCADE;');
    await pool.query('DROP TABLE IF EXISTS admin_users CASCADE;');
    await pool.query('DROP TABLE IF EXISTS tokens CASCADE;');
    await pool.query('DROP TABLE IF EXISTS trades CASCADE;');
    await pool.query('DROP TABLE IF EXISTS withdrawals CASCADE;');
    await pool.query('DROP TABLE IF EXISTS deposits CASCADE;');
    await pool.query('DROP TABLE IF EXISTS kyc_submissions CASCADE;');
    await pool.query('DROP TABLE IF EXISTS users CASCADE;');

    console.log('✅ All tables dropped successfully!');
    console.log('\n💡 Next steps:');
    console.log('  1. Run: npm run db:migrate (recreate tables)');
    console.log('  2. Run: npm run db:seed (insert initial data)');
  } catch (error) {
    console.error('❌ Flush failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

flushDatabase();
