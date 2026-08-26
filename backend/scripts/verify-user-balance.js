/**
 * Verify user account balance
 */

// Load environment variables
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const envPath = fs.existsSync('/root/.env') ? '/root/.env' : path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

const dbService = require('../src/services/db.service');
const kucoin = require('../src/services/kucoin.service');

async function verifyUserBalance(email) {
  try {
    console.log(`\n========================================`);
    console.log(`User Account Balance`);
    console.log(`========================================\n`);
    console.log(`User: ${email}\n`);

    // Get user from database
    const user = await dbService.queryOne(
      'SELECT id, email, kucoin_sub_account_uid, kucoin_api_key, kucoin_api_secret, kucoin_api_passphrase FROM users WHERE email = $1',
      [email]
    );

    if (!user) {
      console.error('❌ User not found');
      process.exit(1);
    }

    const apiKeys = {
      apiKey: user.kucoin_api_key,
      apiSecret: user.kucoin_api_secret,
      apiPassphrase: user.kucoin_api_passphrase
    };

    // Check TRADE account
    console.log('📊 TRADE Account:\n');
    const tradeAccounts = await kucoin.getAllAccounts('trade', apiKeys);

    if (tradeAccounts.code === '200000') {
      const nonZero = tradeAccounts.data.filter(acc => parseFloat(acc.balance) > 0);
      if (nonZero.length === 0) {
        console.log('   (empty)\n');
      } else {
        nonZero.forEach(acc => {
          console.log(`   ${acc.currency}: ${acc.balance} (available: ${acc.available})`);
        });
        console.log('');
      }
    } else {
      console.error(`   ❌ Failed: ${tradeAccounts.msg}\n`);
    }

    // Check MAIN account
    console.log('📊 MAIN Account:\n');
    const mainAccounts = await kucoin.getAllAccounts('main', apiKeys);

    if (mainAccounts.code === '200000') {
      const nonZero = mainAccounts.data.filter(acc => parseFloat(acc.balance) > 0);
      if (nonZero.length === 0) {
        console.log('   (empty)\n');
      } else {
        nonZero.forEach(acc => {
          console.log(`   ${acc.currency}: ${acc.balance} (available: ${acc.available})`);
        });
        console.log('');
      }
    } else {
      console.error(`   ❌ Failed: ${mainAccounts.msg}\n`);
    }

    console.log('========================================\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

const email = process.argv[2];

if (!email) {
  console.error('❌ Usage: node scripts/verify-user-balance.js <email>');
  console.error('   Example: node scripts/verify-user-balance.js approved-kyc-trader@test.com');
  process.exit(1);
}

verifyUserBalance(email);
