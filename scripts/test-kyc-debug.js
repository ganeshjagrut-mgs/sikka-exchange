require('dotenv').config();
const kucoinService = require('../backend/src/services/kucoin.service.js');

async function test() {
  try {
    console.log('Step 1: Creating sub-account...');
    const subAccount = await kucoinService.createSubAccount('test_kyc_' + Date.now());
    const uid = subAccount.data.uid;
    console.log('✅ Sub-account UID:', uid);
    
    console.log('\nStep 2: Creating API keys for sub-account...');
    const apiKeys = await kucoinService.createSubAccountAPIKeys(
      uid,
      'TestPass123',
      'KYCTestKeys',
      ['General'],
      ['35.200.154.218']
    );
    console.log('✅ Full API Keys Response:');
    console.log(JSON.stringify(apiKeys.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();
