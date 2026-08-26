require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'sikka_exchange',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
});

async function addKYCPhotoColumns() {
  const client = await pool.connect();

  try {
    console.log('Starting migration: Adding photo columns to kyc_submissions table...');

    // Add columns for KYC photos
    await client.query(`
      ALTER TABLE kyc_submissions
      ADD COLUMN IF NOT EXISTS expire_date DATE,
      ADD COLUMN IF NOT EXISTS face_photo TEXT,
      ADD COLUMN IF NOT EXISTS front_photo TEXT,
      ADD COLUMN IF NOT EXISTS backend_photo TEXT,
      ADD COLUMN IF NOT EXISTS country VARCHAR(10);
    `);

    console.log('✓ Added columns: expire_date, face_photo, front_photo, backend_photo, country');

    // Verify columns were added
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'kyc_submissions'
      AND column_name IN ('expire_date', 'face_photo', 'front_photo', 'backend_photo', 'country')
      ORDER BY column_name;
    `);

    console.log('\nVerification - New columns:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
addKYCPhotoColumns().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
