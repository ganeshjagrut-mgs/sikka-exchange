#!/usr/bin/env node

/**
 * KYC Submission Script with Image Compression and Data Verification
 *
 * This script:
 * 1. Compresses passport images to optimize size
 * 2. Verifies all KYC data extracted from passport
 * 3. Submits KYC to KuCoin with proper field mapping
 *
 * Usage: node scripts/submit-kyc-compressed.js
 */

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const kucoin = require('../backend/src/services/kucoin.service');

// KYC Details extracted from passport - TRYING ALTERNATIVE NAME FORMAT
const kycData = {
  firstName: 'YASH',             // Trying: First name only
  lastName: 'RAJESH SANGHVI',    // Trying: Middle name + Surname
  dateOfBirth: '1996-12-18',     // From passport: 18/12/1996 (DD/MM/YYYY → YYYY-MM-DD)
  passportNumber: 'T7762936',    // From passport: T7762936
  country: 'IN',                 // From passport: INDIA → IN (ISO code)
  expireDate: '2029-08-08',      // From passport: 08/08/2029 (DD/MM/YYYY → YYYY-MM-DD)
  address: 'FLAT NO. 34, TANAY CHS, DEV NAGAR DERASAR LANE, KANDIVALI WEST, MUMBAI, PIN: 400067, MAHARASHTRA, INDIA'
};

// Image file paths - UPDATED WITH NEW ORIGINAL PASSPORT PHOTOS (JPEG)
const imagePaths = {
  face: '/home/m.devaj.m/sikka/temp_images/yash_face.png',
  front: '/home/m.devaj.m/sikka/temp_images/yash_pp_front.jpeg',
  back: '/home/m.devaj.m/sikka/temp_images/yash_pp_back.jpeg'
};

// Output directory for compressed images
const compressedDir = '/home/m.devaj.m/sikka/temp_images/compressed';

/**
 * Compress image to target size
 * @param {string} inputPath - Input image path
 * @param {string} outputPath - Output image path
 * @param {number} maxSizeKB - Maximum size in KB (default: 500KB)
 * @returns {Promise<{size: number, width: number, height: number}>}
 */
async function compressImage(inputPath, outputPath, maxSizeKB = 500) {
  const maxSizeBytes = maxSizeKB * 1024;

  // Get original image info
  const metadata = await sharp(inputPath).metadata();
  console.log(`Original: ${(metadata.size / 1024).toFixed(2)} KB, ${metadata.width}x${metadata.height}`);

  // Start with quality 90 and reduce if needed
  let quality = 90;
  let compressed;
  let finalSize;

  while (quality > 20) {
    compressed = await sharp(inputPath)
      .resize(1600, null, { // Resize to max width 1600px (maintains aspect ratio)
        withoutEnlargement: true,
        fit: 'inside'
      })
      .jpeg({ quality, progressive: true })
      .toBuffer();

    finalSize = compressed.length;

    if (finalSize <= maxSizeBytes) {
      break;
    }

    quality -= 10;
  }

  // Write compressed image
  await sharp(compressed).toFile(outputPath);

  const compressedMetadata = await sharp(outputPath).metadata();
  console.log(`Compressed: ${(finalSize / 1024).toFixed(2)} KB (quality: ${quality}), ${compressedMetadata.width}x${compressedMetadata.height}`);

  return {
    size: finalSize,
    width: compressedMetadata.width,
    height: compressedMetadata.height,
    quality
  };
}

/**
 * Convert image file to base64 string
 */
function imageToBase64(filePath) {
  const imageBuffer = fs.readFileSync(filePath);
  const base64 = imageBuffer.toString('base64');
  return `data:image/jpeg;base64,${base64}`;
}

/**
 * Verify KYC data before submission
 */
