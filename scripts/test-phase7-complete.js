/**
 * Phase 7 - Complete Withdrawal System Test
 * Tests all 20 steps: Bank accounts, withdrawals, and admin processing
 */

require('dotenv').config();
const admin = require('firebase-admin');
const axios = require('axios');
const { Pool } = require('pg');

// Environment configuration
const BACKEND_URL = 'http://localhost:3000';
const TEST_USER_FIREBASE_UID = 'WKfntY7Q7mZ3X29tu8PQlUYNoXo1'; // tradetest@example.com
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'changeme123';

// Test results tracking
const testResults = [];
let currentStep = 0;

// PostgreSQL connection
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'sikka_exchange',
  user: 'postgres',
  password: 'postgres123'
});

/**
 * Log test result
 */
function logTest(step, description, passed, details = {}) {
  currentStep++;
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Step ${currentStep}: ${description}`);
  console.log(`Status: ${status}`);

  if (details.request) {
    console.log(`\nRequest: ${details.request.method} ${details.request.url}`);
    if (details.request.body) {
      console.log(`Body:`, JSON.stringify(details.request.body, null, 2));
    }
  }

  if (details.response) {
    console.log(`\nResponse (${details.response.status}):`, JSON.stringify(details.response.data, null, 2));
  }

  if (details.verification) {
    console.log(`\nVerification:`, details.verification);
  }

  if (details.error) {
    console.log(`\nError:`, details.error);
  }

  testResults.push({ step: currentStep, description, passed, details });
}

/**
 * Initialize Firebase Admin SDK
 */
async function initFirebase() {
  try {
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        })
      });
    }
    console.log('✅ Firebase Admin SDK initialized');
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
    process.exit(1);
  }
}

/**
 * Generate Firebase ID token for testing
 * Creates a custom token that the backend can verify
 */
async function getFirebaseToken(uid) {
  try {
    // For backend testing, we create a custom token with claims
    // The backend's verifyFirebaseToken will accept this
    const customToken = await admin.auth().createCustomToken(uid, {
      uid: uid
    });

    // For direct API testing, we can also generate a session cookie
    // But the easiest approach is to make the backend accept custom tokens
    // OR we can exchange it for an ID token using Firebase REST API

    // Let's exchange custom token for ID token
    const API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`,
      {
        token: customToken,
        returnSecureToken: true
      }
    );

    return response.data.idToken;
  } catch (error) {
    console.error('Failed to create Firebase token:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Main test execution
 */
async function runTests() {
  let firebaseToken, adminToken;
  let userId;
  let bankAccountId1, bankAccountId2;
  let withdrawalId1, withdrawalId2, withdrawalId3;

  try {
    console.log('\n' + '='.repeat(80));
    console.log('PHASE 7 - COMPLETE WITHDRAWAL SYSTEM TEST');
    console.log('='.repeat(80));

    // Initialize Firebase
    await initFirebase();

    // ========================================================================
    // PART 1: SETUP & PREREQUISITES (Steps 1-5)
    // ========================================================================

    console.log('\n' + '='.repeat(80));
    console.log('PART 0: CLEANUP FROM PREVIOUS RUNS');
    console.log('='.repeat(80));

    // Clean up existing bank accounts and withdrawals for test user
    try {
      await pool.query('DELETE FROM withdrawals WHERE user_id = (SELECT id FROM users WHERE firebase_uid = $1)', [TEST_USER_FIREBASE_UID]);
      await pool.query('DELETE FROM bank_accounts WHERE user_id = (SELECT id FROM users WHERE firebase_uid = $1)', [TEST_USER_FIREBASE_UID]);
      console.log('✅ Cleaned up existing bank accounts and withdrawals');
    } catch (error) {
      console.log('⚠️  Cleanup failed (might be first run):', error.message);
    }

    console.log('\n' + '='.repeat(80));
    console.log('PART 1: SETUP & PREREQUISITES');
    console.log('='.repeat(80));

    // Step 1: Get existing test user
    try {
      const userResult = await pool.query(
        'SELECT id, email, phone, firebase_uid, kyc_status FROM users WHERE firebase_uid = $1',
        [TEST_USER_FIREBASE_UID]
      );

      const user = userResult.rows[0];
      userId = user.id;

      logTest(1, 'Get existing test user', true, {
        verification: {
          userId: user.id,
          email: user.email,
          phone: user.phone,
          firebase_uid: user.firebase_uid,
          kyc_status: user.kyc_status
        }
      });
    } catch (error) {
      logTest(1, 'Get existing test user', false, { error: error.message });
      throw error;
    }

    // Step 2: Get Firebase test token
    try {
      firebaseToken = await getFirebaseToken(TEST_USER_FIREBASE_UID);
      logTest(2, 'Get Firebase test token', true, {
        verification: { tokenLength: firebaseToken.length }
      });
    } catch (error) {
      logTest(2, 'Get Firebase test token', false, { error: error.message });
      throw error;
    }

    // Step 3: Verify KYC status
    try {
      const kycResult = await pool.query(
        'SELECT kyc_status FROM users WHERE id = $1',
        [userId]
      );

      const kycStatus = kycResult.rows[0].kyc_status;
      const passed = kycStatus === 'approved';

      logTest(3, 'Verify KYC status', passed, {
        verification: { kyc_status: kycStatus, expected: 'approved' }
      });

      if (!passed) {
        console.log('❌ KYC not approved. Please approve KYC for test user first.');
        throw new Error('KYC not approved');
      }
    } catch (error) {
      logTest(3, 'Verify KYC status', false, { error: error.message });
      throw error;
    }

    // Step 4: Ensure user has USDT balance
    try {
      const response = await axios.get(`${BACKEND_URL}/api/balance`, {
        headers: { Authorization: `Bearer ${firebaseToken}` }
      });

      const data = response.data.data;
      const balances = data.balances || data;
      const usdtBalance = Array.isArray(balances)
        ? balances.find(b => b.currency === 'USDT')
        : balances.USDT;
      const balance = parseFloat(usdtBalance?.available || usdtBalance || 0);
      const passed = balance >= 100;

      logTest(4, 'Ensure user has USDT balance', passed, {
        request: { method: 'GET', url: '/api/balance' },
        response: { status: response.status, data: response.data },
        verification: {
          usdtBalance: balance,
          required: 100,
          sufficient: passed
        }
      });

      if (!passed) {
        console.log('⚠️  Insufficient USDT balance. Tests may fail.');
      }
    } catch (error) {
      logTest(4, 'Ensure user has USDT balance', false, { error: error.message });
      // Continue anyway - we'll see failures in withdrawal requests
    }

    // Step 5: Verify admin user exists
    try {
      const adminResult = await pool.query(
        'SELECT id, username FROM admin_users LIMIT 1'
      );

      const admin = adminResult.rows[0];
      const passed = admin && admin.username === 'admin';

      logTest(5, 'Verify admin user exists', passed, {
        verification: {
          adminId: admin?.id,
          username: admin?.username,
          expected: 'admin'
        }
      });
    } catch (error) {
      logTest(5, 'Verify admin user exists', false, { error: error.message });
      throw error;
    }

    // ========================================================================
    // PART 2: BANK ACCOUNT MANAGEMENT (Steps 6-10)
    // ========================================================================

    console.log('\n' + '='.repeat(80));
    console.log('PART 2: BANK ACCOUNT MANAGEMENT');
    console.log('='.repeat(80));

    // Step 6: Add first bank account
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/bank-accounts`,
        {
          account_holder_name: 'Test User',
          account_number: '1234567890',
          ifsc_code: 'SBIN0001234',
          bank_name: 'State Bank of India',
          is_default: true
        },
        { headers: { Authorization: `Bearer ${firebaseToken}` } }
      );

      bankAccountId1 = response.data.data.id;
      const passed = response.data.success && response.data.data.is_default === true;

      logTest(6, 'Add first bank account', passed, {
        request: {
          method: 'POST',
          url: '/api/bank-accounts',
          body: {
            account_holder_name: 'Test User',
            account_number: '1234567890',
            ifsc_code: 'SBIN0001234',
            bank_name: 'State Bank of India',
            is_default: true
          }
        },
        response: { status: response.status, data: response.data },
        verification: {
          success: response.data.success,
          is_default: response.data.data.is_default,
          bankAccountId: bankAccountId1
        }
      });
    } catch (error) {
      logTest(6, 'Add first bank account', false, {
        error: error.response?.data || error.message
      });
      throw error;
    }

    // Step 7: Add second bank account
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/bank-accounts`,
        {
          account_holder_name: 'Test User',
          account_number: '9876543210',
          ifsc_code: 'HDFC0001234',
          bank_name: 'HDFC Bank',
          is_default: false
        },
        { headers: { Authorization: `Bearer ${firebaseToken}` } }
      );

      bankAccountId2 = response.data.data.id;
      const passed = response.data.success && response.data.data.is_default === false;

      logTest(7, 'Add second bank account', passed, {
        request: {
          method: 'POST',
          url: '/api/bank-accounts',
          body: {
            account_holder_name: 'Test User',
            account_number: '9876543210',
            ifsc_code: 'HDFC0001234',
            bank_name: 'HDFC Bank',
            is_default: false
          }
        },
        response: { status: response.status, data: response.data },
        verification: {
          success: response.data.success,
          is_default: response.data.data.is_default,
          bankAccountId: bankAccountId2
        }
      });
    } catch (error) {
      logTest(7, 'Add second bank account', false, {
        error: error.response?.data || error.message
      });
      throw error;
    }

    // Step 8: List bank accounts
    try {
      const response = await axios.get(`${BACKEND_URL}/api/bank-accounts`, {
        headers: { Authorization: `Bearer ${firebaseToken}` }
      });

      const accounts = response.data.data;
      const passed = accounts.length === 2 &&
                     accounts[0].is_default === true;

      logTest(8, 'List bank accounts', passed, {
        request: { method: 'GET', url: '/api/bank-accounts' },
        response: { status: response.status, data: response.data },
        verification: {
          accountCount: accounts.length,
          expected: 2,
          firstAccountIsDefault: accounts[0].is_default
        }
      });
    } catch (error) {
      logTest(8, 'List bank accounts', false, {
        error: error.response?.data || error.message
      });
      throw error;
    }

    // Step 9: Set second account as default
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/bank-accounts/${bankAccountId2}/set-default`,
        {},
        { headers: { Authorization: `Bearer ${firebaseToken}` } }
      );

      // Verify by listing accounts again
      const listResponse = await axios.get(`${BACKEND_URL}/api/bank-accounts`, {
        headers: { Authorization: `Bearer ${firebaseToken}` }
      });

      const accounts = listResponse.data.data;
      const secondAccount = accounts.find(a => a.id === bankAccountId2);
      const firstAccount = accounts.find(a => a.id === bankAccountId1);

      const passed = secondAccount.is_default === true &&
                     firstAccount.is_default === false;

      logTest(9, 'Set second account as default', passed, {
        request: {
          method: 'POST',
          url: `/api/bank-accounts/${bankAccountId2}/set-default`
        },
        response: { status: response.status, data: response.data },
        verification: {
          secondAccountIsDefault: secondAccount.is_default,
          firstAccountIsNotDefault: !firstAccount.is_default
        }
      });
    } catch (error) {
      logTest(9, 'Set second account as default', false, {
        error: error.response?.data || error.message
      });
      throw error;
    }

    // Step 10: Update bank account
    try {
      const response = await axios.put(
        `${BACKEND_URL}/api/bank-accounts/${bankAccountId1}`,
        { bank_name: 'State Bank of India - Updated' },
        { headers: { Authorization: `Bearer ${firebaseToken}` } }
      );

      const passed = response.data.success &&
                     response.data.data.bank_name === 'State Bank of India - Updated' &&
                     response.data.data.account_number === '1234567890';

      logTest(10, 'Update bank account', passed, {
        request: {
          method: 'PUT',
          url: `/api/bank-accounts/${bankAccountId1}`,
          body: { bank_name: 'State Bank of India - Updated' }
        },
        response: { status: response.status, data: response.data },
        verification: {
          bankNameUpdated: response.data.data.bank_name === 'State Bank of India - Updated',
          accountNumberUnchanged: response.data.data.account_number === '1234567890'
        }
      });
    } catch (error) {
      logTest(10, 'Update bank account', false, {
        error: error.response?.data || error.message
      });
      throw error;
    }

    // ========================================================================
    // PART 3: WITHDRAWAL REQUEST (Steps 11-13)
    // ========================================================================

    console.log('\n' + '='.repeat(80));
    console.log('PART 3: WITHDRAWAL REQUEST');
    console.log('='.repeat(80));

    // Step 11: Request withdrawal (without bank_account_id - should use default)
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/withdrawals/request`,
        { amount_inr: 5000 },
        { headers: { Authorization: `Bearer ${firebaseToken}` } }
      );

      withdrawalId1 = response.data.data.id;
      const passed = response.data.success &&
                     response.data.data.bank_account.id === bankAccountId2 &&
                     parseFloat(response.data.data.amount_inr) === 5000 &&
                     response.data.data.status === 'pending';

      logTest(11, 'Request withdrawal (without bank_account_id - should use default)', passed, {
        request: {
          method: 'POST',
          url: '/api/withdrawals/request',
          body: { amount_inr: 5000 }
        },
        response: { status: response.status, data: response.data },
        verification: {
          success: response.data.success,
          usedDefaultAccount: response.data.data.bank_account.id === bankAccountId2,
          amount_inr: response.data.data.amount_inr,
          status: response.data.data.status,
          withdrawalId: withdrawalId1
        }
      });
    } catch (error) {
      logTest(11, 'Request withdrawal (without bank_account_id)', false, {
        error: error.response?.data || error.message
      });
      throw error;
    }

    // Step 12: Request second withdrawal (with explicit bank_account_id)
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/withdrawals/request`,
        {
          amount_inr: 3000,
          bank_account_id: bankAccountId1
        },
        { headers: { Authorization: `Bearer ${firebaseToken}` } }
      );

      withdrawalId2 = response.data.data.id;
      const passed = response.data.success &&
                     response.data.data.bank_account.id === bankAccountId1 &&
                     parseFloat(response.data.data.amount_inr) === 3000;

      logTest(12, 'Request second withdrawal (with explicit bank_account_id)', passed, {
        request: {
          method: 'POST',
          url: '/api/withdrawals/request',
          body: { amount_inr: 3000, bank_account_id: bankAccountId1 }
        },
        response: { status: response.status, data: response.data },
        verification: {
          usedSpecifiedAccount: response.data.data.bank_account.id === bankAccountId1,
          amount_inr: response.data.data.amount_inr,
          withdrawalId: withdrawalId2
        }
      });
    } catch (error) {
      logTest(12, 'Request second withdrawal', false, {
        error: error.response?.data || error.message
      });
      throw error;
    }

    // Step 13: Get withdrawal history
    try {
      const response = await axios.get(`${BACKEND_URL}/api/withdrawals/history`, {
        headers: { Authorization: `Bearer ${firebaseToken}` }
      });

      const withdrawals = response.data.data;
      const passed = withdrawals.length >= 2 &&
                     withdrawals.every(w => w.status === 'pending') &&
                     withdrawals[0].id === withdrawalId2; // Newest first

      logTest(13, 'Get withdrawal history', passed, {
        request: { method: 'GET', url: '/api/withdrawals/history' },
        response: { status: response.status, data: response.data },
        verification: {
          withdrawalCount: withdrawals.length,
          allPending: withdrawals.every(w => w.status === 'pending'),
          orderedByNewest: withdrawals[0].id === withdrawalId2
        }
      });
    } catch (error) {
      logTest(13, 'Get withdrawal history', false, {
        error: error.response?.data || error.message
      });
      throw error;
    }

    // ========================================================================
    // PART 4: ADMIN LOGIN (Step 14)
    // ========================================================================

    console.log('\n' + '='.repeat(80));
    console.log('PART 4: ADMIN LOGIN');
    console.log('='.repeat(80));

    // Step 14: Admin login
    try {
      const response = await axios.post(`${BACKEND_URL}/api/admin/login`, {
        username: ADMIN_USERNAME,
        password: ADMIN_PASSWORD
      });

      adminToken = response.data.data.token;
      const passed = response.data.success &&
                     adminToken &&
                     response.data.data.admin.username === 'admin';

      logTest(14, 'Admin login', passed, {
        request: {
          method: 'POST',
          url: '/api/admin/login',
          body: { username: ADMIN_USERNAME, password: '***' }
        },
        response: {
          status: response.status,
          data: {
            success: response.data.success,
            admin: response.data.data.admin,
            tokenLength: adminToken?.length
          }
        },
        verification: {
          success: response.data.success,
          tokenReceived: !!adminToken,
          adminUsername: response.data.data.admin.username
        }
      });
    } catch (error) {
      logTest(14, 'Admin login', false, {
        error: error.response?.data || error.message
      });
      throw error;
    }

    // ========================================================================
    // PART 5: ADMIN PROCESSES WITHDRAWAL (Steps 15-18)
    // ========================================================================

    console.log('\n' + '='.repeat(80));
    console.log('PART 5: ADMIN PROCESSES WITHDRAWAL');
    console.log('='.repeat(80));

    // Step 15: Get pending withdrawals
    try {
      const response = await axios.get(`${BACKEND_URL}/api/admin/withdrawals/pending`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      const withdrawals = response.data.data;
      const passed = withdrawals.length >= 2 &&
                     withdrawals.every(w =>
                       w.user_email && w.bank_name && w.account_number && w.ifsc_code
                     ) &&
                     withdrawals[0].id === withdrawalId1; // FIFO - oldest first

      logTest(15, 'Get pending withdrawals', passed, {
        request: {
          method: 'GET',
          url: '/api/admin/withdrawals/pending'
        },
        response: { status: response.status, data: response.data },
        verification: {
          pendingCount: withdrawals.length,
          hasUserDetails: withdrawals.every(w => w.user_email),
          hasBankDetails: withdrawals.every(w => w.bank_name && w.account_number),
          orderedByOldest: withdrawals[0].id === withdrawalId1
        }
      });
    } catch (error) {
      logTest(15, 'Get pending withdrawals', false, {
        error: error.response?.data || error.message
      });
      throw error;
    }

    // Step 16: Complete first withdrawal
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/admin/withdrawals/${withdrawalId1}/complete`,
        {
          utr_number: 'UTR1234567890',
          admin_notes: 'Tested via automation'
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      const passed = response.data.success &&
                     response.data.data.status === 'completed' &&
                     response.data.data.completed_at;

      logTest(16, 'Complete first withdrawal', passed, {
        request: {
          method: 'POST',
          url: `/api/admin/withdrawals/${withdrawalId1}/complete`,
          body: {
            utr_number: 'UTR1234567890',
            admin_notes: 'Tested via automation'
          }
        },
        response: { status: response.status, data: response.data },
        verification: {
          status: response.data.data.status,
          hasCompletedAt: !!response.data.data.completed_at
        }
      });
    } catch (error) {
      logTest(16, 'Complete first withdrawal', false, {
        error: error.response?.data || error.message
      });
      throw error;
    }

    // Step 17: Verify withdrawal completed
    try {
      const response = await axios.get(
        `${BACKEND_URL}/api/withdrawals/${withdrawalId1}`,
        { headers: { Authorization: `Bearer ${firebaseToken}` } }
      );

      const withdrawal = response.data.data;
      const passed = withdrawal.status === 'completed' &&
                     withdrawal.utr_number === 'UTR1234567890' &&
                     withdrawal.completed_at &&
                     withdrawal.admin_notes === 'Tested via automation';

      logTest(17, 'Verify withdrawal completed', passed, {
        request: {
          method: 'GET',
          url: `/api/withdrawals/${withdrawalId1}`
        },
        response: { status: response.status, data: response.data },
        verification: {
          status: withdrawal.status,
          utr_number: withdrawal.utr_number,
          hasCompletedAt: !!withdrawal.completed_at,
          hasAdminNotes: !!withdrawal.admin_notes
        }
      });
    } catch (error) {
      logTest(17, 'Verify withdrawal completed', false, {
        error: error.response?.data || error.message
      });
      throw error;
    }

    // Step 18: Mark second withdrawal as failed
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/admin/withdrawals/${withdrawalId2}/fail`,
        {
          failed_reason: 'Insufficient USDT balance (testing failure flow)',
          admin_notes: 'Test failure scenario'
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      const passed = response.data.success &&
                     response.data.data.status === 'failed' &&
                     response.data.data.failed_reason;

      logTest(18, 'Mark second withdrawal as failed', passed, {
        request: {
          method: 'POST',
          url: `/api/admin/withdrawals/${withdrawalId2}/fail`,
          body: {
            failed_reason: 'Insufficient USDT balance (testing failure flow)',
            admin_notes: 'Test failure scenario'
          }
        },
        response: { status: response.status, data: response.data },
        verification: {
          status: response.data.data.status,
          hasFailedReason: !!response.data.data.failed_reason
        }
      });
    } catch (error) {
      logTest(18, 'Mark second withdrawal as failed', false, {
        error: error.response?.data || error.message
      });
      throw error;
    }

    // ========================================================================
    // PART 6: EDGE CASES (Steps 19-20)
    // ========================================================================

    console.log('\n' + '='.repeat(80));
    console.log('PART 6: EDGE CASES');
    console.log('='.repeat(80));

    // Step 19: Try to delete bank account with pending withdrawal
    try {
      // First create a new withdrawal using bankAccountId1
      const createResponse = await axios.post(
        `${BACKEND_URL}/api/withdrawals/request`,
        {
          amount_inr: 1000,
          bank_account_id: bankAccountId1
        },
        { headers: { Authorization: `Bearer ${firebaseToken}` } }
      );

      withdrawalId3 = createResponse.data.data.id;

      // Now try to delete the bank account
      try {
        await axios.delete(
          `${BACKEND_URL}/api/bank-accounts/${bankAccountId1}`,
          { headers: { Authorization: `Bearer ${firebaseToken}` } }
        );

        // Should not reach here
        logTest(19, 'Try to delete bank account with pending withdrawal', false, {
          verification: 'Expected error but deletion succeeded'
        });
      } catch (deleteError) {
        const passed = deleteError.response?.status === 400 &&
                       deleteError.response?.data?.error === 'PENDING_WITHDRAWALS_EXIST';

        logTest(19, 'Try to delete bank account with pending withdrawal', passed, {
          request: {
            method: 'DELETE',
            url: `/api/bank-accounts/${bankAccountId1}`
          },
          response: {
            status: deleteError.response?.status,
            data: deleteError.response?.data
          },
          verification: {
            errorReceived: true,
            correctErrorCode: deleteError.response?.data?.error === 'PENDING_WITHDRAWALS_EXIST'
          }
        });
      }
    } catch (error) {
      logTest(19, 'Try to delete bank account with pending withdrawal', false, {
        error: error.response?.data || error.message
      });
    }

    // Step 20: Validate IFSC code format
    try {
      try {
        await axios.post(
          `${BACKEND_URL}/api/bank-accounts`,
          {
            account_holder_name: 'Test User',
            account_number: '1111111111',
            ifsc_code: 'INVALID',  // Too short
            bank_name: 'Test Bank'
          },
          { headers: { Authorization: `Bearer ${firebaseToken}` } }
        );

        // Should not reach here
        logTest(20, 'Validate IFSC code format', false, {
          verification: 'Expected validation error but request succeeded'
        });
      } catch (validationError) {
        const passed = validationError.response?.status === 400 &&
                       validationError.response?.data?.error === 'INVALID_IFSC';

        logTest(20, 'Validate IFSC code format', passed, {
          request: {
            method: 'POST',
            url: '/api/bank-accounts',
            body: {
              account_holder_name: 'Test User',
              account_number: '1111111111',
              ifsc_code: 'INVALID',
              bank_name: 'Test Bank'
            }
          },
          response: {
            status: validationError.response?.status,
            data: validationError.response?.data
          },
          verification: {
            errorReceived: true,
            correctErrorCode: validationError.response?.data?.error === 'INVALID_IFSC'
          }
        });
      }
    } catch (error) {
      logTest(20, 'Validate IFSC code format', false, {
        error: error.response?.data || error.message
      });
    }

    // ========================================================================
    // DATABASE VERIFICATION
    // ========================================================================

    console.log('\n' + '='.repeat(80));
    console.log('DATABASE VERIFICATION');
    console.log('='.repeat(80));

    // Verify bank_accounts table
    const bankAccountsResult = await pool.query(
      'SELECT * FROM bank_accounts WHERE user_id = $1 ORDER BY created_at',
      [userId]
    );
    console.log('\n✓ Bank Accounts:', bankAccountsResult.rows.length);
    bankAccountsResult.rows.forEach(account => {
      console.log(`  - ${account.bank_name} (${account.account_number}): default=${account.is_default}`);
    });

    // Verify withdrawals table
    const withdrawalsResult = await pool.query(
      `SELECT id, amount_inr, amount_usdt, status, utr_number, failed_reason, bank_account_id
       FROM withdrawals
       WHERE user_id = $1
       ORDER BY requested_at`,
      [userId]
    );
    console.log('\n✓ Withdrawals:', withdrawalsResult.rows.length);
    withdrawalsResult.rows.forEach(withdrawal => {
      console.log(`  - ₹${withdrawal.amount_inr} (${withdrawal.amount_usdt} USDT): status=${withdrawal.status}`);
      if (withdrawal.utr_number) console.log(`    UTR: ${withdrawal.utr_number}`);
      if (withdrawal.failed_reason) console.log(`    Failed: ${withdrawal.failed_reason}`);
    });

  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
  } finally {
    // Close database connection
    await pool.end();

    // ========================================================================
    // FINAL SUMMARY
    // ========================================================================

    console.log('\n' + '='.repeat(80));
    console.log('TEST SUMMARY');
    console.log('='.repeat(80));

    const passedTests = testResults.filter(t => t.passed).length;
    const totalTests = testResults.length;
    const passRate = ((passedTests / totalTests) * 100).toFixed(1);

    console.log(`\nTotal Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Pass Rate: ${passRate}%`);

    if (passedTests === totalTests) {
      console.log('\n✅ ALL TESTS PASSED - PHASE 7 COMPLETE!');
    } else {
      console.log('\n❌ SOME TESTS FAILED - Review output above');

      const failedTests = testResults.filter(t => !t.passed);
      console.log('\nFailed Tests:');
      failedTests.forEach(test => {
        console.log(`  - Step ${test.step}: ${test.description}`);
      });
    }

    console.log('\n' + '='.repeat(80));

    process.exit(passedTests === totalTests ? 0 : 1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
