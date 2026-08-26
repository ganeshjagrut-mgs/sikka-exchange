/**
 * Complete KYC Flow Test
 * Tests: createSubAccount -> createSubAccountAPIKeys -> submitKYC
 */

require('dotenv').config();
const kucoinService = require('../backend/src/services/kucoin.service');

async function runKYCFlow() {
  console.log('\n========================================');
  console.log('KYC COMPLETE FLOW TEST');
  console.log('========================================\n');

  try {
    // Step 1: Create Sub-Account
    console.log('Step 1: Creating sub-account...');
    const accountName = 'kyc_test_' + Date.now();
    const subAccountResult = await kucoinService.createSubAccount(accountName);
    
    if (subAccountResult.code !== '200000' || !subAccountResult.data.uid) {
      console.error('❌ Failed to create sub-account:', subAccountResult);
      return;
    }
    
    const uid = subAccountResult.data.uid;
    console.log('✅ Sub-account created:', uid);

    // Step 2: Create API Keys
    console.log('\nStep 2: Creating API keys for sub-account...');
    const passphrase = 'KycTest123';
    const label = 'KYC Test Keys';
    const apiKeysResult = await kucoinService.createSubAccountAPIKeys(
      uid,
      passphrase,
      label,
      ['General'],
      ['35.200.154.218']
    );

    if (apiKeysResult.code !== '200000' || !apiKeysResult.data.apiKey) {
      console.error('❌ Failed to create API keys:', apiKeysResult);
      return;
    }

    const apiKeys = {
      apiKey: apiKeysResult.data.apiKey,
      apiSecret: apiKeysResult.data.secretKey,
      apiPassphrase: passphrase  // Use the passphrase we created with
    };
    console.log('✅ API keys created:', apiKeys.apiKey);

    // Step 3: Submit KYC
    console.log('\nStep 3: Submitting KYC...');
    const kycData = {
      firstName: 'John',
      lastName: 'Doe',
      issueCountry: 'IN',
      identityNumber: 'A1234567890',
      identityType: 'passport',
      birthDate: '1990-01-15',
      expireDate: '2030-01-15',
      facePhoto: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAAA=',
      frontPhoto: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAAA=',
      backendPhoto: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAAA='
    };

    const kycResult = await kucoinService.submitKYC(uid, kycData, apiKeys);
    
    console.log('\n========================================');
    console.log('KYC SUBMISSION RESULT:');
    console.log('========================================');
    console.log(JSON.stringify(kycResult, null, 2));
    
    if (kycResult.code === '200000') {
      console.log('\n✅ KYC SUBMITTED SUCCESSFULLY!');
      console.log('Sub-account UID:', uid);
      console.log('API Key:', apiKeys.apiKey);
    } else {
      console.log('\n❌ KYC SUBMISSION FAILED');
      console.log('Error Code:', kycResult.code);
      console.log('Error Message:', kycResult.msg);
    }

  } catch (error) {
    console.error('\n❌ Error during KYC flow:', error.message);
    console.error('Stack:', error.stack);
  }
}

runKYCFlow();
