const dbService = require('./backend/src/services/db.service');
const kucoin = require('./backend/src/services/kucoin.service');

async function checkBalance() {
  try {
    // Get user
    const user = await dbService.findOne('users', { email: 'approved-kyc-trader@test.com' });
    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('User ID:', user.id);
    console.log('KuCoin UID:', user.kucoin_sub_account_uid);
    console.log('KYC Status:', user.kyc_status);
    console.log('');

    // Prepare API keys
    const apiKeys = {
      apiKey: user.kucoin_api_key,
      apiSecret: user.kucoin_api_secret,
      apiPassphrase: user.kucoin_api_passphrase
    };

    // Get MAIN account balances
    console.log('=== MAIN ACCOUNT ===');
    const mainAccounts = await kucoin.getAllAccounts('main', apiKeys);
    if (mainAccounts.code === '200000' && mainAccounts.data) {
      const nonZero = mainAccounts.data.filter(acc => parseFloat(acc.balance) > 0);
      if (nonZero.length === 0) {
        console.log('No balances');
      } else {
        nonZero.forEach(acc => {
          console.log(`${acc.currency}: ${acc.available} available, ${acc.balance} total, ${acc.holds} holds`);
        });
      }
    }
    console.log('');

    // Get TRADE account balances
    console.log('=== TRADE ACCOUNT ===');
    const tradeAccounts = await kucoin.getAllAccounts('trade', apiKeys);
    if (tradeAccounts.code === '200000' && tradeAccounts.data) {
      const nonZero = tradeAccounts.data.filter(acc => parseFloat(acc.balance) > 0);
      if (nonZero.length === 0) {
        console.log('No balances');
      } else {
        nonZero.forEach(acc => {
          console.log(`${acc.currency}: ${acc.available} available, ${acc.balance} total, ${acc.holds} holds`);
        });
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkBalance();
