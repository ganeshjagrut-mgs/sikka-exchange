#!/usr/bin/env node

/**
 * Script to submit KYC for Yash with real passport documents
 *
 * This script:
 * 1. Reads passport images from Desktop
 * 2. Converts them to base64
 * 3. Submits KYC directly to KuCoin API (bypassing backend for testing)
 *
 * Usage: node scripts/submit-yash-kyc.js
 */

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const kucoin = require('../backend/src/services/kucoin.service');

// KYC Details extracted from passport
const kycData = {
  firstName: 'YASH RAJESH', // Full given name as shown on passport
  lastName: 'SANGHVI',
  dateOfBirth: '1996-12-18', // YYYY-MM-DD format
  passportNumber: 'T7762936',
  country: 'IN', // India
  expireDate: '2029-08-08', // YYYY-MM-DD format
  address: 'FLAT NO. 34, TANAY CHS, DEV NAGAR DERASAR LANE, KANDIVALI WEST, MUMBAI, PIN: 400067, MAHARASHTRA, INDIA'
};

// Image file paths (Desktop)
const desktopPath = '/Users/devajmody/Desktop';
const imageFiles = {
  face: path.join(desktopPath, 'yash_photo.png'),
  front: path.join(desktopPath, 'yash_pp_front.png'),
  back: path.join(desktopPath, 'yash_pp_back.png')
};

/**
 * Convert image file to base64 string
 */
function imageToBase64(filePath) {
  try {
    const imageBuffer = fs.readFileSync(filePath);
    const base64 = imageBuffer.toString('base64');
    const mimeType = 'image/png';
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error(`Error reading image ${filePath}:`, error.message);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('=== Yash KYC Submission Script ===\n');

    // Step 1: Read and convert images to base64
    console.log('Step 1: Converting images to base64...');
    const facePhoto = imageToBase64(imageFiles.face);
    const frontPhoto = imageToBase64(imageFiles.front);
    const backendPhoto = imageToBase64(imageFiles.back);

    console.log(`✓ Face photo: ${(facePhoto.length / 1024).toFixed(2)} KB`);
    console.log(`✓ Front photo: ${(frontPhoto.length / 1024).toFixed(2)} KB`);
    console.log(`✓ Back photo: ${(backendPhoto.length / 1024).toFixed(2)} KB\n`);

    // Step 2: Create sub-account (if needed)
    console.log('Step 2: Creating KuCoin sub-account...');
    const subAccountName = `sikka_yash_${Date.now()}`;
    const subAccountResponse = await kucoin.createSubAccount(subAccountName);

    if (subAccountResponse.code !== '200000') {
      throw new Error(`Sub-account creation failed: ${subAccountResponse.msg}`);
    }

    const uid = subAccountResponse.data.uid;
    console.log(`✓ Sub-account created: ${subAccountName}`);
    console.log(`✓ UID: ${uid}\n`);

    // Step 3: Submit KYC to KuCoin
    console.log('Step 3: Submitting KYC to KuCoin...');
    console.log('KYC Data:', {
      firstName: kycData.firstName,
      lastName: kycData.lastName,
      dateOfBirth: kycData.dateOfBirth,
      passportNumber: kycData.passportNumber,
      country: kycData.country,
      expireDate: kycData.expireDate
    });

    // Map to KuCoin format (use correct field names per validation.js)
    const kucoinKycData = {
      firstName: kycData.firstName,
      lastName: kycData.lastName,
      birthDate: kycData.dateOfBirth, // KuCoin uses 'birthDate'
      issueCountry: kycData.country, // KuCoin uses 'issueCountry'
      identityNumber: kycData.passportNumber, // KuCoin uses 'identityNumber'
      identityType: 'passport', // lowercase for KuCoin
      expireDate: kycData.expireDate,
      facePhoto: facePhoto, // Correct: facePhoto (not faceImage)
      frontPhoto: frontPhoto, // Correct: frontPhoto (not frontImage)
      backendPhoto: backendPhoto // Correct: backendPhoto (not backImage)
    };

    const kycResponse = await kucoin.submitKYC(uid, kucoinKycData);

    console.log('\nKYC Submission Response:', JSON.stringify(kycResponse, null, 2));

    if (kycResponse.code === '200000') {
      console.log('\n✅ SUCCESS: KYC submitted successfully!');
      console.log(`UID: ${uid}`);
      console.log('Status: Pending review by KuCoin');

      // Step 4: Create API keys for the sub-account
      console.log('\nStep 4: Creating API keys for sub-account...');
      const passphrase = `sikka${Date.now()}${Math.random().toString(36).substring(2, 10)}`.substring(0, 32);
      const apiKeysResponse = await kucoin.createSubAccountAPIKeys(
        uid,
        passphrase,
        `Sikka_Yash`,
        ['General', 'Spot'],
        ['35.200.154.218'] // GCP server IP (required by KuCoin)
      );

      if (apiKeysResponse.code === '200000') {
        console.log('✓ API keys created successfully!');
        console.log('Full Response:', JSON.stringify(apiKeysResponse.data, null, 2));
        console.log('\nAPI Credentials:');
        console.log('  API Key:', apiKeysResponse.data.apiKey || 'N/A');
        console.log('  API Secret:', apiKeysResponse.data.secret || apiKeysResponse.data.apiSecret || 'N/A');
        console.log('  Passphrase:', passphrase); // We know the passphrase (we generated it)
      } else {
        console.log('⚠️  API key creation failed:', apiKeysResponse.msg);
      }

      // Step 5: Check KYC status
      console.log('\nStep 5: Checking KYC status...');
      const statusResponse = await kucoin.getKYCStatus(uid);
      console.log('KYC Status Response:', JSON.stringify(statusResponse, null, 2));

    } else {
      console.log('\n❌ FAILED: KYC submission failed');
      console.log('Error:', kycResponse.msg);
    }

    console.log('\n=== Script Complete ===');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the script
main();
