#!/usr/bin/env node

/**
 * Generate curl command for KYC submission
 * This creates a ready-to-use curl command with all headers and base64 images
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Image paths (compressed)
const imagePaths = {
  face: '/home/m.devaj.m/sikka/temp_images/compressed/face.jpg',
  front: '/home/m.devaj.m/sikka/temp_images/compressed/front.jpg',
  back: '/home/m.devaj.m/sikka/temp_images/compressed/back.jpg'
};

// KYC Data
const kycData = {
  firstName: 'YASH',
  lastName: 'RAJESH SANGHVI',
  birthDate: '1996-12-18',
  issueCountry: 'IN',
  identityNumber: 'T7762936',
  identityType: 'passport',
  expireDate: '2029-08-08'
};

// Read credentials from env
const apiKey = process.env.KUCOIN_API_KEY;
const secretKey = process.env.KUCOIN_API_SECRET;
const passphrase = process.env.KUCOIN_API_PASSPHRASE;
const brokerName = process.env.KUCOIN_BROKER_NAME;
const apiPartner = process.env.KUCOIN_API_PARTNER;
const apiPartnerSecret = process.env.KUCOIN_API_PARTNER_SECRET;

// Convert images to base64
function imageToBase64(filePath) {
  const imageBuffer = fs.readFileSync(filePath);
  const base64 = imageBuffer.toString('base64');
  return `data:image/jpeg;base64,${base64}`;
}

// Generate signatures
function generateSignature(timestamp, method, endpoint, body) {
  const message = timestamp + method + endpoint + (body || '');
  return crypto.createHmac('sha256', secretKey).update(message).digest('base64');
}

function generatePassphraseSignature() {
  return crypto.createHmac('sha256', secretKey).update(passphrase).digest('base64');
}

function generatePartnerSignature(timestamp) {
  const message = timestamp + apiPartner + apiKey;
  return crypto.createHmac('sha256', apiPartnerSecret).update(message).digest('base64');
}

async function main() {
  console.log('=== Generating KYC Submission Curl ===\n');

  // Step 1: Read compressed images
  console.log('Reading compressed images...');
  const facePhoto = imageToBase64(imagePaths.face);
  const frontPhoto = imageToBase64(imagePaths.front);
  const backendPhoto = imageToBase64(imagePaths.back);
  console.log(`Face: ${(facePhoto.length / 1024).toFixed(2)} KB`);
  console.log(`Front: ${(frontPhoto.length / 1024).toFixed(2)} KB`);
  console.log(`Back: ${(backendPhoto.length / 1024).toFixed(2)} KB\n`);

  // Step 2: Create request body
  // NOTE: You need to create a sub-account first to get clientUid
  // For this curl, use UID from a created sub-account
  const clientUid = '251603818'; // Replace with actual UID from createSubAccount

  const requestBody = {
    clientUid: clientUid,
    ...kycData,
    facePhoto: facePhoto,
    frontPhoto: frontPhoto,
    backendPhoto: backendPhoto
  };

  const bodyString = JSON.stringify(requestBody);

  // Step 3: Generate headers
  const timestamp = Date.now().toString();
  const method = 'POST';
  const endpoint = '/api/kyc/ndBroker/proxyClient/submit';

  const signature = generateSignature(timestamp, method, endpoint, bodyString);
  const passphraseSign = generatePassphraseSignature();
  const partnerSign = generatePartnerSignature(timestamp);

  // Step 4: Generate curl command
  const curlCommand = `curl -X POST 'https://api-broker.kucoin.com${endpoint}' \\
  -H 'Content-Type: application/json' \\
  -H 'KC-API-KEY: ${apiKey}' \\
  -H 'KC-API-SIGN: ${signature}' \\
  -H 'KC-API-TIMESTAMP: ${timestamp}' \\
  -H 'KC-API-PASSPHRASE: ${passphraseSign}' \\
  -H 'KC-API-KEY-VERSION: 2' \\
  -H 'KC-BROKER-NAME: ${brokerName}' \\
  -H 'KC-API-PARTNER: ${apiPartner}' \\
  -H 'KC-API-PARTNER-SIGN: ${partnerSign}' \\
  -H 'KC-API-PARTNER-VERIFY: true' \\
  -d '${bodyString.replace(/'/g, "'\\''")}' \\
  | jq .`;

  console.log('=== CURL COMMAND ===\n');
  console.log(curlCommand);

  // Save to file
  const outputFile = '/home/m.devaj.m/sikka/kyc-submission.curl';
  fs.writeFileSync(outputFile, curlCommand);
  console.log(`\n✓ Saved to: ${outputFile}`);

  // Also create a shorter version with body in separate file
  const bodyFile = '/home/m.devaj.m/sikka/kyc-body.json';
  fs.writeFileSync(bodyFile, JSON.stringify(requestBody, null, 2));

  const curlWithFile = `curl -X POST 'https://api-broker.kucoin.com${endpoint}' \\
  -H 'Content-Type: application/json' \\
  -H 'KC-API-KEY: ${apiKey}' \\
  -H 'KC-API-SIGN: ${signature}' \\
  -H 'KC-API-TIMESTAMP: ${timestamp}' \\
  -H 'KC-API-PASSPHRASE: ${passphraseSign}' \\
  -H 'KC-API-KEY-VERSION: 2' \\
  -H 'KC-BROKER-NAME: ${brokerName}' \\
  -H 'KC-API-PARTNER: ${apiPartner}' \\
  -H 'KC-API-PARTNER-SIGN: ${partnerSign}' \\
  -H 'KC-API-PARTNER-VERIFY: true' \\
  -d @${bodyFile} \\
  | jq .`;

  const curlFileOutput = '/home/m.devaj.m/sikka/kyc-submission-with-file.curl';
  fs.writeFileSync(curlFileOutput, curlWithFile);

  console.log(`✓ Body saved to: ${bodyFile}`);
  console.log(`✓ Curl with file reference: ${curlFileOutput}\n`);

  console.log('\n=== REQUEST DETAILS ===');
  console.log('Endpoint:', endpoint);
  console.log('Method:', method);
  console.log('Timestamp:', timestamp);
  console.log('Client UID:', clientUid);
  console.log('Body size:', (bodyString.length / 1024).toFixed(2), 'KB');
  console.log('\nKYC Data:', {
    firstName: kycData.firstName,
    lastName: kycData.lastName,
    birthDate: kycData.birthDate,
    identityNumber: kycData.identityNumber,
    issueCountry: kycData.issueCountry,
    expireDate: kycData.expireDate
  });
}

main().catch(console.error);
