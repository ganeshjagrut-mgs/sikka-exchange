#!/usr/bin/env node
/**
 * Fix User API Keys Script
 *
 * This script regenerates KuCoin API keys for a user whose credentials
 * were not properly stored due to the apiSecret/secretKey field name bug.
 *
 * Usage: node scripts/fix-user-api-keys.js [email]
 * Default: dev@xo.builders
 *
 * What it does:
 * 1. Gets user by email from database
 * 2. Fetches existing API key info from KuCoin
 * 3. Deletes the existing (broken) API key
 * 4. Creates a new API key
 * 5. Updates database with correct credentials (using secretKey, not apiSecret)
 *
 * IMPORTANT: This script must be run from the GCP server (35.200.154.218)
 * because KuCoin API is IP-whitelisted.
 */

require('dotenv').config();
const kucoin = require('../backend/src/services/kucoin.service');
const db = require('../backend/src/config/database');

const DEFAULT_EMAIL = 'dev@xo.builders';

async function fixUserApiKeys(email) {
  console.log('\n========================================');
  console.log('Fix User API Keys Script');
  console.log('========================================\n');

  try {
    // Step 1: Get user from database
    console.log(`Step 1: Looking up user by email: ${email}`);
    const userResult = await db.query(
      `SELECT id, email, kucoin_sub_account_uid, kucoin_api_key,
              kucoin_api_secret, kucoin_api_passphrase, kyc_status
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      throw new Error(`User not found: ${email}`);
    }

    const user = userResult.rows[0];
    console.log('   Found user:');
    console.log(`   - ID: ${user.id}`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - KuCoin UID: ${user.kucoin_sub_account_uid}`);
    console.log(`   - API Key: ${user.kucoin_api_key ? user.kucoin_api_key.substring(0, 10) + '...' : 'NULL'}`);
    console.log(`   - API Secret: ${user.kucoin_api_secret ? 'SET' : 'NULL'} <-- This is the problem`);
    console.log(`   - API Passphrase: ${user.kucoin_api_passphrase ? 'SET' : 'NULL'}`);
    console.log(`   - KYC Status: ${user.kyc_status}\n`);

    if (!user.kucoin_sub_account_uid) {
      throw new Error('User has no KuCoin sub-account UID. Cannot proceed.');
    }

    // Step 2: Get existing API key info from KuCoin
    console.log('Step 2: Fetching existing API key info from KuCoin...');
    const existingKeysResponse = await kucoin.getSubAccountAPIKey(user.kucoin_sub_account_uid);

    if (existingKeysResponse.code !== '200000') {
      console.log(`   Warning: Could not fetch existing keys: ${existingKeysResponse.msg}`);
      console.log('   Proceeding to create new key anyway...\n');
    } else {
      console.log(`   Found ${existingKeysResponse.data?.length || 0} existing API key(s)\n`);

      // Step 3: Delete existing API key(s)
      if (user.kucoin_api_key) {
        console.log('Step 3: Deleting existing API key...');
        console.log(`   Deleting key: ${user.kucoin_api_key.substring(0, 10)}...`);

        const deleteResponse = await kucoin.deleteSubAccountAPIKey(
          user.kucoin_sub_account_uid,
          user.kucoin_api_key
        );

        if (deleteResponse.code === '200000') {
          console.log('   ✅ Existing API key deleted successfully\n');
        } else {
          console.log(`   ⚠️  Delete returned: ${deleteResponse.code} - ${deleteResponse.msg}`);
          console.log('   Proceeding to create new key anyway...\n');
        }
      } else {
        console.log('Step 3: No existing API key to delete\n');
      }
    }

    // Step 4: Create new API key
    console.log('Step 4: Creating new API key...');

    // Generate a secure passphrase (same logic as kyc.routes.js)
    const newPassphrase = `sikka${Date.now()}${Math.random().toString(36).substring(2, 10)}`.substring(0, 32);
    const label = `Sikka_${user.id.substring(0, 8)}`;

    console.log(`   Label: ${label}`);
    console.log(`   Passphrase: ${newPassphrase}`);
    console.log(`   Permissions: ["General", "Spot"]`);
    console.log(`   IP Whitelist: ["35.200.154.218"]`);

    const createResponse = await kucoin.createSubAccountAPIKeys(
      user.kucoin_sub_account_uid,
      newPassphrase,
      label,
      ['General', 'Spot'],
      ['35.200.154.218']
    );

    if (createResponse.code !== '200000') {
      throw new Error(`Failed to create API key: ${createResponse.code} - ${createResponse.msg}`);
    }

    // CRITICAL: Use secretKey (not apiSecret) from the response
    const { apiKey, secretKey } = createResponse.data;

    if (!apiKey || !secretKey) {
      throw new Error(`API key response missing fields. apiKey: ${!!apiKey}, secretKey: ${!!secretKey}`);
    }

    console.log(`   ✅ New API key created successfully`);
    console.log(`   - New API Key: ${apiKey.substring(0, 10)}...`);
    console.log(`   - Secret Key: ${secretKey ? 'RECEIVED' : 'MISSING'}\n`);

    // Step 5: Update database with correct credentials
    console.log('Step 5: Updating database with new credentials...');

    const updateResult = await db.query(
      `UPDATE users
       SET kucoin_api_key = $1,
           kucoin_api_secret = $2,
           kucoin_api_passphrase = $3,
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, email, kucoin_api_key,
                 kucoin_api_secret IS NOT NULL as has_secret,
                 kucoin_api_passphrase IS NOT NULL as has_passphrase`,
      [apiKey, secretKey, newPassphrase, user.id]
    );

    if (updateResult.rows.length === 0) {
      throw new Error('Database update failed - no rows affected');
    }

    const updated = updateResult.rows[0];
    console.log(`   ✅ Database updated successfully`);
    console.log(`   - API Key: ${updated.kucoin_api_key.substring(0, 10)}...`);
    console.log(`   - Has Secret: ${updated.has_secret}`);
    console.log(`   - Has Passphrase: ${updated.has_passphrase}\n`);

    // Step 6: Verify the fix
    console.log('Step 6: Verifying credentials work...');

    const newApiKeys = {
      apiKey: apiKey,
      apiSecret: secretKey,
      apiPassphrase: newPassphrase
    };

    // Try to get balance (will fail if credentials are wrong)
    const balanceResponse = await kucoin.getAllAccounts('main', newApiKeys);

    if (balanceResponse.code === '200000') {
      console.log('   ✅ Credentials verified - API call successful!\n');
    } else {
      console.log(`   ⚠️  Balance check returned: ${balanceResponse.code} - ${balanceResponse.msg}`);
      console.log('   Note: This may be expected if account has no funds\n');
    }

    console.log('========================================');
    console.log('✅ FIX COMPLETE');
    console.log('========================================');
    console.log(`User ${email} now has valid API credentials.`);
    console.log('They should be able to access their wallet.\n');

    await db.end();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ FIX FAILED:', error.message);
    console.error('Stack:', error.stack);
    await db.end();
    process.exit(1);
  }
}

// Get email from command line or use default
const email = process.argv[2] || DEFAULT_EMAIL;
fixUserApiKeys(email);
