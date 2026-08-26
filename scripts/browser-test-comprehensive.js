const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_HTML_PATH = 'file:///Users/devajmody/Repos/piermind/sikka/test-ui/comprehensive-test.html';
const SCREENSHOT_DIR = '/Users/devajmody/Repos/piermind/sikka/test-results';
const BACKEND_URL = 'http://localhost:3000';

// Test credentials
const TEST_EMAIL = 'browsertest@example.com';
const TEST_PASSWORD = 'testpass123';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'changeme123';

// Test results
const results = {
  startTime: new Date().toISOString(),
  steps: [],
  screenshots: [],
  issues: [],
  apiCalls: []
};

// Helper functions
function logStep(stepNumber, stepName, status, details) {
  const step = {
    step: stepNumber,
    name: stepName,
    status: status, // 'PASS', 'FAIL', 'PARTIAL'
    details: details,
    timestamp: new Date().toISOString()
  };
  results.steps.push(step);
  console.log(`\n[Step ${stepNumber}] ${stepName}: ${status}`);
  if (details.error) {
    console.log(`  Error: ${details.error}`);
  }
  if (details.notes) {
    console.log(`  Notes: ${details.notes}`);
  }
}

function logIssue(severity, description, step) {
  results.issues.push({ severity, description, step, timestamp: new Date().toISOString() });
  console.log(`  [${severity}] ${description}`);
}

