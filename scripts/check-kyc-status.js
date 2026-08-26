#!/usr/bin/env node

/**
 * Check KYC Status Script
 *
 * Usage: node scripts/check-kyc-status.js [UID]
 * Example: node scripts/check-kyc-status.js 251603818
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const kucoin = require('../backend/src/services/kucoin.service');

const uid = process.argv[2];

if (!uid) {
  console.error('❌ ERROR: UID is required');
  console.error('Usage: node scripts/check-kyc-status.js [UID]');
  console.error('Example: node scripts/check-kyc-status.js 251603818');
  process.exit(1);
}

(async () => {
  try {
    console.log(`Checking KYC status for UID ${uid}...\n`);

    const result = await kucoin.getKYCStatus(uid);

    if (result.code === '200000' && result.data[0]) {
      const status = result.data[0];

      console.log('═══════════════════════════════════════');
      console.log('UID:', uid);
      console.log('Status:', status.status);
      console.log('Reject Reason:', status.rejectReason || 'N/A');

      const statusMap = {
        'NONE': '❓ No KYC submitted',
        'PROCESS': '⏳ Under manual review',
        'PASS': '✅ Approved - KYC verified!',
        'REJECT': '❌ Rejected'
      };

      console.log('Interpretation:', statusMap[status.status] || 'Unknown');
      console.log('═══════════════════════════════════════');

      // Exit codes for scripting
      if (status.status === 'PASS') {
        process.exit(0); // Success
      } else if (status.status === 'REJECT') {
        process.exit(2); // Rejected
      } else if (status.status === 'PROCESS') {
        process.exit(1); // Still processing
      } else {
        process.exit(3); // Unknown state
      }

    } else {
      console.error('❌ Failed to retrieve KYC status');
      console.error('Response:', JSON.stringify(result, null, 2));
      process.exit(4);
    }

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    process.exit(5);
  }
})();
