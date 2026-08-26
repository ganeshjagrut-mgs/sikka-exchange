/**
 * One-time script to consolidate MAIN account balance to TRADE account
 *
 * Use Case: Fix test users with old manual transfers that left money in MAIN
 *
 * Usage:
 *   node scripts/consolidate-balance.js <email>
 *   node scripts/consolidate-balance.js approved-kyc-trader@test.com
 *
 * On GCP:
 *   ssh m.devaj.m@35.200.154.218 "docker exec sikka_backend node scripts/consolidate-balance.js approved-kyc-trader@test.com"
 */

// Load environment variables (same pattern as server.js)
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const envPath = fs.existsSync('/root/.env') ? '/root/.env' : path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

const dbService = require('../src/services/db.service');
const kucoin = require('../src/services/kucoin.service');

async function consolidateBalance(email) {
  try {
    console.log(`\n========================================`);
    console.log(`MAIN → TRADE Balance Consolidation`);
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

    if (!user.kucoin_api_key) {
      console.error('❌ User has no KuCoin API keys (KYC not completed)');
      process.exit(1);
    }

    console.log(`✅ User found: ${user.id}`);
    console.log(`✅ KuCoin Sub-Account UID: ${user.kucoin_sub_account_uid}\n`);

    const apiKeys = {
      apiKey: user.kucoin_api_key,
      apiSecret: user.kucoin_api_secret,
      apiPassphrase: user.kucoin_api_passphrase
    };

    // Get MAIN account balances
    console.log('📊 Checking MAIN account...');
    const mainAccounts = await kucoin.getAllAccounts('main', apiKeys);

    if (mainAccounts.code !== '200000') {
      console.error(`❌ Failed to get MAIN account: ${mainAccounts.msg}`);
      process.exit(1);
    }

    // Filter non-zero balances
    const mainBalances = mainAccounts.data.filter(acc => parseFloat(acc.balance) > 0);

    if (mainBalances.length === 0) {
      console.log('✅ MAIN account is already empty - nothing to consolidate\n');
      process.exit(0);
    }

    console.log(`\n⚠️  Found ${mainBalances.length} currency/currencies in MAIN account:\n`);
    mainBalances.forEach(acc => {
      console.log(`   ${acc.currency}: ${acc.balance} (available: ${acc.available})`);
    });

    // Transfer each currency from MAIN to TRADE
    console.log(`\n🔄 Starting consolidation...\n`);

    const results = [];
    for (const account of mainBalances) {
      const currency = account.currency;
      const amount = parseFloat(account.available); // Use available (not holds)

      if (amount <= 0) {
        console.log(`⏭️  Skipping ${currency}: No available balance (${amount})`);
        results.push({ currency, status: 'skipped', reason: 'no_available_balance' });
        continue;
      }

      console.log(`🔄 Transferring ${currency}: ${amount} from MAIN → TRADE...`);

      try {
        const transferResult = await kucoin.transferInnerAccount(
          amount,
          'main',
          'trade',
          currency,
          apiKeys
        );

        if (transferResult.code === '200000') {
          console.log(`   ✅ Success: ${currency} transferred (orderId: ${transferResult.data?.orderId})`);
          results.push({ currency, amount, status: 'success', orderId: transferResult.data?.orderId });
        } else {
          console.log(`   ❌ Failed: ${transferResult.msg}`);
          results.push({ currency, amount, status: 'failed', error: transferResult.msg });
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        results.push({ currency, amount, status: 'error', error: error.message });
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Summary
    console.log(`\n========================================`);
    console.log(`Summary`);
    console.log(`========================================\n`);

    const successful = results.filter(r => r.status === 'success');
    const failed = results.filter(r => r.status === 'failed' || r.status === 'error');
    const skipped = results.filter(r => r.status === 'skipped');

    console.log(`✅ Successful: ${successful.length}`);
    successful.forEach(r => console.log(`   ${r.currency}: ${r.amount}`));

    if (failed.length > 0) {
      console.log(`\n❌ Failed: ${failed.length}`);
      failed.forEach(r => console.log(`   ${r.currency}: ${r.error}`));
    }

    if (skipped.length > 0) {
      console.log(`\n⏭️  Skipped: ${skipped.length}`);
      skipped.forEach(r => console.log(`   ${r.currency}: ${r.reason}`));
    }

    // Verify final state
    console.log(`\n📊 Final balance check...\n`);

    const finalMain = await kucoin.getAllAccounts('main', apiKeys);
    const finalMainNonZero = finalMain.data?.filter(acc => parseFloat(acc.balance) > 0) || [];

    const finalTrade = await kucoin.getAllAccounts('trade', apiKeys);
    const finalTradeNonZero = finalTrade.data?.filter(acc => parseFloat(acc.balance) > 0) || [];

    console.log(`MAIN account: ${finalMainNonZero.length} currencies`);
    if (finalMainNonZero.length > 0) {
      finalMainNonZero.forEach(acc => console.log(`   ${acc.currency}: ${acc.balance}`));
    } else {
      console.log('   (empty)');
    }

    console.log(`\nTRADE account: ${finalTradeNonZero.length} currencies`);
    if (finalTradeNonZero.length > 0) {
      finalTradeNonZero.forEach(acc => console.log(`   ${acc.currency}: ${acc.balance}`));
    } else {
      console.log('   (empty)');
    }

    console.log(`\n✅ Consolidation complete!\n`);

    if (failed.length > 0) {
      console.log(`⚠️  Warning: ${failed.length} transfer(s) failed - manual intervention may be needed\n`);
      process.exit(1);
    }

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Get email from command line
const email = process.argv[2];

if (!email) {
  console.error('❌ Usage: node scripts/consolidate-balance.js <email>');
  console.error('   Example: node scripts/consolidate-balance.js approved-kyc-trader@test.com');
  process.exit(1);
}

consolidateBalance(email);
