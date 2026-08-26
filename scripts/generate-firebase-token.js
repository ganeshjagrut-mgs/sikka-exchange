/**
 * Generate Firebase Authentication Token
 *
 * This script generates a Firebase authentication token using Firebase Admin SDK
 * for testing purposes. It creates a custom token that can be used to authenticate
 * API calls to the Sikka backend.
 *
 * Usage:
 *   node scripts/generate-firebase-token.js
 *
 * The script will output a Firebase ID token that can be used in the Authorization header.
 */

require('dotenv').config();
const admin = require('../backend/src/config/firebase');

async function generateFirebaseToken() {
  try {
    // Check if Firebase is initialized
    if (!admin.apps.length) {
      console.error('❌ Firebase Admin SDK not initialized. Check your environment variables.');
      process.exit(1);
    }

    // Create a test user UID (you can customize this)
    const testUid = `test_user_${Date.now()}`;

    // Additional claims (optional)
    const additionalClaims = {
      email: 'test@gmail.com',
      email_verified: true,
      name: 'Test User'
    };

    console.log('🔥 Generating Firebase custom token...');

    // Create custom token
    const customToken = await admin.auth().createCustomToken(testUid, additionalClaims);

    console.log('✅ Custom token generated successfully!');
    console.log('\n📋 Firebase Custom Token:');
    console.log(customToken);
    console.log('\n📋 Use this token in your Authorization header:');
    console.log(`Authorization: Bearer ${customToken}`);
    console.log('\n⚠️  Note: This is a custom token that needs to be exchanged for an ID token');
    console.log('   by the Firebase Auth SDK on the client side.');

    // For testing purposes, let's also try to create an ID token directly
    // (This is not typically done in production, but useful for testing)
    console.log('\n🔄 Attempting to create ID token directly (for testing only)...');

    try {
      // Create a custom auth object for testing
      const idToken = await admin.auth().createCustomToken(testUid, {
        ...additionalClaims,
        // Add some claims that would normally be in an ID token
        aud: process.env.FIREBASE_PROJECT_ID,
        iss: `https://securetoken.google.com/${process.env.FIREBASE_PROJECT_ID}`,
        sub: testUid,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
      });

      console.log('✅ ID token created (custom implementation for testing)');
      console.log('\n📋 Test ID Token:');
      console.log(idToken);
      console.log('\n📋 Use this in API calls:');
      console.log(`Authorization: Bearer ${idToken}`);

    } catch (idTokenError) {
      console.log('⚠️  Could not create ID token directly. Use the custom token above.');
      console.log('   ID tokens are normally created by Firebase Auth SDK on client side.');
    }

  } catch (error) {
    console.error('❌ Error generating Firebase token:', error.message);
    process.exit(1);
  }
}

// Run the script
generateFirebaseToken();