require('dotenv').config();
const kucoinService = require('../backend/src/services/kucoin.service.js');

async function test() {
  try {
    console.log('Step 1: Creating sub-account...');
    const subAccount = await kucoinService.createSubAccount('test_kyc_' + Date.now());
    const uid = subAccount.data.uid;
    console.log('✅ Sub-account UID:', uid);
    
    const passphrase = 'TestPass123';  // CRITICAL: Store the passphrase we use to create keys
    
    console.log('\nStep 2: Creating API keys for sub-account...');
    const apiKeys = await kucoinService.createSubAccountAPIKeys(
      uid,
      passphrase,  // Pass it in
      'KYCTestKeys',
      ['General'],
      ['35.200.154.218']
    );
    console.log('✅ API Keys created');
    console.log('   API Key:', apiKeys.data.apiKey);
    
    // CRITICAL: Use correct field names and include the passphrase we created
    const subAccKeys = {
      apiKey: apiKeys.data.apiKey,
      apiSecret: apiKeys.data.secretKey,  // Note: it's secretKey in response
      apiPassphrase: passphrase  // CRITICAL: Use the passphrase we passed when creating
    };
    
    console.log('\nStep 3: Submitting KYC with sub-account keys (using ordinary KuCoin endpoint)...');
    const kycData = {
      firstName: 'John',
      lastName: 'Doe',
      issueCountry: 'IN',
      identityNumber: 'A1234567890',
      identityType: 'passport',
      birthDate: '1990-01-15',
      expireDate: '2030-01-15',
      facePhoto: 'data:image/jpeg;base64,test',
      frontPhoto: 'data:image/jpeg;base64,test'
    };
    
    console.log('Using credentials:', {
      apiKey: subAccKeys.apiKey,
      hasSecret: !!subAccKeys.apiSecret,
      hasPassphrase: !!subAccKeys.apiPassphrase
    });
    
    const kycResult = await kucoinService.submitKYC(uid, kycData, subAccKeys);
    console.log('\n✅ KYC Submission Result:');
    console.log(JSON.stringify(kycResult, null, 2));
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

test();
