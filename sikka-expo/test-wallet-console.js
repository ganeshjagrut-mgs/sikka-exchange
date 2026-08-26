const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture all console messages
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push({
      type: msg.type(),
      text: text,
      timestamp: new Date().toISOString()
    });
    // Print immediately for real-time monitoring
    console.log(`[${msg.type().toUpperCase()}] ${text}`);
  });

  // Capture page errors
  page.on('pageerror', error => {
    console.log(`[PAGE ERROR] ${error.message}`);
    consoleLogs.push({
      type: 'error',
      text: error.message,
      timestamp: new Date().toISOString()
    });
  });

  console.log('Navigating to http://localhost:8081...');
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle' });

  console.log('\n=== Waiting for page to fully load ===\n');
  await page.waitForTimeout(3000);

  console.log('\n=== Checking for error overlays ===\n');

  // Check for and dismiss any error overlays - try multiple times
  for (let i = 0; i < 3; i++) {
    const dismissButton = page.locator('button:has-text("Dismiss"), button:has-text("Close"), button:has-text("OK")').first();
    const isDismissVisible = await dismissButton.isVisible({ timeout: 2000 }).catch(() => false);

    if (isDismissVisible) {
      console.log(`Found error overlay (attempt ${i + 1}), dismissing...`);
      await dismissButton.click();
      await page.waitForTimeout(1500);
    } else if (i === 0) {
      console.log('No error overlay found initially.');
    }
  }

  console.log('\n=== Checking if login is required ===\n');

  // Check if we're on the login page by looking for email input
  const emailInput = await page.locator('input[type="email"], input[placeholder*="email" i]').first();
  const isEmailInputVisible = await emailInput.isVisible({ timeout: 5000 }).catch(() => false);

  if (isEmailInputVisible) {
    console.log('Login page detected. Attempting to login...');

    // Fill in login credentials
    const passwordInput = await page.locator('input[type="password"]').first();

    console.log('Filling email: approved-kyc-trader@test.com');
    await emailInput.fill('approved-kyc-trader@test.com');
    await page.waitForTimeout(500);

    console.log('Filling password: Test123456');
    await passwordInput.fill('Test123456');
    await page.waitForTimeout(500);

    // Find and click the login/sign in button
    console.log('Looking for login button...');

    // Try using JavaScript to find and click the button
    console.log('Attempting to find and click button using JavaScript...');
    const clicked = await page.evaluate(() => {
      // Find all buttons on the page
      const buttons = Array.from(document.querySelectorAll('button, [role="button"], div[onclick]'));
      console.log(`Found ${buttons.length} clickable elements`);

      // Look for button containing "Sign In" or similar text
      const loginButton = buttons.find(btn => {
        const text = btn.textContent || btn.innerText || '';
        return text.includes('Sign In') || text.includes('Sign in') || text.includes('Login');
      });

      if (loginButton) {
        console.log('Found login button, attempting click...');
        loginButton.click();
        return true;
      }

      // If no text match, try to find the button after the password field
      const passwordInputs = document.querySelectorAll('input[type="password"]');
      if (passwordInputs.length > 0) {
        const lastPasswordInput = passwordInputs[passwordInputs.length - 1];
        const form = lastPasswordInput.closest('form') || lastPasswordInput.parentElement?.parentElement;
        if (form) {
          const formButtons = form.querySelectorAll('button');
          if (formButtons.length > 0) {
            console.log('Found button in password field parent, clicking...');
            formButtons[0].click();
            return true;
          }
        }
      }

      return false;
    });

    if (clicked) {
      console.log('Successfully clicked login button via JavaScript!');
    } else {
      console.log('Could not find login button via JavaScript');
    }

    // Wait for navigation after login
    console.log('Waiting for login to complete and redirect...');
    await page.waitForTimeout(5000);
  } else {
    console.log('Already logged in or no login required.');
  }

  console.log('\n=== Navigating to Wallet tab ===\n');

  // Wait a bit after login
  await page.waitForTimeout(2000);

  // Try to find and click wallet tab - look for various possible selectors
  let walletClicked = false;

  // Try text-based locators first
  const possibleSelectors = [
    'text="Wallet"',
    'button:has-text("Wallet")',
    '[data-testid="wallet-tab"]',
    'a[href*="wallet"]',
    'button[aria-label*="Wallet" i]'
  ];

  for (const selector of possibleSelectors) {
    try {
      const element = page.locator(selector).first();
      const isVisible = await element.isVisible({ timeout: 2000 }).catch(() => false);
      if (isVisible) {
        console.log(`Found wallet tab with selector: ${selector}`);
        await element.click();
        console.log('Clicked Wallet tab. Waiting for data to load...');
        walletClicked = true;
        break;
      }
    } catch (e) {
      // Try next selector
    }
  }

  if (!walletClicked) {
    console.log('Wallet tab not found with any selector. Looking for all navigation elements...');
    // Take a screenshot to see what's on screen
    await page.screenshot({ path: '/Users/devajmody/Repos/piermind/sikka/sikka-expo/before-wallet-click.png' });
    console.log('Screenshot saved to: before-wallet-click.png');
  }

  // Wait for wallet data to load
  console.log('Waiting 8 seconds for wallet data to fully load...');
  await page.waitForTimeout(8000);

  console.log('\n=== CAPTURED CONSOLE LOGS ===\n');

  // Filter and display WalletOverview logs
  const walletLogs = consoleLogs.filter(log => log.text.includes('[WalletOverview]'));

  if (walletLogs.length === 0) {
    console.log('⚠️  No [WalletOverview] logs found!');
    console.log('\nAll captured logs:');
    consoleLogs.forEach(log => {
      console.log(`[${log.type}] ${log.text}`);
    });
  } else {
    console.log(`Found ${walletLogs.length} [WalletOverview] log messages:\n`);
    walletLogs.forEach(log => {
      console.log(`[${log.timestamp}] [${log.type}] ${log.text}`);
    });
  }

  console.log('\n=== Taking screenshot for verification ===\n');
  await page.screenshot({ path: '/Users/devajmody/Repos/piermind/sikka/sikka-expo/wallet-debug-screenshot.png', fullPage: true });
  console.log('Screenshot saved to: wallet-debug-screenshot.png');

  console.log('\n=== Test complete. Browser will remain open for 10 seconds ===\n');
  await page.waitForTimeout(10000);

  await browser.close();
})();
