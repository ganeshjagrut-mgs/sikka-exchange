#!/usr/bin/env node

/**
 * KYC Resubmission Script - Reuses existing sub-account UID
 *
 * This script demonstrates the CORRECT approach:
 * - 1 user = 1 sub-account = 1 UID (permanent)
 * - Resubmit KYC for the SAME UID when rejected
 * - Do NOT create new sub-accounts for the same person
 *
 * Usage: node scripts/resubmit-kyc.js [UID]
 * Example: node scripts/resubmit-kyc.js 251603818
 */

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const kucoin = require('../backend/src/services/kucoin.service');

// Get UID from command line argument
const uid = process.argv[2];

if (!uid) {
  console.error('❌ ERROR: UID is required');
  console.error('Usage: node scripts/resubmit-kyc.js [UID]');
  console.error('Example: node scripts/resubmit-kyc.js 251603818');
  process.exit(1);
}

// KYC Details extracted from passport
const kycData = {
  firstName: 'YASH',
  lastName: 'RAJESH SANGHVI',
  dateOfBirth: '1996-12-18',
  passportNumber: 'T7762936',
  country: 'IN',
  expireDate: '2029-08-08',
  address: 'FLAT NO. 34, TANAY CHS, DEV NAGAR DERASAR LANE, KANDIVALI WEST, MUMBAI, PIN: 400067, MAHARASHTRA, INDIA'
};

// Image file paths
const imagePaths = {
  face: '/home/m.devaj.m/sikka/temp_images/yash_photo.png',
  front: '/home/m.devaj.m/sikka/temp_images/yash_pp_front.png',
  back: '/home/m.devaj.m/sikka/temp_images/yash_pp_back.png'
};

// Output directory for compressed images
const compressedDir = '/home/m.devaj.m/sikka/temp_images/compressed';

/**
 * Compress image to target size
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
      .resize(1600, null, {
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
 * Main function
 */
async function main() {
  try {
    console.log('=== KYC Resubmission for Existing Sub-Account ===\n');
    console.log(`UID: ${uid}`);
    console.log('Note: Reusing existing sub-account (correct approach)\n');

    // Step 1: Check current KYC status
    console.log('Step 1: Checking current KYC status...');
    const currentStatus = await kucoin.getKYCStatus(uid);

    if (currentStatus.code === '200000' && currentStatus.data[0]) {
      const status = currentStatus.data[0];
      console.log(`Current Status: ${status.status}`);
      console.log(`Reject Reason: ${status.rejectReason || 'N/A'}\n`);
    } else {
      console.log('Could not retrieve current status\n');
    }

    // Step 2: Create compressed directory
    if (!fs.existsSync(compressedDir)) {
      fs.mkdirSync(compressedDir, { recursive: true });
      console.log('Created compressed images directory\n');
    }

    // Step 3: Compress images
    console.log('Step 2: Compressing images...\n');

    console.log('Face photo:');
    await compressImage(
      imagePaths.face,
      path.join(compressedDir, 'face.jpg'),
      300
    );

    console.log('\nPassport front:');
    await compressImage(
      imagePaths.front,
      path.join(compressedDir, 'front.jpg'),
      500
    );

    console.log('\nPassport back:');
    await compressImage(
      imagePaths.back,
      path.join(compressedDir, 'back.jpg'),
      500
    );

    // Step 4: Convert compressed images to base64
    console.log('\n\nStep 3: Converting compressed images to base64...');
    const facePhoto = imageToBase64(path.join(compressedDir, 'face.jpg'));
    const frontPhoto = imageToBase64(path.join(compressedDir, 'front.jpg'));
    const backendPhoto = imageToBase64(path.join(compressedDir, 'back.jpg'));

    console.log(`✓ Face photo: ${(facePhoto.length / 1024).toFixed(2)} KB (base64)`);
    console.log(`✓ Front photo: ${(frontPhoto.length / 1024).toFixed(2)} KB (base64)`);
    console.log(`✓ Back photo: ${(backendPhoto.length / 1024).toFixed(2)} KB (base64)\n`);

    // Step 5: Resubmit KYC to KuCoin (SAME UID)
    console.log('Step 4: Resubmitting KYC to KuCoin...');
    console.log('KYC Data Summary:', {
      uid: uid,
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

    console.log('\nKYC Resubmission Response:', JSON.stringify(kycResponse, null, 2));

    if (kycResponse.code === '200000') {
      console.log('\n✅ SUCCESS: KYC resubmitted successfully!');
      console.log(`UID: ${uid} (reused existing sub-account)`);
      console.log('Status: Pending review by KuCoin');

      // Step 6: Check updated KYC status
      console.log('\nStep 5: Checking updated KYC status...');
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
      console.log('\n❌ FAILED: KYC resubmission failed');
      console.log('Error:', kycResponse.msg);

      // Check if error indicates we cannot resubmit for same UID
      if (kycResponse.msg && kycResponse.msg.includes('already')) {
        console.log('\n⚠️  NOTE: This error suggests KYC may already exist for this UID');
        console.log('KuCoin may not allow multiple submissions for the same UID');
        console.log('Contact KuCoin support to confirm the correct resubmission process');
      }
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
