/**
 * Check broker MAIN and TRADE account balances
 */

// Load environment variables
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const envPath = fs.existsSync('/root/.env') ? '/root/.env' : path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

const kucoin = require('../src/services/kucoin.service');

async function checkBrokerBalance() {
  try {
    console.log('\n========================================');
    console.log('Broker Account Balances');
    console.log('========================================\n');

    // Check MAIN account
    console.log('📊 MAIN Account:\n');
    const mainAccounts = await kucoin.getAllAccounts('main', null);

    if (mainAccounts.code === '200000') {
      const nonZero = mainAccounts.data.filter(acc => parseFloat(acc.balance) > 0);
      if (nonZero.length === 0) {
        console.log('   (empty)\n');
      } else {
        nonZero.forEach(acc => {
          console.log(`   ${acc.currency}: ${acc.balance} (available: ${acc.available})`);
        });
        console.log('');
      }
    } else {
      console.error(`   ❌ Failed: ${mainAccounts.msg}\n`);
    }

    // Check TRADE account
    console.log('📊 TRADE Account:\n');
    const tradeAccounts = await kucoin.getAllAccounts('trade', null);

    if (tradeAccounts.code === '200000') {
      const nonZero = tradeAccounts.data.filter(acc => parseFloat(acc.balance) > 0);
      if (nonZero.length === 0) {
        console.log('   (empty)\n');
      } else {
        nonZero.forEach(acc => {
          console.log(`   ${acc.currency}: ${acc.balance} (available: ${acc.available})`);
        });
        console.log('');
      }
    } else {
      console.error(`   ❌ Failed: ${tradeAccounts.msg}\n`);
    }

    console.log('========================================\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkBrokerBalance();
