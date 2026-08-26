#!/usr/bin/env node

require('dotenv').config();
const kucoin = require('../backend/src/services/kucoin.service');

const uid = process.argv[2] || '251702548';

(async () => {
  try {
    console.log(`Checking balance for UID: ${uid}\n`);

    // Get sub-account API keys first
    const keysResponse = await kucoin.getSubAccountAPIKeys(uid);
    const apiKeys = keysResponse.items && keysResponse.items.length > 0 ? keysResponse.items[0] : null;

    if (!apiKeys) {
      console.error('No API keys found for this sub-account');
      process.exit(1);
    }

    console.log(`Sub-account API keys retrieved: ${apiKeys.apiKey.substring(0, 10)}...\n`);

    // Check USDT in TRADE account
    const usdtBalance = await kucoin.getBalance('USDT', 'trade', apiKeys);
    console.log('USDT Balance (TRADE):');
    console.log(`  Available: ${usdtBalance.available}`);
    console.log(`  Hold: ${usdtBalance.hold}`);
    console.log(`  Total: ${usdtBalance.balance}\n`);

    // Check BTC in TRADE account
    const btcBalance = await kucoin.getBalance('BTC', 'trade', apiKeys);
    console.log('BTC Balance (TRADE):');
    console.log(`  Available: ${btcBalance.available}`);
    console.log(`  Hold: ${btcBalance.hold}`);
    console.log(`  Total: ${btcBalance.balance}`);

  } catch (err) {
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
})();