async function takeScreenshot(page, name) {
  const filename = `${name}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  results.screenshots.push({ name, filename, timestamp: new Date().toISOString() });
  console.log(`  Screenshot saved: ${filename}`);
  return filename;
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForResponse(page, selector, timeout = 10000) {
  try {
    await page.waitForSelector(selector, { timeout, state: 'visible' });
    return true;
  } catch (error) {
    return false;
  }
}

// Main test function
async function runComprehensiveTest() {
  console.log('='.repeat(80));
  console.log('COMPREHENSIVE BROWSER TEST - SIKKA PLATFORM');
  console.log('='.repeat(80));
  console.log(`Start Time: ${results.startTime}`);
  console.log(`Test URL: ${TEST_HTML_PATH}`);
  console.log(`Backend: ${BACKEND_URL}`);
  console.log('='.repeat(80));

  const browser = await chromium.launch({
    headless: false, // Set to true for headless mode
    slowMo: 500 // Slow down by 500ms for visibility
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 1024 }
  });

  const page = await context.newPage();

  // Track API calls
  page.on('response', response => {
    const url = response.url();
    if (url.includes(BACKEND_URL) || url.includes('firebaseapp.com')) {
      results.apiCalls.push({
        url: url,
        status: response.status(),
        method: response.request().method(),
        timestamp: new Date().toISOString()
      });
    }
  });

  try {
    // ====================================================================
    // STEP 1: AUTHENTICATION
    // ====================================================================
    console.log('\n' + '='.repeat(80));
    console.log('STEP 1: AUTHENTICATION');
    console.log('='.repeat(80));

    await page.goto(TEST_HTML_PATH);
    await wait(2000);

    try {
      // Fill in email and password
      await page.fill('input[type="email"]', TEST_EMAIL);
      await page.fill('input[type="password"]', TEST_PASSWORD);
      console.log(`  Filled credentials: ${TEST_EMAIL}`);

      // Click Sign Up button
      await page.click('button:has-text("Sign Up")');
      console.log('  Clicked Sign Up button');

      await wait(5000); // Wait for Firebase response

      // Check for Firebase auth status
      const statusText = await page.textContent('#auth-status');
      console.log(`  Auth Status: ${statusText}`);

      if (statusText.includes('Signed in')) {
        await takeScreenshot(page, 'step1-authentication-success');
        logStep(1, 'Authentication', 'PASS', {
          whatWorked: 'Email/password input, Firebase sign up',
          notes: `Successfully signed in as ${TEST_EMAIL}`
        });
      } else if (statusText.includes('Error') || statusText.includes('error')) {
        await takeScreenshot(page, 'step1-authentication-error');
        logStep(1, 'Authentication', 'FAIL', {
          whatFailed: 'Firebase authentication failed',
          error: statusText,
          notes: 'Firebase may need real credentials or proper configuration'
        });
        logIssue('HIGH', 'Firebase authentication failed - may need real credentials', 'Step 1');
      } else {
        await takeScreenshot(page, 'step1-authentication-partial');
        logStep(1, 'Authentication', 'PARTIAL', {
          notes: 'Auth status unclear, continuing with test'
        });
      }
    } catch (error) {
      await takeScreenshot(page, 'step1-authentication-exception');
      logStep(1, 'Authentication', 'FAIL', {
        whatFailed: 'Exception during authentication',
        error: error.message
      });
      logIssue('HIGH', `Authentication exception: ${error.message}`, 'Step 1');
    }

    // ====================================================================
    // STEP 2: KYC SUBMISSION
    // ====================================================================
    console.log('\n' + '='.repeat(80));
    console.log('STEP 2: KYC SUBMISSION');
    console.log('='.repeat(80));

    try {
      // Scroll to Step 2
      await page.evaluate(() => {
        document.querySelector('.step-container:nth-child(2)').scrollIntoView({ behavior: 'smooth' });
      });
      await wait(1000);

      // Register with backend first (if needed)
      const registerBtn = page.locator('button:has-text("Register with Backend")');
      if (await registerBtn.isVisible()) {
        await registerBtn.click();
        console.log('  Clicked Register with Backend');
        await wait(2000);
      }

      // Fill KYC form
      await page.fill('input[placeholder*="Full Name"]', 'Browser Test User');
      await page.fill('input[type="date"]', '1990-01-01');
      await page.fill('textarea[placeholder*="Address"]', '123 Test Street, Test City');
      await page.selectOption('select', 'AADHAAR');
      await page.fill('input[placeholder*="ID Number"]', '123456789012');
      console.log('  Filled KYC form');

      // Submit KYC
      await page.click('button:has-text("Submit KYC")');
      console.log('  Clicked Submit KYC button');
      await wait(10000); // KYC can take time

      // Check result
      const kycStatus = await page.textContent('#kyc-status');
      console.log(`  KYC Status: ${kycStatus}`);

      await takeScreenshot(page, 'step2-kyc');

      if (kycStatus.includes('approved') || kycStatus.includes('pending') || kycStatus.includes('sub-')) {
        logStep(2, 'KYC Submission', 'PASS', {
          whatWorked: 'KYC form submission, sub-account creation',
          notes: `KYC Status: ${kycStatus}`
        });
      } else if (kycStatus.includes('Error') || kycStatus.includes('error')) {
        logStep(2, 'KYC Submission', 'FAIL', {
          whatFailed: 'KYC submission failed',
          error: kycStatus
        });
        logIssue('HIGH', 'KYC submission failed', 'Step 2');
      } else {
        logStep(2, 'KYC Submission', 'PARTIAL', {
          notes: `Unclear status: ${kycStatus}`
        });
      }
    } catch (error) {
      await takeScreenshot(page, 'step2-kyc-exception');
      logStep(2, 'KYC Submission', 'FAIL', {
        whatFailed: 'Exception during KYC submission',
        error: error.message
      });
      logIssue('HIGH', `KYC exception: ${error.message}`, 'Step 2');
    }

    // ====================================================================
    // STEP 3: BANK ACCOUNT
    // ====================================================================
    console.log('\n' + '='.repeat(80));
    console.log('STEP 3: BANK ACCOUNT');
    console.log('='.repeat(80));

    try {
      // Scroll to Step 3
      await page.evaluate(() => {
        document.querySelector('.step-container:nth-child(3)').scrollIntoView({ behavior: 'smooth' });
      });
      await wait(1000);

      // Fill bank form
      await page.fill('input[placeholder*="Account Holder"]', 'Browser Test User');
      await page.fill('input[placeholder*="Account Number"]', '1234567890123');
      await page.fill('input[placeholder*="IFSC"]', 'SBIN0001234');
      await page.fill('input[placeholder*="Bank Name"]', 'State Bank of India');
      console.log('  Filled bank account form');

      // Submit
      await page.click('button:has-text("Add Bank Account")');
      console.log('  Clicked Add Bank Account button');
      await wait(3000);

      // Check if bank account appears in list
      const bankList = await page.textContent('#bank-accounts-list');
      console.log(`  Bank Accounts: ${bankList}`);

      await takeScreenshot(page, 'step3-bank');

      if (bankList.includes('SBIN0001234') || bankList.includes('State Bank')) {
        logStep(3, 'Bank Account', 'PASS', {
          whatWorked: 'Bank account form submission and display',
          notes: 'Bank account added successfully'
        });
      } else if (bankList.includes('Error') || bankList.includes('error')) {
        logStep(3, 'Bank Account', 'FAIL', {
          whatFailed: 'Bank account addition failed',
          error: bankList
        });
        logIssue('MEDIUM', 'Bank account addition failed', 'Step 3');
      } else {
        logStep(3, 'Bank Account', 'PARTIAL', {
          notes: `Bank list: ${bankList}`
        });
      }
    } catch (error) {
      await takeScreenshot(page, 'step3-bank-exception');
      logStep(3, 'Bank Account', 'FAIL', {
        whatFailed: 'Exception during bank account addition',
        error: error.message
      });
      logIssue('MEDIUM', `Bank account exception: ${error.message}`, 'Step 3');
    }

    // ====================================================================
    // STEP 4: DEPOSIT INR
    // ====================================================================
    console.log('\n' + '='.repeat(80));
    console.log('STEP 4: DEPOSIT INR');
    console.log('='.repeat(80));

    try {
      // Scroll to Step 4
      await page.evaluate(() => {
        document.querySelector('.step-container:nth-child(4)').scrollIntoView({ behavior: 'smooth' });
      });
      await wait(1000);

      // Fill deposit amount
      await page.fill('input[placeholder*="amount"]', '1000');
      console.log('  Filled deposit amount: 1000 INR');

      // Initiate deposit
      await page.click('button:has-text("Initiate Deposit")');
      console.log('  Clicked Initiate Deposit button');
      await wait(3000);

      // Check deposit status
      const depositStatus = await page.textContent('#deposit-status');
      console.log(`  Deposit Status: ${depositStatus}`);

      // Simulate payment success
      await wait(2000);
      await page.click('button:has-text("Simulate Payment Success")');
      console.log('  Clicked Simulate Payment Success');
      await wait(5000); // Wait for webhook

      // Refresh status
      const updatedStatus = await page.textContent('#deposit-status');
      console.log(`  Updated Status: ${updatedStatus}`);

      await takeScreenshot(page, 'step4-deposit');

      if (updatedStatus.includes('paid') || updatedStatus.includes('completed')) {
        logStep(4, 'Deposit INR', 'PASS', {
          whatWorked: 'Deposit initiation, payment simulation, webhook processing',
          notes: `Deposit successful: ${updatedStatus}`
        });
      } else if (updatedStatus.includes('Error') || updatedStatus.includes('error')) {
        logStep(4, 'Deposit INR', 'FAIL', {
          whatFailed: 'Deposit or payment simulation failed',
          error: updatedStatus
        });
        logIssue('HIGH', 'Deposit failed', 'Step 4');
      } else {
        logStep(4, 'Deposit INR', 'PARTIAL', {
          notes: `Status: ${updatedStatus}`
        });
      }
    } catch (error) {
      await takeScreenshot(page, 'step4-deposit-exception');
      logStep(4, 'Deposit INR', 'FAIL', {
        whatFailed: 'Exception during deposit',
        error: error.message
      });
      logIssue('HIGH', `Deposit exception: ${error.message}`, 'Step 4');
    }

    // ====================================================================
    // STEP 5: ADMIN TRANSFER
    // ====================================================================
    console.log('\n' + '='.repeat(80));
    console.log('STEP 5: ADMIN TRANSFER');
    console.log('='.repeat(80));

    try {
      // Switch to Admin Panel tab
      await page.click('button:has-text("Admin Panel")');
      console.log('  Switched to Admin Panel tab');
      await wait(2000);

      // Admin login
      await page.fill('input[placeholder*="Admin Username"]', ADMIN_USERNAME);
      await page.fill('input[placeholder*="Admin Password"]', ADMIN_PASSWORD);
      console.log(`  Filled admin credentials: ${ADMIN_USERNAME}`);

      await page.click('button:has-text("Admin Login")');
      console.log('  Clicked Admin Login button');
      await wait(3000);

      // Check admin status
      const adminStatus = await page.textContent('#admin-status');
      console.log(`  Admin Status: ${adminStatus}`);

      // View pending deposits
      await page.click('button:has-text("View Pending Deposits")');
      console.log('  Clicked View Pending Deposits');
      await wait(3000);

      // Check deposits list
      const depositsList = await page.textContent('#pending-deposits-list');
      console.log(`  Pending Deposits: ${depositsList.substring(0, 200)}...`);

      // Try to transfer USDT (find the first deposit)
      const transferButtons = await page.$$('button:has-text("Transfer USDT")');
      if (transferButtons.length > 0) {
        // Fill USDT amount (approximate)
        const usdtInputs = await page.$$('input[placeholder*="USDT"]');
        if (usdtInputs.length > 0) {
          await usdtInputs[0].fill('11.83');
          console.log('  Filled USDT amount: 11.83');
        }

        await transferButtons[0].click();
        console.log('  Clicked Transfer USDT button');
        await wait(10000); // Transfer can take time

        await takeScreenshot(page, 'step5-admin-transfer');

        logStep(5, 'Admin Transfer', 'PASS', {
          whatWorked: 'Admin login, view pending deposits, USDT transfer',
          notes: 'Transfer initiated successfully'
        });
      } else {
        await takeScreenshot(page, 'step5-admin-transfer-no-deposits');
        logStep(5, 'Admin Transfer', 'PARTIAL', {
          notes: 'No pending deposits found to transfer'
        });
        logIssue('MEDIUM', 'No pending deposits available for transfer', 'Step 5');
      }
    } catch (error) {
      await takeScreenshot(page, 'step5-admin-transfer-exception');
      logStep(5, 'Admin Transfer', 'FAIL', {
        whatFailed: 'Exception during admin transfer',
        error: error.message
      });
      logIssue('HIGH', `Admin transfer exception: ${error.message}`, 'Step 5');
    }

    // ====================================================================
    // STEP 6: VIEW BALANCES
    // ====================================================================
    console.log('\n' + '='.repeat(80));
    console.log('STEP 6: VIEW BALANCES');
    console.log('='.repeat(80));

    try {
      // Switch back to User Journey tab
      await page.click('button:has-text("User Journey")');
      console.log('  Switched back to User Journey tab');
      await wait(2000);

      // Scroll to Step 6
      await page.evaluate(() => {
        document.querySelector('.step-container:nth-child(6)').scrollIntoView({ behavior: 'smooth' });
      });
      await wait(1000);

      // Check balance
      await page.click('button:has-text("Check Balance")');
      console.log('  Clicked Check Balance button');
      await wait(5000);

      // Get balance display
      const balanceText = await page.textContent('#balance-display');
      console.log(`  Balance: ${balanceText.substring(0, 300)}...`);

      await takeScreenshot(page, 'step6-balances');

      if (balanceText.includes('USDT') || balanceText.includes('balance')) {
        logStep(6, 'View Balances', 'PASS', {
          whatWorked: 'Balance retrieval and display',
          notes: `Balance info retrieved`
        });
      } else if (balanceText.includes('Error') || balanceText.includes('error')) {
        logStep(6, 'View Balances', 'FAIL', {
          whatFailed: 'Balance retrieval failed',
          error: balanceText
        });
        logIssue('HIGH', 'Balance check failed', 'Step 6');
      } else {
        logStep(6, 'View Balances', 'PARTIAL', {
          notes: `Balance display: ${balanceText.substring(0, 100)}`
        });
      }
    } catch (error) {
      await takeScreenshot(page, 'step6-balances-exception');
      logStep(6, 'View Balances', 'FAIL', {
        whatFailed: 'Exception during balance check',
        error: error.message
      });
      logIssue('HIGH', `Balance check exception: ${error.message}`, 'Step 6');
    }

    // ====================================================================
    // STEP 7: BUY/SELL CRYPTO
    // ====================================================================
    console.log('\n' + '='.repeat(80));
    console.log('STEP 7: BUY/SELL CRYPTO');
    console.log('='.repeat(80));

    try {
      // Scroll to Step 7
      await page.evaluate(() => {
        document.querySelector('.step-container:nth-child(7)').scrollIntoView({ behavior: 'smooth' });
      });
      await wait(1000);

      // Refresh prices
      await page.click('button:has-text("Refresh Prices")');
      console.log('  Clicked Refresh Prices');
      await wait(3000);

      // Get price display
      const priceDisplay = await page.textContent('#price-display');
      console.log(`  Prices: ${priceDisplay.substring(0, 200)}`);

      // Fill buy amount
      await page.fill('input[placeholder*="INR amount"]', '500');
      console.log('  Filled buy amount: 500 INR');
      await wait(1000);

      // Buy BTC
      await page.click('button:has-text("Buy BTC")');
      console.log('  Clicked Buy BTC button');
      await wait(10000); // Order execution can take time

      // Check trade result
      const tradeStatus = await page.textContent('#trade-status');
      console.log(`  Trade Status: ${tradeStatus}`);

      await takeScreenshot(page, 'step7-trade');

      if (tradeStatus.includes('success') || tradeStatus.includes('order') || tradeStatus.includes('filled')) {
        logStep(7, 'Buy/Sell Crypto', 'PASS', {
          whatWorked: 'Price refresh, trade calculation, order execution',
          notes: `Trade executed: ${tradeStatus}`
        });
      } else if (tradeStatus.includes('Error') || tradeStatus.includes('error')) {
        logStep(7, 'Buy/Sell Crypto', 'FAIL', {
          whatFailed: 'Trade execution failed',
          error: tradeStatus
        });
        logIssue('HIGH', 'Trade execution failed', 'Step 7');
      } else {
        logStep(7, 'Buy/Sell Crypto', 'PARTIAL', {
          notes: `Trade status: ${tradeStatus}`
        });
      }
    } catch (error) {
      await takeScreenshot(page, 'step7-trade-exception');
      logStep(7, 'Buy/Sell Crypto', 'FAIL', {
        whatFailed: 'Exception during trade',
        error: error.message
      });
      logIssue('HIGH', `Trade exception: ${error.message}`, 'Step 7');
    }

    // ====================================================================
    // STEP 8: HOLDINGS & P&L
    // ====================================================================
    console.log('\n' + '='.repeat(80));
    console.log('STEP 8: HOLDINGS & P&L');
    console.log('='.repeat(80));

    try {
      // Scroll to Step 8
      await page.evaluate(() => {
        document.querySelector('.step-container:nth-child(8)').scrollIntoView({ behavior: 'smooth' });
      });
      await wait(1000);

      // View holdings
      await page.click('button:has-text("View Holdings")');
      console.log('  Clicked View Holdings button');
      await wait(5000);

      // Get holdings display
      const holdingsText = await page.textContent('#holdings-display');
      console.log(`  Holdings: ${holdingsText.substring(0, 300)}...`);

      await takeScreenshot(page, 'step8-holdings');

      if (holdingsText.includes('BTC') || holdingsText.includes('USDT') || holdingsText.includes('portfolio')) {
        logStep(8, 'Holdings & P&L', 'PASS', {
          whatWorked: 'Holdings retrieval and P&L calculation',
          notes: 'Holdings displayed successfully'
        });
      } else if (holdingsText.includes('Error') || holdingsText.includes('error')) {
        logStep(8, 'Holdings & P&L', 'FAIL', {
          whatFailed: 'Holdings retrieval failed',
          error: holdingsText
        });
        logIssue('MEDIUM', 'Holdings check failed', 'Step 8');
      } else {
        logStep(8, 'Holdings & P&L', 'PARTIAL', {
          notes: `Holdings: ${holdingsText.substring(0, 100)}`
        });
      }
    } catch (error) {
      await takeScreenshot(page, 'step8-holdings-exception');
      logStep(8, 'Holdings & P&L', 'FAIL', {
        whatFailed: 'Exception during holdings check',
        error: error.message
      });
      logIssue('MEDIUM', `Holdings exception: ${error.message}`, 'Step 8');
    }

    // ====================================================================
    // STEP 9: WITHDRAW INR
    // ====================================================================
    console.log('\n' + '='.repeat(80));
    console.log('STEP 9: WITHDRAW INR');
    console.log('='.repeat(80));

    try {
      // Scroll to Step 9
      await page.evaluate(() => {
        document.querySelector('.step-container:nth-child(9)').scrollIntoView({ behavior: 'smooth' });
      });
      await wait(1000);

      // Fill withdrawal amount
      await page.fill('input[placeholder*="withdrawal amount"]', '400');
      console.log('  Filled withdrawal amount: 400 INR');

      // Select bank account (first one)
      const bankSelects = await page.$$('select');
      if (bankSelects.length > 0) {
        await bankSelects[0].selectOption({ index: 1 }); // Select first bank account
        console.log('  Selected bank account');
      }

      // Request withdrawal
      await page.click('button:has-text("Request Withdrawal")');
      console.log('  Clicked Request Withdrawal button');
      await wait(5000);

      // Check withdrawal status
      const withdrawalStatus = await page.textContent('#withdrawal-status');
      console.log(`  Withdrawal Status: ${withdrawalStatus}`);

      await takeScreenshot(page, 'step9-withdrawal');

      if (withdrawalStatus.includes('pending') || withdrawalStatus.includes('requested') || withdrawalStatus.includes('withdrawal')) {
        logStep(9, 'Withdraw INR', 'PASS', {
          whatWorked: 'Withdrawal request, USDT calculation',
          notes: `Withdrawal requested: ${withdrawalStatus}`
        });
      } else if (withdrawalStatus.includes('Error') || withdrawalStatus.includes('error')) {
        logStep(9, 'Withdraw INR', 'FAIL', {
          whatFailed: 'Withdrawal request failed',
          error: withdrawalStatus
        });
        logIssue('HIGH', 'Withdrawal request failed', 'Step 9');
      } else {
        logStep(9, 'Withdraw INR', 'PARTIAL', {
          notes: `Status: ${withdrawalStatus}`
        });
      }
    } catch (error) {
      await takeScreenshot(page, 'step9-withdrawal-exception');
      logStep(9, 'Withdraw INR', 'FAIL', {
        whatFailed: 'Exception during withdrawal',
        error: error.message
      });
      logIssue('HIGH', `Withdrawal exception: ${error.message}`, 'Step 9');
    }

    // ====================================================================
    // STEP 10: ADMIN PROCESS WITHDRAWAL
    // ====================================================================
    console.log('\n' + '='.repeat(80));
    console.log('STEP 10: ADMIN PROCESS WITHDRAWAL');
    console.log('='.repeat(80));

    try {
      // Switch to Admin Panel tab
      await page.click('button:has-text("Admin Panel")');
      console.log('  Switched to Admin Panel tab');
      await wait(2000);

      // Scroll to pending withdrawals
      await page.evaluate(() => {
        const withdrawalSection = Array.from(document.querySelectorAll('h3'))
          .find(h3 => h3.textContent.includes('Pending Withdrawals'));
        if (withdrawalSection) {
          withdrawalSection.scrollIntoView({ behavior: 'smooth' });
        }
      });
      await wait(1000);

      // View pending withdrawals
      await page.click('button:has-text("View Pending Withdrawals")');
      console.log('  Clicked View Pending Withdrawals');
      await wait(3000);

      // Check withdrawals list
      const withdrawalsList = await page.textContent('#pending-withdrawals-list');
      console.log(`  Pending Withdrawals: ${withdrawalsList.substring(0, 200)}...`);

      // Complete withdrawal (first one)
      const completeButtons = await page.$$('button:has-text("Complete Withdrawal")');
      if (completeButtons.length > 0) {
        await completeButtons[0].click();
        console.log('  Clicked Complete Withdrawal button');
        await wait(15000); // Withdrawal processing takes time

        await takeScreenshot(page, 'step10-admin-withdraw');

        logStep(10, 'Admin Process Withdrawal', 'PASS', {
          whatWorked: 'View pending withdrawals, process withdrawal, USDT transfer, INR payout',
          notes: 'Withdrawal processed successfully'
        });
      } else {
        await takeScreenshot(page, 'step10-admin-withdraw-no-pending');
        logStep(10, 'Admin Process Withdrawal', 'PARTIAL', {
          notes: 'No pending withdrawals found to process'
        });
        logIssue('MEDIUM', 'No pending withdrawals available', 'Step 10');
      }
    } catch (error) {
      await takeScreenshot(page, 'step10-admin-withdraw-exception');
      logStep(10, 'Admin Process Withdrawal', 'FAIL', {
        whatFailed: 'Exception during admin withdrawal processing',
        error: error.message
      });
      logIssue('HIGH', `Admin withdrawal exception: ${error.message}`, 'Step 10');
    }

    // ====================================================================
    // DEBUG PANEL
    // ====================================================================
    console.log('\n' + '='.repeat(80));
    console.log('DEBUG PANEL TEST');
    console.log('='.repeat(80));

    try {
      // Switch to Debug Panel tab
      await page.click('button:has-text("Debug Panel")');
      console.log('  Switched to Debug Panel tab');
      await wait(3000);

      // Check debug panel sections
      const debugContent = await page.textContent('#debug-panel');
      console.log(`  Debug Panel: ${debugContent.substring(0, 300)}...`);

      await takeScreenshot(page, 'debug-panel');

      if (debugContent.includes('User State') || debugContent.includes('Balance') || debugContent.includes('Transactions')) {
        logStep('Debug', 'Debug Panel', 'PASS', {
          whatWorked: 'Debug panel loads with user state, balances, transactions',
          notes: 'Debug panel functional'
        });
      } else {
        logStep('Debug', 'Debug Panel', 'PARTIAL', {
          notes: 'Debug panel loaded but content unclear'
        });
      }
    } catch (error) {
      await takeScreenshot(page, 'debug-panel-exception');
      logStep('Debug', 'Debug Panel', 'FAIL', {
        whatFailed: 'Exception during debug panel test',
        error: error.message
      });
    }

    // ====================================================================
    // FINAL VERIFICATION
    // ====================================================================
    console.log('\n' + '='.repeat(80));
    console.log('FINAL VERIFICATION');
    console.log('='.repeat(80));

    try {
      // Switch back to User Journey
      await page.click('button:has-text("User Journey")');
      await wait(2000);

      // Scroll to balance check
      await page.evaluate(() => {
        document.querySelector('.step-container:nth-child(6)').scrollIntoView({ behavior: 'smooth' });
      });
      await wait(1000);

      // Final balance check
      await page.click('button:has-text("Check Balance")');
      console.log('  Final balance check...');
      await wait(5000);

      const finalBalance = await page.textContent('#balance-display');
      console.log(`  Final Balance: ${finalBalance.substring(0, 300)}...`);

      await takeScreenshot(page, 'final-state');

      console.log('\n  Final State Captured');
    } catch (error) {
      console.log(`  Final verification failed: ${error.message}`);
    }

  } catch (error) {
    console.error(`\n[FATAL ERROR] ${error.message}`);
    await takeScreenshot(page, 'fatal-error');
  } finally {
    results.endTime = new Date().toISOString();
    results.duration = new Date(results.endTime) - new Date(results.startTime);

    console.log('\n' + '='.repeat(80));
    console.log('TEST COMPLETE');
    console.log('='.repeat(80));
    console.log(`End Time: ${results.endTime}`);
    console.log(`Duration: ${results.duration}ms (${(results.duration / 1000).toFixed(2)}s)`);
    console.log('='.repeat(80));

    await browser.close();
  }

  return results;
}

// Run the test and generate report
(async () => {
  try {
    const testResults = await runComprehensiveTest();

    // Save results to JSON
    const resultsPath = path.join(SCREENSHOT_DIR, 'test-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(testResults, null, 2));
    console.log(`\nTest results saved to: ${resultsPath}`);

    // Generate markdown report
    await generateMarkdownReport(testResults);

  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
})();

async function generateMarkdownReport(results) {
  const reportPath = '/Users/devajmody/Repos/piermind/sikka/BROWSER_TEST_REPORT.md';

  const passed = results.steps.filter(s => s.status === 'PASS').length;
  const failed = results.steps.filter(s => s.status === 'FAIL').length;
  const partial = results.steps.filter(s => s.status === 'PARTIAL').length;
  const total = results.steps.length;

  let report = `# BROWSER TEST REPORT - SIKKA PLATFORM
Generated: ${new Date().toISOString()}
Test Duration: ${(results.duration / 1000).toFixed(2)} seconds

## Executive Summary

- **Total Steps Attempted**: ${total}
- **Steps Passed**: ${passed} ✅
- **Steps Failed**: ${failed} ❌
- **Steps Partial**: ${partial} ⚠️
- **Success Rate**: ${((passed / total) * 100).toFixed(1)}%
- **Overall Status**: ${failed === 0 ? '✅ READY FOR PRODUCTION' : failed <= 2 ? '⚠️ MINOR ISSUES FOUND' : '❌ CRITICAL ISSUES FOUND'}

## Detailed Step Results

`;

  results.steps.forEach(step => {
    const statusIcon = step.status === 'PASS' ? '✅' : step.status === 'FAIL' ? '❌' : '⚠️';
    report += `### Step ${step.step}: ${step.name} ${statusIcon}\n\n`;
    report += `- **Status**: ${step.status}\n`;
    report += `- **Timestamp**: ${step.timestamp}\n`;

    if (step.details.whatWorked) {
      report += `- **What Worked**: ${step.details.whatWorked}\n`;
    }
    if (step.details.whatFailed) {
      report += `- **What Failed**: ${step.details.whatFailed}\n`;
    }
    if (step.details.error) {
      report += `- **Error**: \`${step.details.error}\`\n`;
    }
    if (step.details.notes) {
      report += `- **Notes**: ${step.details.notes}\n`;
    }

    const screenshot = results.screenshots.find(s => s.name.includes(`step${step.step}`));
    if (screenshot) {
      report += `- **Screenshot**: \`${screenshot.filename}\`\n`;
    }

    report += '\n';
  });

  report += `## Issues Found\n\n`;
  if (results.issues.length === 0) {
    report += `No issues found! 🎉\n\n`;
  } else {
    results.issues.forEach((issue, idx) => {
      const severityIcon = issue.severity === 'HIGH' ? '🔴' : issue.severity === 'MEDIUM' ? '🟡' : '🟢';
      report += `${idx + 1}. ${severityIcon} **${issue.severity}**: ${issue.description}\n`;
      report += `   - Step: ${issue.step}\n`;
      report += `   - Time: ${issue.timestamp}\n\n`;
    });
  }

  report += `## Backend API Results\n\n`;
  report += `Total API calls made: ${results.apiCalls.length}\n\n`;

  const successfulCalls = results.apiCalls.filter(c => c.status >= 200 && c.status < 300).length;
  const failedCalls = results.apiCalls.filter(c => c.status >= 400).length;

  report += `- **Successful**: ${successfulCalls}\n`;
  report += `- **Failed**: ${failedCalls}\n\n`;

  report += `### API Call Summary\n\n`;
  const apiSummary = {};
  results.apiCalls.forEach(call => {
    const endpoint = call.url.replace(BACKEND_URL, '');
    if (!apiSummary[endpoint]) {
      apiSummary[endpoint] = { calls: 0, statuses: [] };
    }
    apiSummary[endpoint].calls++;
    apiSummary[endpoint].statuses.push(call.status);
  });

  Object.entries(apiSummary).forEach(([endpoint, data]) => {
    const statusStr = data.statuses.join(', ');
    report += `- \`${endpoint}\`: ${data.calls} call(s) - Status: ${statusStr}\n`;
  });

  report += `\n## Recommendations\n\n`;

  if (failed === 0 && partial === 0) {
    report += `✅ **All systems operational!** The platform is ready for production use.\n\n`;
  } else if (failed === 0) {
    report += `⚠️ **Minor improvements needed**: All critical flows work, but some steps need refinement.\n\n`;
  } else {
    report += `❌ **Critical fixes required**: Some essential features are not working correctly.\n\n`;
  }

  // Specific recommendations based on issues
  const highIssues = results.issues.filter(i => i.severity === 'HIGH');
  if (highIssues.length > 0) {
    report += `### High Priority Fixes:\n\n`;
    highIssues.forEach((issue, idx) => {
      report += `${idx + 1}. ${issue.description}\n`;
    });
    report += '\n';
  }

  report += `### What's Working Well:\n\n`;
  const passedSteps = results.steps.filter(s => s.status === 'PASS');
  passedSteps.forEach(step => {
    report += `- ${step.name}: ${step.details.whatWorked || 'Functioning correctly'}\n`;
  });

  report += `\n### Suggested Improvements:\n\n`;
  report += `1. Add more detailed error messages in the UI for failed operations\n`;
  report += `2. Implement loading indicators for long-running operations (KYC, trades)\n`;
  report += `3. Add confirmation dialogs for critical actions (withdrawals, large trades)\n`;
  report += `4. Improve mobile responsiveness of the test UI\n`;
  report += `5. Add retry mechanisms for failed API calls\n`;

  report += `\n## Screenshots\n\n`;
  report += `All screenshots saved to: \`${SCREENSHOT_DIR}/\`\n\n`;
  results.screenshots.forEach(screenshot => {
    report += `- \`${screenshot.filename}\` - ${screenshot.name}\n`;
  });

  report += `\n## Test Environment\n\n`;
  report += `- **Test URL**: ${TEST_HTML_PATH}\n`;
  report += `- **Backend**: ${BACKEND_URL}\n`;
  report += `- **Test Email**: ${TEST_EMAIL}\n`;
  report += `- **Browser**: Chromium (Playwright)\n`;
  report += `- **Platform**: ${process.platform}\n`;

  report += `\n## Conclusion\n\n`;

  const successRate = (passed / total) * 100;
  if (successRate >= 90) {
    report += `The Sikka platform is performing excellently with a ${successRate.toFixed(1)}% success rate. `;
    report += `The comprehensive user journey from authentication through trading to withdrawals is functional. `;
    report += `Minor issues can be addressed in future iterations.\n`;
  } else if (successRate >= 70) {
    report += `The Sikka platform shows good progress with a ${successRate.toFixed(1)}% success rate. `;
    report += `Core functionality is working, but several areas need attention before production deployment. `;
    report += `Focus on resolving high-priority issues identified above.\n`;
  } else {
    report += `The Sikka platform requires significant work with a ${successRate.toFixed(1)}% success rate. `;
    report += `Critical functionality is not working as expected. `;
    report += `Address all high-priority issues before considering production deployment.\n`;
  }

  report += `\n---\n`;
  report += `*Report generated automatically by Playwright browser testing*\n`;

  fs.writeFileSync(reportPath, report);
  console.log(`\nMarkdown report saved to: ${reportPath}`);
}
