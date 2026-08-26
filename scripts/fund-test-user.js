require('dotenv').config();
const kucoin = require('../backend/src/services/kucoin.service');
const db = require('../backend/src/config/database');

async function fundTestUser() {
  console.log('Funding test user for trading...\n');

  const subAccountUid = '251702548';
  const amountToTransfer = 3.5; // Leave some buffer in broker

  try {
    // Step 1: Transfer from broker MAIN to sub MAIN
    console.log(`Step 1: Transfer ${amountToTransfer} USDT from broker MAIN to sub MAIN...`);
    const transfer1 = await kucoin.transferBrokerToSub(
      amountToTransfer,       // amount
      subAccountUid,          // subUserId
      'OUT',                  // direction (OUT = broker -> sub)
      'USDT',                 // currency
      'MAIN',                 // accountType (broker side)
      'MAIN',                 // subAccountType (sub side)
      null                    // clientOid (auto-generated)
    );

    console.log('Transfer to sub MAIN response:', JSON.stringify(transfer1, null, 2));

    if (transfer1.code !== '200000') {
      throw new Error(`Transfer to sub MAIN failed: ${transfer1.msg}`);
    }

    console.log(`SUCCESS - Transfer 1 complete - Order ID: ${transfer1.data.orderId}\n`);

    // Wait a moment for transfer to complete
    console.log('Waiting 3 seconds for transfer to settle...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 2: Get sub-account API keys from database
    console.log('Step 2: Getting sub-account API keys from database...');
    const userResult = await db.query(
      'SELECT kucoin_api_key, kucoin_api_secret, kucoin_api_passphrase FROM users WHERE email = $1',
      ['approved-kyc-trader@test.com']
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found in database');
    }

    const apiKeys = {
      apiKey: userResult.rows[0].kucoin_api_key,
      apiSecret: userResult.rows[0].kucoin_api_secret,
      apiPassphrase: userResult.rows[0].kucoin_api_passphrase
    };

    console.log('Got API keys for sub-account\n');

    // Step 3: Transfer from sub MAIN to sub TRADE (needed for trading)
    console.log(`Step 3: Transfer ${amountToTransfer} USDT from sub MAIN to sub TRADE...`);
    const transfer2 = await kucoin.transferInnerAccount(
      amountToTransfer,       // amount
      'main',                 // from
      'trade',                // to
      'USDT',                 // currency
      apiKeys,                // sub-account API keys
      null                    // clientOid (auto-generated)
    );

    console.log('Transfer to TRADE response:', JSON.stringify(transfer2, null, 2));

    if (transfer2.code !== '200000') {
      throw new Error(`Transfer to TRADE failed: ${transfer2.msg}`);
    }

    console.log(`SUCCESS - Transfer 2 complete - Order ID: ${transfer2.data.orderId}\n`);

    // Step 4: Verify final balance
    console.log('Step 4: Verifying final balance...');
    const finalBalance = await kucoin.getBalance('USDT', 'trade', apiKeys);

    console.log('Final TRADE balance:', JSON.stringify(finalBalance, null, 2));

    console.log(`\nUSER FUNDED SUCCESSFULLY!`);
    console.log(`   Sub-account UID: ${subAccountUid}`);
    console.log(`   Email: approved-kyc-trader@test.com`);
    console.log(`   TRADE balance: ${finalBalance.data[0]?.balance || '0'} USDT`);
    console.log(`   Ready for trading!\n`);

    await db.end();
    process.exit(0);

  } catch (error) {
    console.error('\nFUNDING FAILED:', error.message);
    console.error('Stack:', error.stack);
    await db.end();
    process.exit(1);
  }
}

fundTestUser();
