/**
 * KuCoin E2E Integration Test
 *
 * Tests the complete user journey from registration to withdrawal:
 * 1. Create Sub-Account
 * 2. Submit KYC
 * 3. Poll KYC Status until APPROVED
 * 4. Create API Keys for Sub-Account
 * 5. Admin Transfers USDT to Sub-Account (Broker → Sub)
 * 6. User Transfers USDT to Trade Account (Main → Trade)
 * 7. User Checks Balance (should see USDT in trade account)
 * 8. User Places Market Buy Order (BTC-USDT)
 * 9. Poll Order Status until FILLED
 * 10. User Checks Balance (should see BTC in trade account)
 * 11. Verify Final Balances
 *
 * Usage: node scripts/test-complete-flow.js
 */

require('dotenv').config();
const kucoinService = require('../backend/src/services/kucoin.service');

// ============================================================================
// Test Configuration
// ============================================================================

const TEST_CONFIG = {
  // Sub-account details
  accountName: 'e2e_test_' + Date.now(),

  // KYC data (realistic test data)
  kycData: {
    firstName: 'Test',
    lastName: 'User',
    issueCountry: 'US',
    identityNumber: 'T123456789',
    identityType: 'idcard',
    birthDate: '1990-01-01',
    expireDate: '2030-12-31',
    facePhoto: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    frontPhoto: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    backendPhoto: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  },

  // API key configuration
  apiKeyPassphrase: 'TestPass123',
  apiKeyRemark: 'E2E Test Keys',
  apiKeyPermissions: ['General', 'Spot'], // Array format, NO 'Transfer' - not supported

  // Trading configuration
  transferAmount: 100, // USDT to transfer to sub-account
  tradeAmount: 50, // USDT to use for BTC purchase
  symbol: 'BTC-USDT',

  // Polling configuration
  kycPollInterval: 5000, // Check every 5 seconds
  maxKycWaitTime: 60000, // 60 seconds max
  orderPollInterval: 2000, // Check every 2 seconds
  maxOrderWaitTime: 30000 // 30 seconds max
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Poll until condition is met or timeout
 *
 * @param {Function} checkFn - Async function that returns the value to check
 * @param {Function} condition - Function that takes result and returns true if condition met
 * @param {number} interval - Milliseconds between checks
 * @param {number} maxTime - Maximum time to wait in milliseconds
 * @returns {Object} {success: boolean, result: any, attempts: number, duration: number}
 */
async function pollUntil(checkFn, condition, interval, maxTime) {
  const startTime = Date.now();
  let attempts = 0;

  while (Date.now() - startTime < maxTime) {
    attempts++;
    console.log(`   ⏳ Polling attempt ${attempts}...`);

    const result = await checkFn();

    if (condition(result)) {
      const duration = Date.now() - startTime;
      return { success: true, result, attempts, duration };
    }

    // Wait before next attempt
    await sleep(interval);
  }

  const duration = Date.now() - startTime;
  return { success: false, attempts, duration };
}

/**
 * Format amount for display
 */
function formatAmount(amount, currency) {
  if (currency === 'BTC') {
    return `${parseFloat(amount).toFixed(8)} ${currency}`;
  }
  return `${parseFloat(amount).toFixed(2)} ${currency}`;
}

/**
 * Print step header
 */
function printStep(stepNumber, title) {
  console.log('\n============================================================');
  console.log(`=== Step ${stepNumber}: ${title} ===`);
  console.log('============================================================\n');
}

/**
 * Print success message
 */
function printSuccess(message) {
  console.log(`✅ ${message}`);
}

/**
 * Print error message
 */
function printError(message) {
  console.error(`❌ ${message}`);
}

/**
 * Print info message
 */
function printInfo(message) {
  console.log(`ℹ️  ${message}`);
}

/**
 * Check if KuCoin API response is success
 */
function isSuccess(response) {
  return response && response.code === '200000';
}

// ============================================================================
// Main Test Flow
// ============================================================================

async function runCompleteFlow() {
  console.log('\n');
  console.log('████████████████████████████████████████████████████████████');
  console.log('███                                                      ███');
  console.log('███       KuCoin E2E Integration Test                    ███');
  console.log('███                                                      ███');
  console.log('████████████████████████████████████████████████████████████');
  console.log('\n');
  console.log('This test will execute the complete user journey:');
  console.log('  1. Create Sub-Account');
  console.log('  2. Submit KYC');
  console.log('  3. Wait for KYC Approval');
  console.log('  4. Create API Keys');
  console.log('  5. Transfer USDT from Broker to Sub-Account');
  console.log('  6. Transfer USDT from Main to Trade Account');
  console.log('  7. Check USDT Balance');
  console.log('  8. Place Market Buy Order for BTC');
  console.log('  9. Wait for Order Fill');
  console.log(' 10. Check BTC Balance');
  console.log(' 11. Verify Final State');
  console.log('\n');

  // Track test data across steps
  const testData = {
    accountName: TEST_CONFIG.accountName,
    uid: null,
    apiKeys: null,
    orderId: null,
    initialUSDTBalance: null,
    finalBTCBalance: null
  };

  // Track timing
  const startTime = Date.now();

  try {
    // ========================================================================
    // Step 1: Create Sub-Account
    // ========================================================================
    printStep(1, 'Create Sub-Account');
    printInfo(`Account name: ${testData.accountName}`);

    const subAccountResult = await kucoinService.createSubAccount(testData.accountName);

    if (!isSuccess(subAccountResult)) {
      throw new Error(`Failed to create sub-account: ${subAccountResult.msg}`);
    }

    testData.uid = subAccountResult.data.uid;
    printSuccess(`Sub-account created successfully`);
    printInfo(`UID: ${testData.uid}`);

    // ========================================================================
    // Step 2: Submit KYC
    // ========================================================================
    printStep(2, 'Submit KYC');
    printInfo(`Submitting KYC for UID: ${testData.uid}`);
    printInfo(`Name: ${TEST_CONFIG.kycData.firstName} ${TEST_CONFIG.kycData.lastName}`);
    printInfo(`Country: ${TEST_CONFIG.kycData.issueCountry}`);
    printInfo(`DOB: ${TEST_CONFIG.kycData.birthDate}`);

    const kycResult = await kucoinService.submitKYC(testData.uid, TEST_CONFIG.kycData);

    if (!isSuccess(kycResult)) {
      throw new Error(`Failed to submit KYC: ${kycResult.msg}`);
    }

    printSuccess('KYC submitted successfully');

    // ========================================================================
    // Step 3: Poll KYC Status until APPROVED
    // ========================================================================
    printStep(3, 'Wait for KYC Approval');
    printInfo(`Polling interval: ${TEST_CONFIG.kycPollInterval / 1000}s`);
    printInfo(`Max wait time: ${TEST_CONFIG.maxKycWaitTime / 1000}s`);

    const kycPoll = await pollUntil(
      async () => {
        const statusResult = await kucoinService.getKYCStatus(testData.uid);
        if (isSuccess(statusResult)) {
          printInfo(`Current status: ${statusResult.data.status}`);
          return statusResult;
        }
        throw new Error(`Failed to get KYC status: ${statusResult.msg}`);
      },
      (result) => result.data.status === 'APPROVED',
      TEST_CONFIG.kycPollInterval,
      TEST_CONFIG.maxKycWaitTime
    );

    if (!kycPoll.success) {
      throw new Error(`KYC not approved within ${TEST_CONFIG.maxKycWaitTime / 1000}s timeout`);
    }

    printSuccess(`KYC approved after ${kycPoll.attempts} checks (${(kycPoll.duration / 1000).toFixed(1)}s)`);

    // ========================================================================
    // Step 4: Create API Keys for Sub-Account
    // ========================================================================
    printStep(4, 'Create API Keys');
    printInfo(`Passphrase: ${TEST_CONFIG.apiKeyPassphrase}`);
    printInfo(`Remark: ${TEST_CONFIG.apiKeyRemark}`);
    printInfo(`Permissions: ${TEST_CONFIG.apiKeyPermissions}`);
    printInfo(`IP Whitelist: 35.200.154.218 (GCP server)`);

    const apiKeysResult = await kucoinService.createSubAccountAPIKeys(
      testData.uid,
      TEST_CONFIG.apiKeyPassphrase,
      TEST_CONFIG.apiKeyRemark,
      TEST_CONFIG.apiKeyPermissions,
      '35.200.154.218' // GCP server IP
    );

    if (!isSuccess(apiKeysResult)) {
      throw new Error(`Failed to create API keys: ${apiKeysResult.msg}`);
    }

    testData.apiKeys = {
      apiKey: apiKeysResult.data.apiKey,
      apiSecret: apiKeysResult.data.apiSecret,
      apiPassphrase: TEST_CONFIG.apiKeyPassphrase
    };

    printSuccess('API keys created successfully');
    printInfo(`API Key: ${testData.apiKeys.apiKey}`);

    // ========================================================================
    // Step 5: Transfer USDT from Broker to Sub-Account
    // ========================================================================
    printStep(5, 'Transfer USDT (Broker → Sub-Account)');
    printInfo(`Amount: ${formatAmount(TEST_CONFIG.transferAmount, 'USDT')}`);
    printInfo(`Direction: OUT (broker to sub)`);
    printInfo(`Target UID: ${testData.uid}`);

    const transfer1Result = await kucoinService.transferBrokerToSub(
      TEST_CONFIG.transferAmount,
      testData.uid,
      'OUT'
    );

    if (!isSuccess(transfer1Result)) {
      throw new Error(`Failed to transfer to sub-account: ${transfer1Result.msg}`);
    }

    printSuccess(`Transferred ${formatAmount(TEST_CONFIG.transferAmount, 'USDT')} to sub-account`);
    printInfo(`Order ID: ${transfer1Result.data.orderId}`);

    // ========================================================================
    // Step 6: Transfer USDT from Main to Trade Account
    // ========================================================================
    printStep(6, 'Transfer USDT (Main → Trade Account)');
    printInfo(`Amount: ${formatAmount(TEST_CONFIG.transferAmount, 'USDT')}`);
    printInfo(`From: main account`);
    printInfo(`To: trade account`);

    const transfer2Result = await kucoinService.transferInnerAccount(
      TEST_CONFIG.transferAmount,
      'main',
      'trade',
      'USDT',
      testData.apiKeys
    );

    if (!isSuccess(transfer2Result)) {
      throw new Error(`Failed to transfer to trade account: ${transfer2Result.msg}`);
    }

    printSuccess(`Transferred ${formatAmount(TEST_CONFIG.transferAmount, 'USDT')} to trade account`);
    printInfo(`Order ID: ${transfer2Result.data.orderId}`);

    // ========================================================================
    // Step 7: Check USDT Balance in Trade Account
    // ========================================================================
    printStep(7, 'Check USDT Balance');
    printInfo('Fetching trade account balance...');

    const usdtBalanceResult = await kucoinService.getBalance('USDT', 'trade', testData.apiKeys);

    if (!isSuccess(usdtBalanceResult)) {
      throw new Error(`Failed to get USDT balance: ${usdtBalanceResult.msg}`);
    }

    if (!usdtBalanceResult.data || usdtBalanceResult.data.length === 0) {
      throw new Error('No USDT account found in trade account');
    }

    testData.initialUSDTBalance = usdtBalanceResult.data[0].balance;
    printSuccess(`USDT Balance: ${formatAmount(testData.initialUSDTBalance, 'USDT')}`);
    printInfo(`Available: ${formatAmount(usdtBalanceResult.data[0].available, 'USDT')}`);

    if (parseFloat(testData.initialUSDTBalance) < TEST_CONFIG.tradeAmount) {
      throw new Error(`Insufficient USDT balance for trade (need ${TEST_CONFIG.tradeAmount}, have ${testData.initialUSDTBalance})`);
    }

    // ========================================================================
    // Step 8: Place Market Buy Order for BTC
    // ========================================================================
    printStep(8, 'Place Market Buy Order');
    printInfo(`Symbol: ${TEST_CONFIG.symbol}`);
    printInfo(`Side: buy`);
    printInfo(`Type: market`);
    printInfo(`Funds: ${formatAmount(TEST_CONFIG.tradeAmount, 'USDT')}`);

    const orderResult = await kucoinService.placeOrder(
      TEST_CONFIG.symbol,
      'buy',
      'market',
      { funds: TEST_CONFIG.tradeAmount.toString() },
      testData.apiKeys
    );

    if (!isSuccess(orderResult)) {
      throw new Error(`Failed to place order: ${orderResult.msg}`);
    }

    testData.orderId = orderResult.data.orderId;
    printSuccess('Order placed successfully');
    printInfo(`Order ID: ${testData.orderId}`);

    // ========================================================================
    // Step 9: Poll Order Status until FILLED
    // ========================================================================
    printStep(9, 'Wait for Order Fill');
    printInfo(`Polling interval: ${TEST_CONFIG.orderPollInterval / 1000}s`);
    printInfo(`Max wait time: ${TEST_CONFIG.maxOrderWaitTime / 1000}s`);

    const orderPoll = await pollUntil(
      async () => {
        const statusResult = await kucoinService.getOrderStatus(testData.orderId, testData.apiKeys);
        if (isSuccess(statusResult)) {
          printInfo(`Order status: ${statusResult.data.isActive ? 'ACTIVE' : 'FILLED'}`);
          return statusResult;
        }
        throw new Error(`Failed to get order status: ${statusResult.msg}`);
      },
      (result) => result.data.isActive === false,
      TEST_CONFIG.orderPollInterval,
      TEST_CONFIG.maxOrderWaitTime
    );

    if (!orderPoll.success) {
      throw new Error(`Order not filled within ${TEST_CONFIG.maxOrderWaitTime / 1000}s timeout`);
    }

    const orderDetails = orderPoll.result.data;
    printSuccess(`Order filled after ${orderPoll.attempts} checks (${(orderPoll.duration / 1000).toFixed(1)}s)`);
    printInfo(`Deal size: ${orderDetails.dealSize || 'N/A'} BTC`);
    printInfo(`Deal funds: ${orderDetails.dealFunds || 'N/A'} USDT`);

    // ========================================================================
    // Step 10: Check BTC Balance in Trade Account
    // ========================================================================
    printStep(10, 'Check BTC Balance');
    printInfo('Fetching trade account balance...');

    const btcBalanceResult = await kucoinService.getBalance('BTC', 'trade', testData.apiKeys);

    if (!isSuccess(btcBalanceResult)) {
      throw new Error(`Failed to get BTC balance: ${btcBalanceResult.msg}`);
    }

    if (!btcBalanceResult.data || btcBalanceResult.data.length === 0) {
      throw new Error('No BTC account found in trade account');
    }

    testData.finalBTCBalance = btcBalanceResult.data[0].balance;
    printSuccess(`BTC Balance: ${formatAmount(testData.finalBTCBalance, 'BTC')}`);
    printInfo(`Available: ${formatAmount(btcBalanceResult.data[0].available, 'BTC')}`);

    if (parseFloat(testData.finalBTCBalance) <= 0) {
      throw new Error('BTC balance is zero after order fill');
    }

    // ========================================================================
    // Step 11: Verify Final State
    // ========================================================================
    printStep(11, 'Verify Final State');

    // Check final USDT balance
    const finalUSDTResult = await kucoinService.getBalance('USDT', 'trade', testData.apiKeys);
    if (!isSuccess(finalUSDTResult)) {
      throw new Error(`Failed to get final USDT balance: ${finalUSDTResult.msg}`);
    }

    const finalUSDTBalance = finalUSDTResult.data[0].balance;
    const usdtSpent = parseFloat(testData.initialUSDTBalance) - parseFloat(finalUSDTBalance);

    printInfo('Final Account State:');
    printInfo(`  USDT: ${formatAmount(finalUSDTBalance, 'USDT')} (spent: ${formatAmount(usdtSpent, 'USDT')})`);
    printInfo(`  BTC: ${formatAmount(testData.finalBTCBalance, 'BTC')}`);

    // Verify expected state
    if (usdtSpent < TEST_CONFIG.tradeAmount * 0.9 || usdtSpent > TEST_CONFIG.tradeAmount * 1.1) {
      printError(`⚠️  Warning: USDT spent (${usdtSpent}) differs significantly from expected (${TEST_CONFIG.tradeAmount})`);
    }

    if (parseFloat(testData.finalBTCBalance) <= 0) {
      throw new Error('Expected positive BTC balance');
    }

    printSuccess('Final state verified successfully');

    // ========================================================================
    // Test Complete!
    // ========================================================================
    const totalDuration = Date.now() - startTime;

    console.log('\n');
    console.log('████████████████████████████████████████████████████████████');
    console.log('███                                                      ███');
    console.log('███              ✅ E2E Test PASSED                      ███');
    console.log('███                                                      ███');
    console.log('████████████████████████████████████████████████████████████');
    console.log('\n');
    console.log('Test Summary:');
    console.log(`  Account Name: ${testData.accountName}`);
    console.log(`  UID: ${testData.uid}`);
    console.log(`  API Key: ${testData.apiKeys.apiKey}`);
    console.log(`  Order ID: ${testData.orderId}`);
    console.log(`  BTC Acquired: ${formatAmount(testData.finalBTCBalance, 'BTC')}`);
    console.log(`  USDT Spent: ${formatAmount(usdtSpent, 'USDT')}`);
    console.log(`  Total Duration: ${(totalDuration / 1000).toFixed(1)}s`);
    console.log('\n');

    process.exit(0);

  } catch (error) {
    // ========================================================================
    // Test Failed
    // ========================================================================
    const totalDuration = Date.now() - startTime;

    console.log('\n');
    console.log('████████████████████████████████████████████████████████████');
    console.log('███                                                      ███');
    console.log('███              ❌ E2E Test FAILED                      ███');
    console.log('███                                                      ███');
    console.log('████████████████████████████████████████████████████████████');
    console.log('\n');
    console.error('Error Details:');
    console.error(`  Message: ${error.message}`);
    console.error(`  Duration: ${(totalDuration / 1000).toFixed(1)}s`);
    console.error('\n');
    console.error('Test Data at Failure:');
    console.error(JSON.stringify(testData, null, 2));
    console.error('\n');
    console.error('Stack Trace:');
    console.error(error.stack);
    console.error('\n');

    // Troubleshooting hints
    console.log('Troubleshooting Hints:');
    console.log('  - Check .env file has all required KuCoin credentials');
    console.log('  - Verify KuCoin API is accessible (not rate limited)');
    console.log('  - Check broker account has sufficient USDT balance');
    console.log('  - Review logs above for specific API error codes');
    console.log('\n');

    process.exit(1);
  }
}

// ============================================================================
// Run the test
// ============================================================================

runCompleteFlow();
