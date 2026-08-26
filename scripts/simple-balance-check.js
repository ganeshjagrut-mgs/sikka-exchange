require('dotenv').config();
const kucoin = require('../backend/src/services/kucoin.service');
const db = require('../backend/src/config/database');

async function checkBalance() {
  try {
    const userResult = await db.query(
      'SELECT kucoin_api_key, kucoin_api_secret, kucoin_api_passphrase FROM users WHERE email = $1',
      ['approved-kyc-trader@test.com']
    );

    const apiKeys = {
      apiKey: userResult.rows[0].kucoin_api_key,
      apiSecret: userResult.rows[0].kucoin_api_secret,
      apiPassphrase: userResult.rows[0].kucoin_api_passphrase
    };

    const balance = await kucoin.getBalance('USDT', 'trade', apiKeys);
    const data = balance.data[0] || {};

    console.log('\nUSDT Balance (TRADE):');
    console.log('  Available:', data.available || '0');
    console.log('  Hold:', data.holds || '0');
    console.log('  Total:', data.balance || '0');

    await db.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    await db.end();
    process.exit(1);
  }
}

checkBalance();
