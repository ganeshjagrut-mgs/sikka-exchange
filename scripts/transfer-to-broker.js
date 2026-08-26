/**
 * Transfer ALL crypto from test user back to broker
 *
 * Use Case: Reset test user for clean testing by transferring all crypto back to broker
 *
 * Usage:
 *   node scripts/transfer-to-broker.js <email>
 *   node scripts/transfer-to-broker.js approved-kyc-trader@test.com
 *
 * On GCP:
 *   ssh m.devaj.m@35.200.154.218 "docker exec sikka_backend node scripts/transfer-to-broker.js approved-kyc-trader@test.com"
 */

// Load environment variables (same pattern as server.js)
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const envPath = fs.existsSync('/root/.env') ? '/root/.env' : path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

const dbService = require('../src/services/db.service');
const kucoin = require('../src/services/kucoin.service');

async function transferToBroker(email) {
  try {
    console.log(`\n========================================`);
    console.log(`Transfer All Crypto to Broker`);
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

    // Get TRADE account balances
    console.log('📊 Checking TRADE account...');
    const tradeAccounts = await kucoin.getAllAccounts('trade', apiKeys);

    if (tradeAccounts.code !== '200000') {
      console.error(`❌ Failed to get TRADE account: ${tradeAccounts.msg}`);
      process.exit(1);
    }

    // Filter non-zero balances (use 'available' not 'balance')
    const tradeBalances = tradeAccounts.data.filter(acc => parseFloat(acc.available) > 0);

    // Check MAIN account too (in case there's anything there)
    console.log('📊 Checking MAIN account...');
    const mainAccounts = await kucoin.getAllAccounts('main', apiKeys);

    if (mainAccounts.code !== '200000') {
      console.error(`❌ Failed to get MAIN account: ${mainAccounts.msg}`);
      process.exit(1);
    }

    const mainBalances = mainAccounts.data.filter(acc => parseFloat(acc.available) > 0);

    if (tradeBalances.length === 0 && mainBalances.length === 0) {
      console.log('✅ Both TRADE and MAIN accounts are already empty - nothing to transfer\n');
      process.exit(0);
    }

    console.log(`\n⚠️  Found crypto to transfer:\n`);
    if (tradeBalances.length > 0) {
      console.log(`TRADE account: ${tradeBalances.length} currency/currencies`);
      tradeBalances.forEach(acc => {
        console.log(`   ${acc.currency}: ${acc.available}`);
      });
    }
    if (mainBalances.length > 0) {
      console.log(`\nMAIN account: ${mainBalances.length} currency/currencies`);
      mainBalances.forEach(acc => {
        console.log(`   ${acc.currency}: ${acc.available}`);
      });
    }

    // Transfer all currencies from TRADE account
    console.log(`\n🔄 Starting transfers from TRADE account...\n`);

    const results = [];
    for (const account of tradeBalances) {
      const currency = account.currency;
      const amount = parseFloat(account.available);

      if (amount <= 0) {
        console.log(`⏭️  Skipping ${currency}: No available balance`);
        results.push({ currency, status: 'skipped', reason: 'no_available_balance' });
        continue;
      }

      console.log(`\n🔄 Processing ${currency}: ${amount}`);

      try {
        // Step 1: TRADE → MAIN (inner transfer)
        console.log(`   Step 1: TRADE → MAIN`);
        const innerTransfer = await kucoin.transferInnerAccount(
          amount,
          'trade',
          'main',
          currency,
          apiKeys
        );

        if (innerTransfer.code !== '200000') {
          throw new Error(`Inner transfer failed: ${innerTransfer.msg}`);
        }
        console.log(`   ✅ Inner transfer: ${innerTransfer.data?.orderId}`);

        // Small delay between transfers
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Step 2: MAIN → Broker (broker transfer with direction='IN')
        console.log(`   Step 2: MAIN → Broker`);
        const brokerTransfer = await kucoin.transferBrokerToSub(
          amount,
          user.kucoin_sub_account_uid,
          'IN',  // Direction IN = from sub-account to broker
          currency,
          'MAIN',  // Broker account type
          'MAIN'   // Sub-account type
        );

        if (brokerTransfer.code !== '200000') {
          throw new Error(`Broker transfer failed: ${brokerTransfer.msg}`);
        }
        console.log(`   ✅ Broker transfer: ${brokerTransfer.data?.orderId}`);

        results.push({
          currency,
          amount,
          status: 'success',
          innerOrderId: innerTransfer.data?.orderId,
          brokerOrderId: brokerTransfer.data?.orderId
        });

      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
        results.push({ currency, amount, status: 'failed', error: error.message });
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Transfer any remaining currencies from MAIN account
    if (mainBalances.length > 0) {
      console.log(`\n🔄 Starting transfers from MAIN account...\n`);

      for (const account of mainBalances) {
        const currency = account.currency;
        const amount = parseFloat(account.available);

        if (amount <= 0) {
          console.log(`⏭️  Skipping ${currency}: No available balance`);
          results.push({ currency, status: 'skipped', reason: 'no_available_balance' });
          continue;
        }

        console.log(`\n🔄 Processing ${currency}: ${amount}`);

        try {
          // Only need broker transfer (already in MAIN)
          console.log(`   MAIN → Broker`);
          const brokerTransfer = await kucoin.transferBrokerToSub(
            amount,
            user.kucoin_sub_account_uid,
            'IN',  // Direction IN = from sub-account to broker
            currency,
            'MAIN',  // Broker account type
            'MAIN'   // Sub-account type
          );

          if (brokerTransfer.code !== '200000') {
            throw new Error(`Broker transfer failed: ${brokerTransfer.msg}`);
          }
          console.log(`   ✅ Broker transfer: ${brokerTransfer.data?.orderId}`);

          results.push({
            currency,
            amount,
            status: 'success',
            brokerOrderId: brokerTransfer.data?.orderId
          });

        } catch (error) {
          console.log(`   ❌ Failed: ${error.message}`);
          results.push({ currency, amount, status: 'failed', error: error.message });
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Summary
    console.log(`\n========================================`);
    console.log(`Summary`);
    console.log(`========================================\n`);

    const successful = results.filter(r => r.status === 'success');
    const failed = results.filter(r => r.status === 'failed');
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

    console.log(`TRADE account: ${finalTradeNonZero.length} currencies`);
    if (finalTradeNonZero.length > 0) {
      finalTradeNonZero.forEach(acc => console.log(`   ${acc.currency}: ${acc.balance}`));
    } else {
      console.log('   (empty)');
    }

    console.log(`\nMAIN account: ${finalMainNonZero.length} currencies`);
    if (finalMainNonZero.length > 0) {
      finalMainNonZero.forEach(acc => console.log(`   ${acc.currency}: ${acc.balance}`));
    } else {
      console.log('   (empty)');
    }

    if (finalTradeNonZero.length === 0 && finalMainNonZero.length === 0) {
      console.log(`\n✅ All funds transferred successfully!\n`);
    } else {
      console.log(`\n⚠️  Warning: Some funds remain in user account\n`);
    }

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
  console.error('❌ Usage: node scripts/transfer-to-broker.js <email>');
  console.error('   Example: node scripts/transfer-to-broker.js approved-kyc-trader@test.com');
  process.exit(1);
}

transferToBroker(email);
