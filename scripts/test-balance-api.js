require('dotenv').config();
const axios = require('axios');
const kucoin = require('../backend/src/services/kucoin.service');
const db = require('../backend/src/config/database');

async function testBalanceAPI() {
  try {
    console.log('\n=== TESTING BALANCE API ===\n');
    
    // Get user from DB
    const userResult = await db.query(
      'SELECT id, email, kucoin_api_key, kucoin_api_secret, kucoin_api_passphrase FROM users WHERE email = $1',
      ['approved-kyc-trader@test.com']
    );
    
    const user = userResult.rows[0];
    console.log('User:', user.email);
    console.log('User ID:', user.id);
    
    const apiKeys = {
      apiKey: user.kucoin_api_key,
      apiSecret: user.kucoin_api_secret,
      apiPassphrase: user.kucoin_api_passphrase
    };
    
    // Get KuCoin balance
    console.log('\n--- KuCoin TRADE Account ---');
    const kucoinBalance = await kucoin.getBalance('USDT', 'trade', apiKeys);
    const tradeData = kucoinBalance.data[0] || {};
    console.log('Available:', tradeData.available || '0');
    console.log('Hold:', tradeData.holds || '0');
    console.log('Total:', tradeData.balance || '0');
    
    // Get deposit info from DB
    console.log('\n--- Database Deposit Info ---');
    const depositResult = await db.query(
      'SELECT id, amount_inr, actual_usdt, usdt_inr_rate, status FROM deposits WHERE user_id = $1 ORDER BY requested_at DESC LIMIT 1',
      [user.id]
    );
    
    if (depositResult.rows.length > 0) {
      const deposit = depositResult.rows[0];
      console.log('Last Deposit:');
      console.log('  Amount INR:', deposit.amount_inr);
      console.log('  Actual USDT:', deposit.actual_usdt);
      console.log('  Rate:', deposit.usdt_inr_rate);
      console.log('  Status:', deposit.status);
    }
    
    // Calculate expected values
    const usdtBalance = parseFloat(tradeData.balance || '0');
    const usdtRate = 84.5; // From deposit
    const portfolioValue = usdtBalance * usdtRate;
    
    console.log('\n--- Calculated Values ---');
    console.log('USDT Balance:', usdtBalance);
    console.log('USDT/INR Rate:', usdtRate);
    console.log('Portfolio Value (INR):', portfolioValue.toFixed(2));
    console.log('Expected Display: ₹' + portfolioValue.toFixed(2));
    
    // Expected math check
    console.log('\n--- Math Verification ---');
    console.log('11.83 × 84.5 =', (11.83 * 84.5).toFixed(2));
    console.log('Should display: ₹999.64 or ₹1,000');
    
    await db.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await db.end();
    process.exit(1);
  }
}

testBalanceAPI();
