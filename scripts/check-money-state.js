/**
 * Check Money State - Where is all the money?
 * This script checks:
 * 1. Broker account balance (Trading API keys)
 * 2. Sub-account balance for approved-kyc-trader user
 * 3. Database state (deposits, trades, transfers)
 */

require('dotenv').config();
const kucoin = require('../backend/src/services/kucoin.service');
const db = require('../backend/src/config/database');

async function checkMoneyState() {
  console.log('\n========================================');
  console.log('CHECKING MONEY STATE ACROSS SYSTEM');
  console.log('========================================\n');

  // 1. Check broker account balance (Trading API keys - our main wallet)
  console.log('1️⃣  BROKER ACCOUNT BALANCE (Trading Keys)');
  console.log('-------------------------------------------');
  try {
    // Get all USDT balances (both main and trade)
    const brokerMain = await kucoin.getBalance('USDT', 'main', null);
    const brokerTrade = await kucoin.getBalance('USDT', 'trade', null);

    console.log('MAIN account:', JSON.stringify(brokerMain, null, 2));
    console.log('\nTRADE account:', JSON.stringify(brokerTrade, null, 2));

    let totalUSDT = 0;
    if (brokerMain.code === '200000' && brokerMain.data) {
      brokerMain.data.forEach(account => {
        totalUSDT += parseFloat(account.balance || 0);
      });
    }
    if (brokerTrade.code === '200000' && brokerTrade.data) {
      brokerTrade.data.forEach(account => {
        totalUSDT += parseFloat(account.balance || 0);
      });
    }
    console.log(`\n💰 Total USDT in broker account: ${totalUSDT} USDT`);
  } catch (err) {
    console.error('❌ Error fetching broker balance:', err.message);
  }

  // 2. Check approved-kyc-trader sub-account
  console.log('\n\n2️⃣  SUB-ACCOUNT BALANCE (approved-kyc-trader@test.com)');
  console.log('-------------------------------------------');
  try {
    const userResult = await db.query(
      `SELECT kucoin_api_key, kucoin_api_secret, kucoin_api_passphrase, kucoin_sub_account_uid
       FROM users WHERE email = $1`,
      ['approved-kyc-trader@test.com']
    );

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      console.log(`Sub-account UID: ${user.kucoin_sub_account_uid}`);

      const apiKeys = {
        apiKey: user.kucoin_api_key,
        apiSecret: user.kucoin_api_secret,
        apiPassphrase: user.kucoin_api_passphrase
      };

      const subMain = await kucoin.getBalance('USDT', 'main', apiKeys);
      const subTrade = await kucoin.getBalance('USDT', 'trade', apiKeys);

      console.log('MAIN account:', JSON.stringify(subMain, null, 2));
      console.log('\nTRADE account:', JSON.stringify(subTrade, null, 2));

      let totalUSDT = 0;
      if (subMain.code === '200000' && subMain.data) {
        subMain.data.forEach(account => {
          totalUSDT += parseFloat(account.balance || 0);
          console.log(`  MAIN ${account.type}: ${account.balance} USDT (available: ${account.available})`);
        });
      }
      if (subTrade.code === '200000' && subTrade.data) {
        subTrade.data.forEach(account => {
          totalUSDT += parseFloat(account.balance || 0);
          console.log(`  TRADE ${account.type}: ${account.balance} USDT (available: ${account.available})`);
        });
      }
      console.log(`\n💰 Total USDT in sub-account: ${totalUSDT} USDT`);
    } else {
      console.log('❌ User not found in database');
    }
  } catch (err) {
    console.error('❌ Error fetching sub-account balance:', err.message);
  }

  // 3. Check database state
  console.log('\n\n3️⃣  DATABASE STATE');
  console.log('-------------------------------------------');

  // Deposits
  const deposits = await db.query(
    `SELECT status, SUM(actual_usdt::numeric) as total_usdt, COUNT(*) as count
     FROM deposits
     WHERE user_id = (SELECT id FROM users WHERE email = $1)
     GROUP BY status`,
    ['approved-kyc-trader@test.com']
  );
  console.log('\n📥 Deposits:');
  deposits.rows.forEach(row => {
    console.log(`  ${row.status}: ${row.total_usdt || 0} USDT (${row.count} deposits)`);
  });

  // Trades
  const trades = await db.query(
    `SELECT side, status, SUM(amount_usdt::numeric) as total_usdt, COUNT(*) as count
     FROM trades
     WHERE user_id = (SELECT id FROM users WHERE email = $1)
     GROUP BY side, status`,
    ['approved-kyc-trader@test.com']
  );
  console.log('\n💱 Trades:');
  trades.rows.forEach(row => {
    console.log(`  ${row.side} (${row.status}): ${row.total_usdt || 0} USDT (${row.count} trades)`);
  });

  // Withdrawals
  const withdrawals = await db.query(
    `SELECT status, SUM(amount_usdt::numeric) as total_usdt, COUNT(*) as count
     FROM withdrawals
     WHERE user_id = (SELECT id FROM users WHERE email = $1)
     GROUP BY status`,
    ['approved-kyc-trader@test.com']
  );
  console.log('\n📤 Withdrawals:');
  if (withdrawals.rows.length > 0) {
    withdrawals.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.total_usdt || 0} USDT (${row.count} withdrawals)`);
    });
  } else {
    console.log('  No withdrawals');
  }

  console.log('\n========================================\n');

  process.exit(0);
}

checkMoneyState().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
