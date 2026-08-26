#!/usr/bin/env node

// CRITICAL: Load environment variables FIRST before any other imports
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

/**
 * Get Sub-Account Deposit Address - USDT on BSC
 *
 * This script gets a specific sub-account's USDT deposit address on Binance Smart Chain.
 * Usage: node scripts/get-subaccount-deposit-address.js <sub_account_uid> <api_key> <api_secret> <api_passphrase>
 */

const kucoin = require('../backend/src/services/kucoin.service');

async function getSubAccountDepositAddress(subAccountUid, apiKey, apiSecret, apiPassphrase) {
  console.log('\n=================================================');
  console.log('GET SUB-ACCOUNT DEPOSIT ADDRESS - USDT (BSC)');
  console.log('=================================================\n');
  console.log(`Sub-Account UID: ${subAccountUid}`);
  console.log('');

  const apiKeys = {
    apiKey,
    apiSecret,
    apiPassphrase
  };

  try {
    // Step 1: Get existing deposit addresses
    console.log('Step 1: Checking existing deposit addresses...');
    const existingAddresses = await kucoin.getDepositAddress('USDT', 'bsc', apiKeys);

    if (existingAddresses.code === '200000' && existingAddresses.data && existingAddresses.data.length > 0) {
      console.log('✅ Found existing USDT-BSC deposit address(es):\n');

      existingAddresses.data.forEach((addr, index) => {
        console.log(`Address ${index + 1}:`);
        console.log(`  Chain: ${addr.chainName} (${addr.chainId})`);
        console.log(`  Address: ${addr.address}`);
        console.log(`  Memo: ${addr.memo || 'N/A'}`);
        console.log(`  Account: ${addr.to}`);
        console.log(`  Contract: ${addr.contractAddress || 'N/A'}`);
        console.log('');
      });

      // Find BSC address
      const bscAddress = existingAddresses.data.find(a => a.chainId === 'bsc');

      if (bscAddress) {
        console.log('✅ SUB-ACCOUNT USDT DEPOSIT ADDRESS (BSC):');
        console.log('====================================');
        console.log(`Address: ${bscAddress.address}`);
        console.log(`Chain: Binance Smart Chain (BSC)`);
        console.log(`Token: USDT (BEP20)`);
        console.log(`Sub-Account UID: ${subAccountUid}`);
        console.log('====================================\n');
        console.log('💡 Send USDT to this address to fund this sub-account');
        console.log('💡 Use this for deposits from external wallet/exchange\n');

        return bscAddress.address;
      } else {
        console.log('⚠️  BSC address not found, creating new one...\n');
        throw new Error('BSC_ADDRESS_NOT_FOUND');
      }
    } else {
      console.log('⚠️  No existing addresses found, creating new one...\n');
      throw new Error('NO_ADDRESSES_FOUND');
    }

  } catch (error) {
    if (error.message === 'BSC_ADDRESS_NOT_FOUND' || error.message === 'NO_ADDRESSES_FOUND') {
      // Step 2: Create deposit address if not found
      console.log('Step 2: Creating USDT deposit address on BSC for sub-account...');

      try {
        const newAddress = await kucoin.createDepositAddress('USDT', 'bsc', 'main', apiKeys);

        if (newAddress.code === '200000' && newAddress.data) {
          console.log('✅ Created new USDT-BSC deposit address:\n');
          console.log(`Address: ${newAddress.data.address}`);
          console.log(`Chain: ${newAddress.data.chainName} (${newAddress.data.chainId})`);
          console.log(`Memo: ${newAddress.data.memo || 'N/A'}`);
          console.log(`Account: ${newAddress.data.to}`);
          console.log('');

          console.log('✅ SUB-ACCOUNT USDT DEPOSIT ADDRESS (BSC):');
          console.log('====================================');
          console.log(`Address: ${newAddress.data.address}`);
          console.log(`Chain: Binance Smart Chain (BSC)`);
          console.log(`Token: USDT (BEP20)`);
          console.log(`Sub-Account UID: ${subAccountUid}`);
          console.log('====================================\n');
          console.log('💡 Send USDT to this address to fund this sub-account');
          console.log('💡 Use this for deposits from external wallet/exchange\n');

          return newAddress.data.address;
        } else {
          console.error('❌ Failed to create deposit address:', newAddress.msg || 'Unknown error');
          console.error('Response:', JSON.stringify(newAddress, null, 2));
          process.exit(1);
        }
      } catch (createError) {
        console.error('❌ Error creating deposit address:', createError.message);
        console.error('Details:', createError);
        process.exit(1);
      }
    } else {
      console.error('❌ Error getting deposit addresses:', error.message);
      console.error('Details:', error);
      process.exit(1);
    }
  }
}

// Run the script
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length !== 4) {
    console.error('Usage: node get-subaccount-deposit-address.js <sub_account_uid> <api_key> <api_secret> <api_passphrase>');
    console.error('Example: node get-subaccount-deposit-address.js 251702548 key123 secret456 pass789');
    process.exit(1);
  }

  const [subAccountUid, apiKey, apiSecret, apiPassphrase] = args;

  getSubAccountDepositAddress(subAccountUid, apiKey, apiSecret, apiPassphrase)
    .then(address => {
      console.log('Script completed successfully ✅');
      process.exit(0);
    })
    .catch(error => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { getSubAccountDepositAddress };
