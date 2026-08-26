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

  try {
    console.log('\n=== Navigating to wallet and capturing logs ===\n');

    // Navigate to app
    console.log('Step 1: Navigating to http://localhost:8081...');
    await page.goto('http://localhost:8081', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    console.log('✓ Page loaded\n');

    // Fill and submit login form
    console.log('Step 2: Logging in...');
    await page.locator('input[type="email"]').first().fill('approved-kyc-trader@test.com');
    await page.locator('input[type="password"]').first().fill('Test123456');

    // Press Enter to login (simpler than finding button)
    await page.locator('input[type="password"]').first().press('Enter');
    console.log('✓ Login initiated\n');

    // Wait for login to complete (look for dashboard)
    console.log('Step 3: Waiting for dashboard to load...');
    await page.waitForTimeout(8000);
    console.log('✓ Dashboard loaded\n');

    // Find and click Wallet tab - try multiple approaches
    console.log('Step 4: Finding Wallet tab...');

    try {
      // First try: Look for text "Wallet" (case-insensitive)
      const walletButton = page.getByText('Wallet', { exact: false });
      await walletButton.click();
      console.log('✓ Clicked Wallet tab (method 1)\n');
    } catch (e1) {
      console.log('Method 1 failed, trying method 2...');
      try {
        // Second try: Look for any element containing "Wallet"
        await page.locator('text=/wallet/i').first().click();
        console.log('✓ Clicked Wallet tab (method 2)\n');
      } catch (e2) {
        console.log('Method 2 failed, trying method 3...');
        try {
          // Third try: Look for the tab bar and click second item (Wallet is usually second)
          await page.locator('[role="tablist"] > *').nth(1).click();
          console.log('✓ Clicked Wallet tab (method 3)\n');
        } catch (e3) {
          console.log('All methods failed. Taking screenshot for manual inspection...');
          await page.screenshot({ path: '/Users/devajmody/Repos/piermind/sikka/debug-wallet-tab-not-found.png' });
          throw new Error('Could not find Wallet tab');
        }
      }
    }

    // Wait for wallet page to load
    console.log('Step 5: Waiting for wallet data to load...');
    await page.waitForTimeout(8000);
    console.log('✓ Wallet data loaded\n');

    // Take final screenshot
    await page.screenshot({ path: '/Users/devajmody/Repos/piermind/sikka/debug-wallet-final.png' });

    // Print WalletOverview logs
    console.log('\n=== [WalletOverview] LOGS ===\n');
    const walletLogs = consoleLogs.filter(log => log.includes('[WalletOverview]'));
    if (walletLogs.length === 0) {
      console.log('⚠️  No [WalletOverview] logs found. Here are all balance-related logs:\n');
      const balanceLogs = consoleLogs.filter(log =>
        log.toLowerCase().includes('balance') ||
        log.toLowerCase().includes('portfolio') ||
        log.toLowerCase().includes('allocation') ||
        log.toLowerCase().includes('wallet')
      );
      balanceLogs.forEach(log => console.log(log));
    } else {
      walletLogs.forEach(log => console.log(log));
    }

    console.log('\n=== Test completed successfully ===\n');

  } catch (error) {
    console.error('\n❌ Error during test:', error.message);
    await page.screenshot({ path: '/Users/devajmody/Repos/piermind/sikka/debug-error.png' });
  } finally {
    console.log('Browser will stay open for 30 seconds for manual inspection...\n');
    await page.waitForTimeout(30000);
    await browser.close();
  }
})();
