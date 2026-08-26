/**
 * Test New Broker APIs
 * Tests: getKYCStatus, getSubAccount, getSubAccountAPIKeys
 */

require('dotenv').config();
const kucoinService = require('../backend/src/services/kucoin.service');

async function testNewAPIs() {
  console.log('\n========================================');
  console.log('TESTING NEW BROKER APIs');
  console.log('========================================\n');

  // Use existing sub-account from previous tests
  const uid = '251495653'; // From last successful test

  try {
    // Test 1: Get Sub-Account
    console.log('Test 1: Get Sub-Account Details');
    console.log('UID:', uid);
    const subAccountResult = await kucoinService.getSubAccount(uid);
    console.log('Response:', JSON.stringify(subAccountResult, null, 2));
    
    if (subAccountResult.code === '200000') {
      console.log('✅ getSubAccount WORKING\n');
    } else {
      console.log('❌ getSubAccount FAILED:', subAccountResult.msg, '\n');
    }

    // Test 2: Get Sub-Account API Keys
    console.log('Test 2: Get Sub-Account API Keys');
    console.log('UID:', uid);
    const apiKeysResult = await kucoinService.getSubAccountAPIKeys(uid);
    console.log('Response:', JSON.stringify(apiKeysResult, null, 2));
    
    if (apiKeysResult.code === '200000') {
      console.log('✅ getSubAccountAPIKeys WORKING\n');
    } else {
      console.log('❌ getSubAccountAPIKeys FAILED:', apiKeysResult.msg, '\n');
    }

    // Test 3: Get KYC Status
    console.log('Test 3: Get KYC Status');
    console.log('UID:', uid);
    const kycStatusResult = await kucoinService.getKYCStatus(uid);
    console.log('Response:', JSON.stringify(kycStatusResult, null, 2));
    
    if (kycStatusResult.code === '200000') {
      console.log('✅ getKYCStatus WORKING');
      if (kycStatusResult.data) {
        console.log('KYC Status:', kycStatusResult.data.status || 'PENDING');
      }
    } else {
      console.log('❌ getKYCStatus FAILED:', kycStatusResult.msg);
    }

    console.log('\n========================================');
    console.log('TESTING COMPLETE');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ Error during testing:', error.message);
    console.error('Stack:', error.stack);
  }
}

testNewAPIs();
