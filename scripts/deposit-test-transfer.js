require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const dbService = require('../backend/src/services/db.service');
const kucoin = require('../backend/src/services/kucoin.service');

async function transfer() {
  try {
    const user = await dbService.queryOne(
      'SELECT kucoin_sub_account_uid, kucoin_api_key, kucoin_api_secret, kucoin_api_passphrase FROM users WHERE email = $1',
      ['approved-kyc-trader@test.com']
    );
    
    if (!user) {
      console.error('User not found');
      process.exit(1);
    }
    
    console.log('User UID:', user.kucoin_sub_account_uid);
    
    const apiKeys = {
      apiKey: user.kucoin_api_key,
      apiSecret: user.kucoin_api_secret,
      apiPassphrase: user.kucoin_api_passphrase
    };
    
    // Step 1: Broker MAIN -> Sub MAIN
    console.log('\n🔄 Step 1: Broker MAIN -> Sub MAIN (11.83 USDT)...');
    const r1 = await kucoin.transferBrokerToSub(11.83, user.kucoin_sub_account_uid, 'USDT', 'MAIN', 'MAIN', 'OUT');
    console.log('✅ Transfer 1 completed. Order ID:', r1.data?.orderId);
    
    // Wait for settlement
    console.log('⏳ Waiting 3 seconds for settlement...');
    await new Promise(r => setTimeout(r, 3000));
    
    // Step 2: Sub MAIN -> Sub TRADE
    console.log('\n🔄 Step 2: Sub MAIN -> Sub TRADE (11.83 USDT)...');
    const r2 = await kucoin.transferInnerAccount(11.83, 'main', 'trade', 'USDT', apiKeys);
    console.log('✅ Transfer 2 completed. Order ID:', r2.data?.orderId);
    
    console.log('\n✅ ALL TRANSFERS COMPLETE!');
    console.log('User should now have 11.83 USDT in TRADE account');
    
    await dbService.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Transfer failed:', error.message);
    if (error.response?.data) {
      console.error('KuCoin Error:', JSON.stringify(error.response.data, null, 2));
    }
    await dbService.close();
    process.exit(1);
  }
}

transfer();
