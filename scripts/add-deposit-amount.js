require('dotenv').config();
const kucoin = require('../backend/src/services/kucoin.service');
const db = require('../backend/src/config/database');

async function addAmount() {
  console.log('Adding additional 8.33 USDT to reach 11.83 total...\n');

  const subAccountUid = '251702548';
  const additionalAmount = 8.33;

  try {
    // Step 1: Transfer from broker MAIN to sub MAIN
    console.log('Step 1: Transfer 8.33 USDT from broker MAIN to sub MAIN...');
    const transfer1 = await kucoin.transferBrokerToSub(
      additionalAmount,
      subAccountUid,
      'OUT',
      'USDT',
      'MAIN',
      'MAIN',
      null
    );

    if (transfer1.code !== '200000') {
      throw new Error('Transfer to sub MAIN failed: ' + transfer1.msg);
    }

    console.log('✅ Transfer 1 complete - Order ID:', transfer1.data.orderId);
    console.log('⏳ Waiting 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 2: Get sub-account API keys
    const userResult = await db.query(
      'SELECT kucoin_api_key, kucoin_api_secret, kucoin_api_passphrase FROM users WHERE email = $1',
      ['approved-kyc-trader@test.com']
    );

    const apiKeys = {
      apiKey: userResult.rows[0].kucoin_api_key,
      apiSecret: userResult.rows[0].kucoin_api_secret,
      apiPassphrase: userResult.rows[0].kucoin_api_passphrase
    };

    // Step 3: Transfer from sub MAIN to sub TRADE
    console.log('Step 2: Transfer 8.33 USDT from sub MAIN to sub TRADE...');
    const transfer2 = await kucoin.transferInnerAccount(
      additionalAmount,
      'main',
      'trade',
      'USDT',
      apiKeys,
      null
    );

    if (transfer2.code !== '200000') {
      throw new Error('Transfer to TRADE failed: ' + transfer2.msg);
    }

    console.log('✅ Transfer 2 complete - Order ID:', transfer2.data.orderId);

    // Verify final balance
    console.log('\nVerifying final balance...');
    const finalBalance = await kucoin.getBalance('USDT', 'trade', apiKeys);
    const balance = finalBalance.data[0]?.balance || '0';

    console.log('\n✅ COMPLETE!');
    console.log('   TRADE balance: ' + balance + ' USDT');
    console.log('   Expected: 11.83 USDT');

    await db.end();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ FAILED:', error.message);
    await db.end();
    process.exit(1);
  }
}

addAmount();
