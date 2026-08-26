const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Array to store all console logs
  const consoleLogs = [];

  // Capture all console messages
  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    const timestamp = new Date().toISOString();

    const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${text}`;
    consoleLogs.push(logEntry);
    console.log(logEntry);
  });

  // Capture page errors
  page.on('pageerror', error => {
    const logEntry = `[${new Date().toISOString()}] [PAGE ERROR] ${error.message}`;
    consoleLogs.push(logEntry);
    console.log(logEntry);
  });

  try {
    console.log('\n=== Starting wallet balance debug test ===\n');

    // Navigate to app
    console.log('Step 1: Navigating to http://localhost:8081...');
    await page.goto('http://localhost:8081', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    console.log('✓ Page loaded\n');

    // Take screenshot of initial state
    await page.screenshot({ path: '/Users/devajmody/Repos/piermind/sikka/debug-login-page.png' });
    console.log('✓ Screenshot saved: debug-login-page.png\n');

    // Find and fill email field
    console.log('Step 2: Finding and filling email field...');
    const emailInput = await page.locator('input[type="email"], input[placeholder*="email" i], input[name*="email" i]').first();
    await emailInput.waitFor({ timeout: 10000 });
    await emailInput.fill('approved-kyc-trader@test.com');
    console.log('✓ Email filled\n');

    // Find and fill password field
    console.log('Step 3: Finding and filling password field...');
    const passwordInput = await page.locator('input[type="password"], input[placeholder*="password" i], input[name*="password" i]').first();
    await passwordInput.waitFor({ timeout: 10000 });
    await passwordInput.fill('Test123456');
    console.log('✓ Password filled\n');

    // Take screenshot before login
    await page.screenshot({ path: '/Users/devajmody/Repos/piermind/sikka/debug-before-login.png' });

    // Find and click login button
    console.log('Step 4: Clicking login button...');
    const loginButton = await page.locator('button:has-text("Login"), button:has-text("Sign In"), [role="button"]:has-text("Login"), [role="button"]:has-text("Sign In")').first();
    await loginButton.click();
    console.log('✓ Login button clicked\n');

    // Wait for navigation/login to complete
    console.log('Step 5: Waiting for login to complete...');
    await page.waitForTimeout(5000);
    console.log('✓ Login completed\n');

    // Take screenshot after login
    await page.screenshot({ path: '/Users/devajmody/Repos/piermind/sikka/debug-after-login.png' });

    // Navigate to Wallet tab
    console.log('Step 6: Navigating to Wallet tab...');
    const walletTab = await page.locator('button:has-text("Wallet"), [role="button"]:has-text("Wallet"), text="Wallet"').first();
    await walletTab.waitFor({ timeout: 10000 });
    await walletTab.click();
    console.log('✓ Wallet tab clicked\n');

    // Wait for wallet data to load
    console.log('Step 7: Waiting for wallet data to load...');
    await page.waitForTimeout(5000);
    console.log('✓ Wallet data should be loaded\n');

    // Take screenshot of wallet page
    await page.screenshot({ path: '/Users/devajmody/Repos/piermind/sikka/debug-wallet-page.png' });

    // Wait a bit more to capture any delayed logs
    console.log('Step 8: Waiting for additional logs...');
    await page.waitForTimeout(3000);
    console.log('✓ All logs captured\n');

    // Print summary of captured logs
    console.log('\n=== CONSOLE LOGS SUMMARY ===\n');
    console.log(`Total logs captured: ${consoleLogs.length}\n`);

    // Filter and display WalletOverview logs
    console.log('=== [WalletOverview] LOGS ===\n');
    const walletLogs = consoleLogs.filter(log => log.includes('[WalletOverview]'));
    walletLogs.forEach(log => console.log(log));

    console.log('\n=== BALANCE-RELATED LOGS ===\n');
    const balanceLogs = consoleLogs.filter(log =>
      log.toLowerCase().includes('balance') ||
      log.toLowerCase().includes('portfolio') ||
      log.toLowerCase().includes('allocation')
    );
    balanceLogs.forEach(log => console.log(log));

    console.log('\n=== ALL CONSOLE LOGS ===\n');
    consoleLogs.forEach(log => console.log(log));

  } catch (error) {
    console.error('\n❌ Error during test:', error.message);
    await page.screenshot({ path: '/Users/devajmody/Repos/piermind/sikka/debug-error.png' });
  } finally {
    console.log('\n=== Test completed ===\n');
    console.log('Press Ctrl+C to close browser and exit...\n');

    // Keep browser open for manual inspection
    await page.waitForTimeout(60000);
    await browser.close();
  }
})();
