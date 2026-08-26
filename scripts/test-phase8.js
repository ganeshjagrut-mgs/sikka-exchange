const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
let adminToken = null;
let testUserId = null;

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function test(testNumber, name, fn) {
  try {
    process.stdout.write(`\nTest ${testNumber}: ${name}... `);
    await fn();
    console.log(`${colors.green}PASS${colors.reset}`);
    return true;
  } catch (error) {
    console.log(`${colors.red}FAIL${colors.reset}`);
    console.error(`  ${colors.red}Error: ${error.message}${colors.reset}`);
    if (error.response?.data) {
      console.error(`  ${colors.red}Response: ${JSON.stringify(error.response.data, null, 2)}${colors.reset}`);
    }
    return false;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runTests() {
  const results = [];

  log('\n=================================================', 'blue');
  log('  Phase 8 Admin Panel Backend - Test Suite', 'blue');
  log('=================================================\n', 'blue');

  // Test 1: Admin Login (Prerequisite)
  results.push(await test(1, 'Admin Login', async () => {
    log('  POST /api/admin/login', 'yellow');
    log('  Body: {"username": "admin", "password": "changeme123"}', 'yellow');

    const response = await axios.post(`${BASE_URL}/api/admin/login`, {
      username: 'admin',
      password: 'changeme123'
    });

    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(response.data.success === true, 'Success should be true');
    assert(response.data.data.token, 'Token not found in response');
    assert(response.data.data.admin, 'Admin data not found in response');
    assert(response.data.data.admin.username === 'admin', 'Username mismatch');

    adminToken = response.data.data.token;
    log(`  Token received: ${adminToken.substring(0, 20)}...`, 'yellow');
  }));

  // Test 2: List All Users
  results.push(await test(2, 'List All Users', async () => {
    log('  GET /api/admin/users?page=1&limit=10', 'yellow');
    log('  Header: Authorization: Bearer {token}', 'yellow');

    const response = await axios.get(`${BASE_URL}/api/admin/users?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(response.data.success === true, 'Success should be true');
    assert(Array.isArray(response.data.data.users), 'Users should be an array');
    assert(typeof response.data.data.total === 'number', 'Total should be a number');
    assert(typeof response.data.data.page === 'number', 'Page should be a number');
    assert(typeof response.data.data.limit === 'number', 'Limit should be a number');

    if (response.data.data.users.length > 0) {
      testUserId = response.data.data.users[0].id;
      log(`  Found ${response.data.data.users.length} users, total: ${response.data.data.total}`, 'yellow');
      log(`  Using test user ID: ${testUserId}`, 'yellow');
    } else {
      log('  WARNING: No users found in database', 'yellow');
    }
  }));

  // Test 3: Get User Details
  results.push(await test(3, 'Get User Details', async () => {
    if (!testUserId) {
      throw new Error('No test user ID available (skipped)');
    }

    log(`  GET /api/admin/users/${testUserId}`, 'yellow');
    log('  Header: Authorization: Bearer {token}', 'yellow');

    const response = await axios.get(`${BASE_URL}/api/admin/users/${testUserId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(response.data.success === true, 'Success should be true');
    assert(response.data.data.user, 'User data not found');
    assert(response.data.data.user.id === testUserId, 'User ID mismatch');
    assert(response.data.data.user.phone, 'Phone not found');

    log(`  User: ${response.data.data.user.full_name || 'N/A'} (${response.data.data.user.phone})`, 'yellow');
    if (response.data.data.kyc) {
      log(`  KYC Status: ${response.data.data.kyc.status}`, 'yellow');
    }
  }));

  // Test 4: Get User Transactions
  results.push(await test(4, 'Get User Transactions', async () => {
    if (!testUserId) {
      throw new Error('No test user ID available (skipped)');
    }

    log(`  GET /api/admin/users/${testUserId}/transactions?type=all&limit=50`, 'yellow');
    log('  Header: Authorization: Bearer {token}', 'yellow');

    const response = await axios.get(`${BASE_URL}/api/admin/users/${testUserId}/transactions?type=all&limit=50`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(response.data.success === true, 'Success should be true');
    assert(Array.isArray(response.data.data), 'Transactions should be an array');

    // Count by type
    const deposits = response.data.data.filter(t => t.type === 'deposit').length;
    const withdrawals = response.data.data.filter(t => t.type === 'withdrawal').length;
    const trades = response.data.data.filter(t => t.type === 'trade').length;

    log(`  Deposits: ${deposits}, Withdrawals: ${withdrawals}, Trades: ${trades}`, 'yellow');
    log(`  Total transactions: ${response.data.data.length}`, 'yellow');
  }));

  // Test 5: Get Conversion Rate
  results.push(await test(5, 'Get Conversion Rate', async () => {
    log('  GET /api/admin/config/conversion-rate', 'yellow');
    log('  Header: Authorization: Bearer {token}', 'yellow');

    const response = await axios.get(`${BASE_URL}/api/admin/config/conversion-rate`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(response.data.success === true, 'Success should be true');
    assert(typeof response.data.data.rate === 'number', 'Rate should be a number');
    assert(response.data.data.last_updated_at, 'Last updated timestamp not found');

    log(`  Current rate: ${response.data.data.rate} INR/USDT`, 'yellow');
    log(`  Last updated: ${response.data.data.last_updated_at}`, 'yellow');
  }));

  // Test 6: Update Conversion Rate
  results.push(await test(6, 'Update Conversion Rate', async () => {
    log('  POST /api/admin/config/conversion-rate', 'yellow');
    log('  Body: {"rate": 86.75}', 'yellow');
    log('  Header: Authorization: Bearer {token}', 'yellow');

    const response = await axios.post(`${BASE_URL}/api/admin/config/conversion-rate`,
      { rate: 86.75 },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(response.data.success === true, 'Success should be true');
    assert(response.data.data.rate === 86.75, `Expected rate 86.75, got ${response.data.data.rate}`);

    log(`  Rate updated successfully to: ${response.data.data.rate}`, 'yellow');
  }));

  // Test 7: Verify Rate Update
  results.push(await test(7, 'Verify Rate Update', async () => {
    log('  GET /api/admin/config/conversion-rate (verify)', 'yellow');

    const response = await axios.get(`${BASE_URL}/api/admin/config/conversion-rate`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(response.data.success === true, 'Success should be true');
    assert(response.data.data.rate === 86.75, `Expected rate 86.75, got ${response.data.data.rate}`);

    log(`  Verified rate: ${response.data.data.rate} INR/USDT`, 'yellow');
  }));

  // Test 8: List All Tokens
  results.push(await test(8, 'List All Tokens', async () => {
    log('  GET /api/admin/config/tokens', 'yellow');
    log('  Header: Authorization: Bearer {token}', 'yellow');

    const response = await axios.get(`${BASE_URL}/api/admin/config/tokens`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(response.data.success === true, 'Success should be true');
    assert(Array.isArray(response.data.data), 'Tokens should be an array');
    assert(response.data.data.length === 4, `Expected 4 tokens, got ${response.data.data.length}`);

    const symbols = response.data.data.map(t => t.symbol);
    assert(symbols.includes('BTC'), 'BTC not found');
    assert(symbols.includes('ETH'), 'ETH not found');
    assert(symbols.includes('SOL'), 'SOL not found');
    assert(symbols.includes('XRP'), 'XRP not found');

    log(`  Found ${response.data.data.length} tokens: ${symbols.join(', ')}`, 'yellow');
  }));

  // Test 9: Update Token Config
  results.push(await test(9, 'Update Token Config', async () => {
    log('  PUT /api/admin/config/tokens/BTC', 'yellow');
    log('  Body: {"is_active": true, "quote_min_size": 150, "quote_max_size": 200000}', 'yellow');
    log('  Header: Authorization: Bearer {token}', 'yellow');

    const response = await axios.put(`${BASE_URL}/api/admin/config/tokens/BTC`,
      {
        is_active: true,
        quote_min_size: 150,
        quote_max_size: 200000
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(response.data.success === true, 'Success should be true');
    assert(response.data.data, 'Updated token data not found');
    assert(response.data.data.symbol === 'BTC', 'Token symbol mismatch');

    log(`  BTC config updated: min=${response.data.data.quote_min_size}, max=${response.data.data.quote_max_size}`, 'yellow');
  }));

  // Test 10: Verify Token Update
  results.push(await test(10, 'Verify Token Update', async () => {
    log('  GET /api/admin/config/tokens (verify)', 'yellow');

    const response = await axios.get(`${BASE_URL}/api/admin/config/tokens`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(response.data.success === true, 'Success should be true');

    const btc = response.data.data.find(t => t.symbol === 'BTC');
    assert(btc, 'BTC token not found');
    assert(parseFloat(btc.quote_min_size) === 150, `Expected min 150, got ${btc.quote_min_size}`);
    assert(parseFloat(btc.quote_max_size) === 200000, `Expected max 200000, got ${btc.quote_max_size}`);

    log(`  Verified BTC: min=${btc.quote_min_size}, max=${btc.quote_max_size}`, 'yellow');
  }));

  // Test 11: Get Dashboard Stats
  results.push(await test(11, 'Get Dashboard Stats', async () => {
    log('  GET /api/admin/stats/overview', 'yellow');
    log('  Header: Authorization: Bearer {token}', 'yellow');

    const response = await axios.get(`${BASE_URL}/api/admin/stats/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(response.data.success === true, 'Success should be true');

    // Check all required fields
    const stats = response.data.data;
    assert(typeof stats.totalUsers === 'number', 'totalUsers should be a number');
    assert(typeof stats.pendingKYC === 'number', 'pendingKYC should be a number');
    assert(typeof stats.approvedKYC === 'number', 'approvedKYC should be a number');
    assert(typeof stats.totalDeposits === 'number', 'totalDeposits should be a number');
    assert(typeof stats.totalWithdrawals === 'number', 'totalWithdrawals should be a number');
    assert(typeof stats.pendingWithdrawals === 'number', 'pendingWithdrawals should be a number');
    assert(typeof stats.totalTrades === 'number', 'totalTrades should be a number');
    assert(typeof stats.platformRevenue === 'number', 'platformRevenue should be a number');
    assert(typeof stats.conversionRate === 'number', 'conversionRate should be a number');

    log(`  Dashboard Stats:`, 'yellow');
    log(`    Users: ${stats.totalUsers} (Pending KYC: ${stats.pendingKYC}, Approved: ${stats.approvedKYC})`, 'yellow');
    log(`    Deposits: ₹${stats.totalDeposits} | Withdrawals: ₹${stats.totalWithdrawals} (Pending: ${stats.pendingWithdrawals})`, 'yellow');
    log(`    Trades: ${stats.totalTrades} | Revenue: ₹${stats.platformRevenue}`, 'yellow');
    log(`    Conversion Rate: ${stats.conversionRate} INR/USDT`, 'yellow');
  }));

  // Test 12: Test Validation - Invalid Rate
  results.push(await test(12, 'Test Validation - Invalid Rate', async () => {
    log('  POST /api/admin/config/conversion-rate', 'yellow');
    log('  Body: {"rate": -5} (negative, should fail)', 'yellow');

    try {
      await axios.post(`${BASE_URL}/api/admin/config/conversion-rate`,
        { rate: -5 },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      throw new Error('Expected 400 error for negative rate');
    } catch (error) {
      if (error.message === 'Expected 400 error for negative rate') {
        throw error;
      }
      assert(error.response?.status === 400, `Expected 400, got ${error.response?.status}`);
      log(`  Correctly rejected negative rate with 400 error`, 'yellow');
    }
  }));

  // Test 13: Test Validation - Invalid Token Update
  results.push(await test(13, 'Test Validation - Invalid Token Update', async () => {
    log('  PUT /api/admin/config/tokens/BTC', 'yellow');
    log('  Body: {"quote_min_size": 1000, "quote_max_size": 100} (min > max, should fail)', 'yellow');

    try {
      await axios.put(`${BASE_URL}/api/admin/config/tokens/BTC`,
        {
          quote_min_size: 1000,
          quote_max_size: 100
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      throw new Error('Expected 400 error for min > max');
    } catch (error) {
      if (error.message === 'Expected 400 error for min > max') {
        throw error;
      }
      assert(error.response?.status === 400, `Expected 400, got ${error.response?.status}`);
      log(`  Correctly rejected min > max with 400 error`, 'yellow');
    }
  }));

  // Test 14: Test Auth - No Token
  results.push(await test(14, 'Test Auth - No Token', async () => {
    log('  GET /api/admin/users', 'yellow');
    log('  No Authorization header', 'yellow');

    try {
      await axios.get(`${BASE_URL}/api/admin/users`);
      throw new Error('Expected 401 error for missing token');
    } catch (error) {
      if (error.message === 'Expected 401 error for missing token') {
        throw error;
      }
      assert(error.response?.status === 401, `Expected 401, got ${error.response?.status}`);
      log(`  Correctly rejected request without token (401)`, 'yellow');
    }
  }));

  // Test 15: Test Auth - Invalid Token
  results.push(await test(15, 'Test Auth - Invalid Token', async () => {
    log('  GET /api/admin/users', 'yellow');
    log('  Authorization: Bearer invalid_token', 'yellow');

    try {
      await axios.get(`${BASE_URL}/api/admin/users`, {
        headers: { Authorization: 'Bearer invalid_token' }
      });
      throw new Error('Expected 401 error for invalid token');
    } catch (error) {
      if (error.message === 'Expected 401 error for invalid token') {
        throw error;
      }
      assert(error.response?.status === 401, `Expected 401, got ${error.response?.status}`);
      log(`  Correctly rejected invalid token (401)`, 'yellow');
    }
  }));

  // Summary
  const passed = results.filter(r => r).length;
  const failed = results.filter(r => !r).length;

  log('\n=================================================', 'blue');
  log('  Test Summary', 'blue');
  log('=================================================', 'blue');
  log(`Total Tests: ${results.length}`, 'blue');
  log(`Passed: ${passed}`, passed === results.length ? 'green' : 'yellow');
  log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`, passed === results.length ? 'green' : 'yellow');
  log('=================================================\n', 'blue');

  process.exit(passed === results.length ? 0 : 1);
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});
