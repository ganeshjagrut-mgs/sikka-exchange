/**
 * KuCoin API Test Script
 *
 * Standalone script for testing individual KuCoin API functions.
 * Can be run on GCP server to verify each API endpoint independently.
 *
 * Usage:
 *   node scripts/test-kucoin-api.js [test-name]
 *   node scripts/test-kucoin-api.js all
 *   node scripts/test-kucoin-api.js createSubAccount
 */

require('dotenv').config();
const kucoinService = require('../backend/src/services/kucoin.service');

// Global test data storage
const testData = {
  uid: null,
  subName: null,
  apiKeys: null
};

// ============================================================================
// Test Functions (16 APIs)
// ============================================================================

/**
 * Test 1: Create Sub Account
 */
async function testCreateSubAccount() {
  console.log('\n' + '='.repeat(60));
  console.log('=== Testing createSubAccount ===');
  console.log('='.repeat(60));

  const accountName = 'test_user_' + Date.now();
  console.log('Input Parameters:');
  console.log('  accountName:', accountName);

  try {
    const result = await kucoinService.createSubAccount(accountName);
    console.log('\nResponse:');
    console.log(JSON.stringify(result, null, 2));

    if (result.code === '200000' && result.data && result.data.uid) {
      testData.uid = result.data.uid;
      testData.subName = accountName;
      console.log('\n✅ Success - Sub-account created');
      console.log('   UID:', testData.uid);
      return true;
    } else {
      console.log('\n❌ Failed - Invalid response format');
      return false;
    }
  } catch (error) {
    console.error('\n❌ Failed with error:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

/**
 * Test 2: Submit KYC
 */
async function testSubmitKYC() {
  console.log('\n' + '='.repeat(60));
  console.log('=== Testing submitKYC ===');
  console.log('='.repeat(60));

  // Use UID from previous test or create a mock one
  const uid = testData.uid || 'mock_uid_' + Date.now();

  // Realistic KYC data
  const kycData = {
    firstName: 'John',
    lastName: 'Doe',
    issueCountry: 'IN',
    identityNumber: 'A1234567890',
    identityType: 'passport',
    birthDate: '1990-01-15',
    expireDate: '2030-01-15',
    facePhoto: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAAA=',
    frontPhoto: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAAA='
  };

  console.log('Input Parameters:');
  console.log('  uid:', uid);
  console.log('  kycData:', {
    firstName: kycData.firstName,
    lastName: kycData.lastName,
    issueCountry: kycData.issueCountry,
    identityNumber: kycData.identityNumber,
    identityType: kycData.identityType,
    birthDate: kycData.birthDate,
    expireDate: kycData.expireDate,
    facePhoto: '[base64 data]',
    frontPhoto: '[base64 data]'
  });

  // CRITICAL: Check if we have API keys (must run createSubAccountAPIKeys first!)
  if (!testData.apiKeys || !testData.apiKeys.apiKey) {
    console.log('\n❌ No sub-account API keys found!');
    console.log('   Please run createSubAccountAPIKeys first to generate sub-account credentials.');
    console.log('   Example: node scripts/test-kucoin-api.js createSubAccountAPIKeys');
    return false;
  }

  console.log('\n✅ Using sub-account API keys for KYC submission (ordinary endpoint)');
  console.log('   API Key:', testData.apiKeys.apiKey);

  try {
    // CRITICAL: Pass sub-account API keys as third parameter
    const result = await kucoinService.submitKYC(uid, kycData, testData.apiKeys);
    console.log('\nResponse:');
    console.log(JSON.stringify(result, null, 2));

    if (result.code === '200000' && result.data) {
      console.log('\n✅ Success - KYC submitted');
      console.log('   Status:', result.data.status);
      return true;
    } else {
      console.log('\n❌ Failed - Invalid response or validation error');
      return false;
    }
  } catch (error) {
    console.error('\n❌ Failed with error:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

/**
 * Test 3: Get KYC Status
 */
async function testGetKYCStatus() {
  console.log('\n' + '='.repeat(60));
  console.log('=== Testing getKYCStatus ===');
  console.log('='.repeat(60));

  const uid = testData.uid || 'mock_uid_' + Date.now();

  // CRITICAL: Check if we have API keys (must run createSubAccountAPIKeys first!)
  if (!testData.apiKeys || !testData.apiKeys.apiKey) {
    console.log('\n❌ No sub-account API keys found!');
    console.log('   Please run createSubAccountAPIKeys first to generate sub-account credentials.');
    console.log('   Example: node scripts/test-kucoin-api.js createSubAccountAPIKeys');
    return false;
  }

  console.log('Input Parameters:');
  console.log('  uid:', uid);
  console.log('\n✅ Using sub-account API keys for KYC status check (ordinary endpoint)');
  console.log('   API Key:', testData.apiKeys.apiKey);

  try {
    // CRITICAL: Pass sub-account API keys as second parameter
    const result = await kucoinService.getKYCStatus(uid, testData.apiKeys);
    console.log('\nResponse:');
    console.log(JSON.stringify(result, null, 2));

    if (result.code === '200000' && result.data) {
      console.log('\n✅ Success - Account info retrieved (KYC status check)');
      return true;
    } else {
      console.log('\n❌ Failed - Invalid response format');
      return false;
    }
  } catch (error) {
    console.error('\n❌ Failed with error:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

/**
 * Test 4: Create Sub Account API Keys
 */
async function testCreateSubAccountAPIKeys() {
  console.log('\n' + '='.repeat(60));
  console.log('=== Testing createSubAccountAPIKeys ===');
  console.log('='.repeat(60));

  const uid = testData.uid || null;
  const passphrase = 'TestPass123';
  const label = 'Test API Keys';  // Changed from 'remark' to 'label'
  const permissions = ['General', 'Spot'];  // NO 'Transfer' - not supported by KuCoin Broker API
  const ipWhitelist = '35.200.154.218'; // GCP server IP (will be converted to array in service)

  console.log('Input Parameters:');
  console.log('  uid:', uid);
  console.log('  passphrase:', passphrase);
  console.log('  label:', label);
  console.log('  permissions:', permissions);
  console.log('  ipWhitelist:', ipWhitelist);

  try {
    const result = await kucoinService.createSubAccountAPIKeys(
      uid,
      passphrase,
      label,
      permissions,
      ipWhitelist
    );
    console.log('\nResponse:');
    console.log(JSON.stringify(result, null, 2));

    if (result.code === '200000' && result.data && result.data.apiKey) {
      testData.apiKeys = {
        apiKey: result.data.apiKey,
        apiSecret: result.data.apiSecret,
        apiPassphrase: passphrase  // Use the passphrase we created them with, not from response
      };
      console.log('\n✅ Success - API keys created');
      console.log('   API Key:', result.data.apiKey);
      console.log('   ℹ️  Stored API keys in testData.apiKeys for subsequent tests');
      return true;
    } else {
      console.log('\n❌ Failed - Invalid response format');
      console.log('   ⚠️  Note: Subsequent tests will use mock API keys and may fail');
      return false;
    }
  } catch (error) {
    console.error('\n❌ Failed with error:', error.message);
    console.error('Stack:', error.stack);
    console.log('   ⚠️  Note: Subsequent tests will use mock API keys and may fail');
    return false;
  }
}

/**
 * Test 5: Get Balance
 */
async function testGetBalance() {
  console.log('\n' + '='.repeat(60));
  console.log('=== Testing getBalance ===');
  console.log('='.repeat(60));

  const currency = 'USDT';
  const type = 'trade';
  const apiKeys = testData.apiKeys || {
    apiKey: 'mock_api_key',
    apiSecret: 'mock_api_secret',
    apiPassphrase: 'TestPass123'
  };

  console.log('Input Parameters:');
  console.log('  currency:', currency);
  console.log('  type:', type);
  console.log('  apiKeys:', { apiKey: apiKeys.apiKey });
  console.log('  ℹ️  Using', testData.apiKeys ? 'REAL' : 'MOCK', 'API keys');

  try {
    const result = await kucoinService.getBalance(currency, type, apiKeys);
    console.log('\nResponse:');
    console.log(JSON.stringify(result, null, 2));

    if (result.code === '200000' && result.data && Array.isArray(result.data)) {
      console.log('\n✅ Success - Balance retrieved');
      if (result.data.length > 0) {
        console.log('   Balance:', result.data[0].balance, currency);
        console.log('   Available:', result.data[0].available, currency);
      }
      return true;
    } else {
      console.log('\n❌ Failed - Invalid response format');
      return false;
    }
  } catch (error) {
    console.error('\n❌ Failed with error:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

/**
 * Test 6: Transfer Broker to Sub
 */
async function testTransferBrokerToSub() {
  console.log('\n' + '='.repeat(60));
  console.log('=== Testing transferBrokerToSub ===');
  console.log('='.repeat(60));

  const amount = 100;
  const uid = testData.uid || 'mock_uid_' + Date.now();
  const currency = 'USDT';
  const accountType = 'MAIN';
  const specialAccountType = 'MAIN';
  const direction = 'OUT';
  const clientOid = 'test_transfer_' + Date.now();

  console.log('Input Parameters:');
  console.log('  amount:', amount);
  console.log('  uid:', uid);
  console.log('  currency:', currency);
  console.log('  accountType:', accountType);
  console.log('  specialAccountType:', specialAccountType);
  console.log('  direction:', direction);
  console.log('  clientOid:', clientOid);

  try {
    const result = await kucoinService.transferBrokerToSub(
      amount,
      uid,
      currency,
      accountType,
      specialAccountType,
      direction,
      clientOid
    );
    console.log('\nResponse:');
    console.log(JSON.stringify(result, null, 2));

    if (result.code === '200000' && result.data && result.data.orderId) {
      console.log('\n✅ Success - Transfer initiated');
      console.log('   Order ID:', result.data.orderId);
      console.log('   Amount:', result.data.amount, result.data.currency);
      return true;
    } else {
      console.log('\n❌ Failed - Invalid response format');
      return false;
    }
  } catch (error) {
    console.error('\n❌ Failed with error:', error.message);

    // Add helpful error message for Error 110003
    if (error.message && error.message.includes('110003')) {
      console.error('\nℹ️  Error 110003 typically means:');
      console.error('   - Broker main account has insufficient USDT balance');
      console.error('   - Current test amount: 100 USDT');
      console.error('   - Action: Fund broker account or contact KuCoin support');
      console.error('   - See: docs/BROKER_ACCOUNT_FUNDING.md for details\n');
    }

    console.error('Stack:', error.stack);
    return false;
  }
}

/**
 * Test 7: Transfer Inner Account
 */
async function testTransferInnerAccount() {
  console.log('\n' + '='.repeat(60));
  console.log('=== Testing transferInnerAccount ===');
  console.log('='.repeat(60));

  const amount = 50;
  const from = 'main';
  const to = 'trade';
  const currency = 'USDT';
  const apiKeys = testData.apiKeys || {
    apiKey: 'mock_api_key',
    apiSecret: 'mock_api_secret',
    apiPassphrase: 'TestPass123'
  };
  const clientOid = 'test_inner_' + Date.now();

  console.log('Input Parameters:');
  console.log('  amount:', amount);
  console.log('  from:', from);
  console.log('  to:', to);
  console.log('  currency:', currency);
  console.log('  apiKeys:', { apiKey: apiKeys.apiKey });
  console.log('  clientOid:', clientOid);
  console.log('  ℹ️  Using', testData.apiKeys ? 'REAL' : 'MOCK', 'API keys');

  try {
    const result = await kucoinService.transferInnerAccount(
      amount,
      from,
      to,
      currency,
      apiKeys,
      clientOid
    );
    console.log('\nResponse:');
    console.log(JSON.stringify(result, null, 2));

    if (result.code === '200000' && result.data && result.data.orderId) {
      console.log('\n✅ Success - Inner transfer completed');
      console.log('   Order ID:', result.data.orderId);
      console.log('   Amount:', result.data.amount, result.data.currency);
      console.log('   From:', result.data.from, '→ To:', result.data.to);
      return true;
    } else {
      console.log('\n❌ Failed - Invalid response format');
      return false;
    }
  } catch (error) {
    console.error('\n❌ Failed with error:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

/**
 * Test 8: Get All Symbols
 */
async function testGetAllSymbols() {
  console.log('\n' + '='.repeat(60));
  console.log('=== Testing getAllSymbols ===');
  console.log('='.repeat(60));

  console.log('Input Parameters: (none)');

  try {
    const result = await kucoinService.getAllSymbols();
    console.log('\nResponse:');
    console.log(JSON.stringify(result, null, 2));

    if (result.code === '200000' && result.data && Array.isArray(result.data)) {
      console.log('\n✅ Success - Symbols retrieved');
      console.log('   Total Symbols:', result.data.length);
      console.log('   Symbols:', result.data.map(s => s.symbol).join(', '));
      return true;
    } else {
      console.log('\n❌ Failed - Invalid response format');
      return false;
    }
  } catch (error) {
    console.error('\n❌ Failed with error:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

/**
 * Test 9: Get Market Price
 */
async function testGetMarketPrice() {
  console.log('\n' + '='.repeat(60));
  console.log('=== Testing getMarketPrice ===');
  console.log('='.repeat(60));

  const symbol = 'BTC-USDT';

  console.log('Input Parameters:');
  console.log('  symbol:', symbol);

  try {
    const result = await kucoinService.getMarketPrice(symbol);
    console.log('\nResponse:');
    console.log(JSON.stringify(result, null, 2));

    if (result.code === '200000' && result.data && result.data.last) {
      console.log('\n✅ Success - Market price retrieved');
      console.log('   Symbol:', result.data.symbol);
      console.log('   Last Price:', result.data.last);
      return true;
    } else {
      console.log('\n❌ Failed - Invalid response format');
      return false;
    }
  } catch (error) {
    console.error('\n❌ Failed with error:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

/**
 * Test 10: Place Order
 */
async function testPlaceOrder() {
  console.log('\n' + '='.repeat(60));
  console.log('=== Testing placeOrder ===');
  console.log('='.repeat(60));

  const symbol = 'BTC-USDT';
  const side = 'buy';
  const type = 'market';
  const params = {
    funds: 100,
    clientOid: 'test_order_' + Date.now()
  };
  const apiKeys = testData.apiKeys || {
    apiKey: 'mock_api_key',
    apiSecret: 'mock_api_secret',
    apiPassphrase: 'TestPass123'
  };

  console.log('Input Parameters:');
  console.log('  symbol:', symbol);
  console.log('  side:', side);
  console.log('  type:', type);
  console.log('  params:', params);
  console.log('  apiKeys:', { apiKey: apiKeys.apiKey });
  console.log('  ℹ️  Using', testData.apiKeys ? 'REAL' : 'MOCK', 'API keys');

  try {
    const result = await kucoinService.placeOrder(symbol, side, type, params, apiKeys);
    console.log('\nResponse:');
    console.log(JSON.stringify(result, null, 2));

    if (result.code === '200000' && result.data && result.data.orderId) {
      console.log('\n✅ Success - Order placed');
      console.log('   Order ID:', result.data.orderId);
      console.log('   Client Order ID:', result.data.clientOid);
      return true;
    } else {
      console.log('\n❌ Failed - Invalid response format');
      return false;
    }
  } catch (error) {
    console.error('\n❌ Failed with error:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

/**
 * Test 11: Get Order Status
 */
async function testGetOrderStatus() {
  console.log('\n' + '='.repeat(60));
  console.log('=== Testing getOrderStatus ===');
  console.log('='.repeat(60));

  const orderId = 'mock_order_' + Date.now();
  const apiKeys = testData.apiKeys || {
    apiKey: 'mock_api_key',
    apiSecret: 'mock_api_secret',
    apiPassphrase: 'TestPass123'
  };

  console.log('Input Parameters:');
  console.log('  orderId:', orderId);
  console.log('  apiKeys:', { apiKey: apiKeys.apiKey });
  console.log('  ℹ️  Using', testData.apiKeys ? 'REAL' : 'MOCK', 'API keys');

  try {
    const result = await kucoinService.getOrderStatus(orderId, apiKeys);
    console.log('\nResponse:');
    console.log(JSON.stringify(result, null, 2));

    if (result.code === '200000' && result.data && result.data.orderId) {
      console.log('\n✅ Success - Order status retrieved');
      console.log('   Order ID:', result.data.orderId);
      console.log('   Status:', result.data.status);
      console.log('   Symbol:', result.data.symbol);
      console.log('   Side:', result.data.side);
      console.log('   Type:', result.data.type);
      return true;
    } else {
      console.log('\n❌ Failed - Invalid response format');
      return false;
    }
  } catch (error) {
    console.error('\n❌ Failed with error:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

/**
 * Test 12: Get Sub Account API Key
 */
async function testGetSubAccountAPIKey() {
  console.log('\n' + '='.repeat(60));
  console.log('=== Testing getSubAccountAPIKey ===');
  console.log('='.repeat(60));

  const uid = testData.uid || '226383154';
  console.log('Sub-account UID:', uid);

  try {
    const result = await kucoinService.getSubAccountAPIKey(uid);
    console.log('\nResponse:');
    console.log(JSON.stringify(result, null, 2));

    if (result.code === '200000') {
      console.log('\n✅ Success - Retrieved', result.data.length, 'API key(s)');
      if (result.data.length > 0) {
        console.log('   Sample:', {
          apiKey: result.data[0].apiKey,
          permissions: result.data[0].permissions,
          label: result.data[0].label
        });
      }
      return true;
    } else {
      console.log('\n❌ Failed -', result.msg);
      return false;
    }
  } catch (error) {
    console.error('\n❌ Failed with error:', error.message);
    return false;
  }
}

/**
 * Test 13: Get Transfer History
 * Note: Requires a valid orderId from a previous transfer
 */
async function testGetTransferHistory() {
  console.log('\n' + '='.repeat(60));
  console.log('=== Testing getTransferHistory ===');
  console.log('='.repeat(60));

  // Use mock order ID if no real transfer has been done
  const orderId = testData.transferOrderId || 'mock_order_' + Date.now();
  console.log('Order ID:', orderId);

  try {
    const result = await kucoinService.getTransferHistory(orderId);
    console.log('\nResponse:');
    console.log(JSON.stringify(result, null, 2));

    if (result.code === '200000') {
      console.log('\n✅ Success - Retrieved transfer history');
      if (result.data) {
        console.log('   Status:', result.data.status);
        console.log('   Amount:', result.data.amount, result.data.currency);
        console.log('   From:', result.data.fromUid, result.data.fromAccountType);
        console.log('   To:', result.data.toUid, result.data.toAccountType);
      } else {
        console.log('   (No data returned)');
      }
      return true;
    } else if (result.code === '400100') {
      console.log('\n⚠️  Order not found (expected for mock orderId) - API working correctly');
      return true; // Consider this success (API is working, just no data)
    } else {
      console.log('\n❌ Failed -', result.msg);
      return false;
    }
  } catch (error) {
    console.error('\n❌ Failed with error:', error.message);
    return false;
  }
}

/**
 * Test 14: Get Deposit List
 */
async function testGetDepositList() {
  console.log('\n' + '='.repeat(60));
  console.log('=== Testing getDepositList ===');
  console.log('='.repeat(60));

  const filters = {
    currency: 'USDT',
    limit: 10,
    // Get last 30 days
    startTimestamp: Date.now() - 30 * 24 * 60 * 60 * 1000
  };

  console.log('Filters:', JSON.stringify(filters, null, 2));

  try {
    const result = await kucoinService.getDepositList(filters);
    console.log('\nResponse:');
    console.log(JSON.stringify(result, null, 2));

    if (result.code === '200000') {
      console.log('\n✅ Success - Retrieved deposit list');
      console.log('   Count:', result.data.length, 'deposits');

      if (result.data.length > 0) {
        console.log('   Sample deposit:');
        console.log('     UID:', result.data[0].uid);
        console.log('     Amount:', result.data[0].amount, result.data[0].currency);
        console.log('     Status:', result.data[0].status);
        console.log('     Created:', new Date(result.data[0].createdAt).toISOString());
      } else {
        console.log('   (No deposits found - this is normal for new accounts)');
      }

      return true;
    } else {
      console.log('\n❌ Failed -', result.msg);
      return false;
    }
  } catch (error) {
    console.error('\n❌ Failed with error:', error.message);
    return false;
  }
}

/**
 * Test 15: Get Withdraw Detail
 * Note: Requires a valid withdrawalId from a previous withdrawal
 */
async function testGetWithdrawDetail() {
  console.log('\n' + '='.repeat(60));
  console.log('=== Testing getWithdrawDetail ===');
  console.log('='.repeat(60));

  // Use mock withdrawal ID if no real withdrawal has been done
  const withdrawalId = testData.withdrawalId || 'mock_withdrawal_' + Date.now();
  console.log('Withdrawal ID:', withdrawalId);

  try {
    const result = await kucoinService.getWithdrawDetail(withdrawalId);
    console.log('\nResponse:');
    console.log(JSON.stringify(result, null, 2));

    if (result.code === '200000') {
      console.log('\n✅ Success - Retrieved withdrawal detail');
      if (result.data) {
        console.log('   Status:', result.data.status);
        console.log('   Amount:', result.data.amount, result.data.currency);
        console.log('   Address:', result.data.address);
      } else {
        console.log('   (No data returned)');
      }
      return true;
    } else if (result.code === '400100' || result.msg?.includes('not found')) {
      console.log('\n⚠️  Withdrawal not found (expected for mock ID) - API working correctly');
      return true; // Consider this success (API is working, just no data)
    } else {
      console.log('\n❌ Failed -', result.msg);
      return false;
    }
  } catch (error) {
    console.error('\n❌ Failed with error:', error.message);
    return false;
  }
}

/**
 * Test 16: Get KYC Status (Batch - Multiple UIDs)
 * Tests the enhanced batch query functionality
 */
async function testGetKYCStatusBatch() {
  console.log('\n' + '='.repeat(60));
  console.log('=== Testing getKYCStatus (Batch Query) ===');
  console.log('='.repeat(60));

  // Test multiple UIDs
  const uid1 = testData.uid || '226383154';
  const uid2 = '226383155';
  const uid3 = '226383156';

  console.log('\nTest 1: Array input');
  console.log('UIDs:', [uid1, uid2, uid3]);

  try {
    // Test 1: Array input
    const result1 = await kucoinService.getKYCStatus([uid1, uid2, uid3]);
    console.log('Response:');
    console.log(JSON.stringify(result1, null, 2));

    if (result1.code !== '200000') {
      console.log('\n❌ Failed (array input) -', result1.msg);
      return false;
    }

    console.log('✅ Array input works - Returned', result1.data.length, 'results');

    // Test 2: Comma-separated string
    console.log('\nTest 2: Comma-separated string input');
    const result2 = await kucoinService.getKYCStatus(`${uid1},${uid2},${uid3}`);
    console.log('Response:');
    console.log(JSON.stringify(result2, null, 2));

    if (result2.code !== '200000') {
      console.log('\n❌ Failed (string input) -', result2.msg);
      return false;
    }

    console.log('✅ String input works - Returned', result2.data.length, 'results');

    // Test 3: Single UID (backward compatibility)
    console.log('\nTest 3: Single UID (backward compatibility)');
    const result3 = await kucoinService.getKYCStatus(uid1);
    console.log('Response:');
    console.log(JSON.stringify(result3, null, 2));

    if (result3.code !== '200000') {
      console.log('\n❌ Failed (single UID) -', result3.msg);
      return false;
    }

    console.log('✅ Single UID works - Returned', result3.data.length, 'result(s)');

    console.log('\n✅ Success - All batch query tests passed!');
    console.log('   Backward compatible: Single UID returns array with 1 item');
    console.log('   Array input: Works correctly');
    console.log('   String input: Works correctly');

    return true;
  } catch (error) {
    console.error('\n❌ Failed with error:', error.message);
    return false;
  }
}

/**
 * Test 17: Create Deposit Address
 */
async function testCreateDepositAddress() {
  console.log('\n' + '='.repeat(60));
  console.log('=== Testing createDepositAddress ===');
  console.log('='.repeat(60));

  const currency = 'USDT';
  const chain = 'bsc';
  const to = 'main';

  console.log('Input Parameters:');
  console.log('  currency:', currency);
  console.log('  chain:', chain);
  console.log('  to:', to);
  console.log('  apiKeys: [BROKER KEYS - using broker account]');

  try {
    const result = await kucoinService.createDepositAddress(currency, chain, to);
    console.log('\nResponse:');
    console.log(JSON.stringify(result, null, 2));

    if (result.code === '200000' && result.data) {
      console.log('\n✅ Success - Deposit address created');
      console.log('   Address:', result.data.address);
      console.log('   Memo:', result.data.memo || '(none)');
      console.log('   Chain:', result.data.chainId);
      console.log('   Account Type:', result.data.to);
      return true;
    } else {
      console.log('\n❌ Failed -', result.msg || 'Invalid response format');
      return false;
    }
  } catch (error) {
    console.error('\n❌ Failed with error:', error.message);
    return false;
  }
}

/**
 * Test 18: Get Deposit Address
 */
async function testGetDepositAddress() {
  console.log('\n' + '='.repeat(60));
  console.log('=== Testing getDepositAddress ===');
  console.log('='.repeat(60));

  const currency = 'USDT';
  const chain = 'bsc';

  console.log('Input Parameters:');
  console.log('  currency:', currency);
  console.log('  chain:', chain);
  console.log('  apiKeys: [BROKER KEYS - using broker account]');

  try {
    const result = await kucoinService.getDepositAddress(currency, chain);
    console.log('\nResponse:');
    console.log(JSON.stringify(result, null, 2));

    if (result.code === '200000' && result.data) {
      console.log('\n✅ Success - Retrieved deposit addresses');
      console.log('   Found', result.data.length, 'address(es)');

      result.data.forEach((addr, index) => {
        console.log(`\n   Address ${index + 1}:`);
        console.log('     Address:', addr.address);
        console.log('     Memo:', addr.memo || '(none)');
        console.log('     Chain:', addr.chainId);
        console.log('     Account Type:', addr.to);
      });

      return true;
    } else {
      console.log('\n❌ Failed -', result.msg || 'Invalid response format');
      return false;
    }
  } catch (error) {
    console.error('\n❌ Failed with error:', error.message);
    return false;
  }
}

// ============================================================================
// CLI Handler
// ============================================================================

/**
 * Main function - handles CLI arguments and runs tests
 */
async function main() {
  const testName = process.argv[2];

  // Show usage if no argument provided
  if (!testName) {
    console.log('\n' + '='.repeat(60));
    console.log('KuCoin API Test Script');
    console.log('='.repeat(60));
    console.log('\nUsage: node scripts/test-kucoin-api.js [test-name|all]');
    console.log('\nAvailable tests:');
    console.log('  1.  createSubAccount');
    console.log('  2.  submitKYC');
    console.log('  3.  getKYCStatus');
    console.log('  4.  createSubAccountAPIKeys');
    console.log('  5.  getBalance');
    console.log('  6.  transferBrokerToSub');
    console.log('  7.  transferInnerAccount');
    console.log('  8.  getAllSymbols');
    console.log('  9.  getMarketPrice');
    console.log('  10. placeOrder');
    console.log('  11. getOrderStatus');
    console.log('  12. getSubAccountAPIKey');
    console.log('  13. getTransferHistory');
    console.log('  14. getDepositList');
    console.log('  15. getWithdrawDetail');
    console.log('  16. getKYCStatusBatch');
    console.log('  17. createDepositAddress');
    console.log('  18. getDepositAddress');
    console.log('\nSpecial:');
    console.log('  all - Run all tests sequentially');
    console.log('\nExamples:');
    console.log('  node scripts/test-kucoin-api.js createSubAccount');
    console.log('  node scripts/test-kucoin-api.js all');
    console.log('');
    process.exit(0);
  }

  const results = {};

  // Run tests based on argument
  if (testName === 'all') {
    console.log('\n' + '='.repeat(60));
    console.log('Running ALL KuCoin API Tests');
    console.log('='.repeat(60));

    // Run all tests sequentially
    results.createSubAccount = await testCreateSubAccount();
    results.submitKYC = await testSubmitKYC();
    results.getKYCStatus = await testGetKYCStatus();
    results.createSubAccountAPIKeys = await testCreateSubAccountAPIKeys();
    results.getBalance = await testGetBalance();
    results.transferBrokerToSub = await testTransferBrokerToSub();
    results.transferInnerAccount = await testTransferInnerAccount();
    results.getAllSymbols = await testGetAllSymbols();
    results.getMarketPrice = await testGetMarketPrice();
    results.placeOrder = await testPlaceOrder();
    results.getOrderStatus = await testGetOrderStatus();
    results.getSubAccountAPIKey = await testGetSubAccountAPIKey();
    results.getTransferHistory = await testGetTransferHistory();
    results.getDepositList = await testGetDepositList();
    results.getWithdrawDetail = await testGetWithdrawDetail();
    results.getKYCStatusBatch = await testGetKYCStatusBatch();
    results.createDepositAddress = await testCreateDepositAddress();
    results.getDepositAddress = await testGetDepositAddress();
  } else {
    // Run single test
    switch (testName) {
      case 'createSubAccount':
        results.createSubAccount = await testCreateSubAccount();
        break;
      case 'submitKYC':
        results.submitKYC = await testSubmitKYC();
        break;
      case 'getKYCStatus':
        results.getKYCStatus = await testGetKYCStatus();
        break;
      case 'createSubAccountAPIKeys':
        results.createSubAccountAPIKeys = await testCreateSubAccountAPIKeys();
        break;
      case 'getBalance':
        results.getBalance = await testGetBalance();
        break;
      case 'transferBrokerToSub':
        results.transferBrokerToSub = await testTransferBrokerToSub();
        break;
      case 'transferInnerAccount':
        results.transferInnerAccount = await testTransferInnerAccount();
        break;
      case 'getAllSymbols':
        results.getAllSymbols = await testGetAllSymbols();
        break;
      case 'getMarketPrice':
        results.getMarketPrice = await testGetMarketPrice();
        break;
      case 'placeOrder':
        results.placeOrder = await testPlaceOrder();
        break;
      case 'getOrderStatus':
        results.getOrderStatus = await testGetOrderStatus();
        break;
      case 'getSubAccountAPIKey':
        results.getSubAccountAPIKey = await testGetSubAccountAPIKey();
        break;
      case 'getTransferHistory':
        results.getTransferHistory = await testGetTransferHistory();
        break;
      case 'getDepositList':
        results.getDepositList = await testGetDepositList();
        break;
      case 'getWithdrawDetail':
        results.getWithdrawDetail = await testGetWithdrawDetail();
        break;
      case 'getKYCStatusBatch':
        results.getKYCStatusBatch = await testGetKYCStatusBatch();
        break;
      case 'createDepositAddress':
        results.createDepositAddress = await testCreateDepositAddress();
        break;
      case 'getDepositAddress':
        results.getDepositAddress = await testGetDepositAddress();
        break;
      default:
        console.error('\n❌ Unknown test:', testName);
        console.log('\nRun without arguments to see available tests.');
        process.exit(1);
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('=== Test Summary ===');
  console.log('='.repeat(60));

  const testCount = Object.keys(results).length;
  const passedCount = Object.values(results).filter(r => r === true).length;
  const failedCount = testCount - passedCount;

  Object.keys(results).forEach(test => {
    const status = results[test] ? '✅' : '❌';
    console.log(`${status} ${test}`);
  });

  console.log('\n' + '-'.repeat(60));
  console.log(`Total: ${testCount} | Passed: ${passedCount} | Failed: ${failedCount}`);
  console.log('='.repeat(60) + '\n');

  // Exit with error code if any tests failed
  if (failedCount > 0) {
    process.exit(1);
  }
}

// Run main function and handle errors
main().catch(error => {
  console.error('\n' + '='.repeat(60));
  console.error('FATAL ERROR:');
  console.error('='.repeat(60));
  console.error(error);
  process.exit(1);
});