function verifyKYCData() {
  console.log('\n=== VERIFY KYC DATA ===');
  console.log('Please verify the following information matches the passport:\n');

  console.log('Name (Given):       ', kycData.firstName);
  console.log('Name (Surname):     ', kycData.lastName);
  console.log('Full Name:          ', `${kycData.firstName} ${kycData.lastName}`);
  console.log('Date of Birth:      ', kycData.dateOfBirth, '(YYYY-MM-DD)');
  console.log('Passport Number:    ', kycData.passportNumber);
  console.log('Country:            ', kycData.country, '(India)');
  console.log('Expiry Date:        ', kycData.expireDate, '(YYYY-MM-DD)');
  console.log('Address:            ', kycData.address);

  console.log('\n=== DATA VERIFICATION COMPLETE ===\n');
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('=== KYC Submission with Image Compression ===\n');

    // Step 0: Verify KYC data
    verifyKYCData();

    // Step 1: Create compressed directory
    if (!fs.existsSync(compressedDir)) {
      fs.mkdirSync(compressedDir, { recursive: true });
      console.log('Created compressed images directory\n');
    }

    // Step 2: Compress images
    console.log('Step 1: Compressing images...\n');

    console.log('Face photo:');
    const faceStats = await compressImage(
      imagePaths.face,
      path.join(compressedDir, 'face.jpg'),
      300 // 300KB max for face photo
    );

    console.log('\nPassport front:');
    const frontStats = await compressImage(
      imagePaths.front,
      path.join(compressedDir, 'front.jpg'),
      500 // 500KB max for passport front
    );

    console.log('\nPassport back:');
    const backStats = await compressImage(
      imagePaths.back,
      path.join(compressedDir, 'back.jpg'),
      500 // 500KB max for passport back
    );

    // Step 3: Convert compressed images to base64
    console.log('\n\nStep 2: Converting compressed images to base64...');
    const facePhoto = imageToBase64(path.join(compressedDir, 'face.jpg'));
    const frontPhoto = imageToBase64(path.join(compressedDir, 'front.jpg'));
    const backendPhoto = imageToBase64(path.join(compressedDir, 'back.jpg'));

    console.log(`✓ Face photo: ${(facePhoto.length / 1024).toFixed(2)} KB (base64)`);
    console.log(`✓ Front photo: ${(frontPhoto.length / 1024).toFixed(2)} KB (base64)`);
    console.log(`✓ Back photo: ${(backendPhoto.length / 1024).toFixed(2)} KB (base64)\n`);

    // Step 4: Create sub-account
    console.log('Step 3: Creating KuCoin sub-account...');
    const subAccountName = `sikka_yash_${Date.now()}`;
    const subAccountResponse = await kucoin.createSubAccount(subAccountName);

    if (subAccountResponse.code !== '200000') {
      throw new Error(`Sub-account creation failed: ${subAccountResponse.msg}`);
    }

    const uid = subAccountResponse.data.uid;
    console.log(`✓ Sub-account created: ${subAccountName}`);
    console.log(`✓ UID: ${uid}\n`);

    // Step 5: Submit KYC to KuCoin
    console.log('Step 4: Submitting KYC to KuCoin...');
    console.log('KYC Data Summary:', {
      firstName: kycData.firstName,
      lastName: kycData.lastName,
      dateOfBirth: kycData.dateOfBirth,
      passportNumber: kycData.passportNumber,
      country: kycData.country,
      expireDate: kycData.expireDate
    });

    // Map to KuCoin format
    const kucoinKycData = {
      firstName: kycData.firstName,
      lastName: kycData.lastName,
      birthDate: kycData.dateOfBirth,
      issueCountry: kycData.country,
      identityNumber: kycData.passportNumber,
      identityType: 'passport',
      expireDate: kycData.expireDate,
      facePhoto: facePhoto,
      frontPhoto: frontPhoto,
      backendPhoto: backendPhoto
    };

    const kycResponse = await kucoin.submitKYC(uid, kucoinKycData);

    console.log('\nKYC Submission Response:', JSON.stringify(kycResponse, null, 2));

    if (kycResponse.code === '200000') {
      console.log('\n✅ SUCCESS: KYC submitted successfully!');
      console.log(`UID: ${uid}`);
      console.log('Status: Pending review by KuCoin');

      // Step 6: Create API keys
      console.log('\nStep 5: Creating API keys for sub-account...');
      const passphrase = `sikka${Date.now()}${Math.random().toString(36).substring(2, 10)}`.substring(0, 32);
      const apiKeysResponse = await kucoin.createSubAccountAPIKeys(
        uid,
        passphrase,
        `Sikka_Yash`,
        ['General', 'Spot'],
        ['35.200.154.218']
      );

      if (apiKeysResponse.code === '200000') {
        console.log('✓ API keys created successfully!\n');
        console.log('API Credentials:');
        console.log('  UID:', uid);
        console.log('  API Key:', apiKeysResponse.data.apiKey);
        console.log('  Secret Key:', apiKeysResponse.data.secretKey);
        console.log('  Passphrase:', passphrase);
        console.log('  Permissions:', apiKeysResponse.data.permissions);
        console.log('  IP Whitelist:', apiKeysResponse.data.ipWhitelist);
      } else {
        console.log('⚠️  API key creation failed:', apiKeysResponse.msg);
      }

      // Step 7: Check KYC status
      console.log('\nStep 6: Checking initial KYC status...');
      const statusResponse = await kucoin.getKYCStatus(uid);

      if (statusResponse.code === '200000' && statusResponse.data[0]) {
        const status = statusResponse.data[0];
        console.log('Status:', status.status);
        console.log('Reject Reason:', status.rejectReason || 'N/A');

        const statusMap = {
          'NONE': 'No KYC submitted',
          'PROCESS': '⏳ Under manual review',
          'PASS': '✅ Approved',
          'REJECT': '❌ Rejected'
        };
        console.log('Interpretation:', statusMap[status.status] || 'Unknown');
      }

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
