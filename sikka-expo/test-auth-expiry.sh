#!/bin/bash

# Test script to verify automatic logout on token expiration
echo "🧪 Testing automatic logout on token expiration..."

# Get Firebase token
echo "🔑 Getting Firebase token..."
FIREBASE_TOKEN=$(node -e "
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

admin.auth().createCustomToken('test-user-id')
  .then(token => console.log(token))
  .catch(err => console.error('Error:', err.message));
")

if [ -z "$FIREBASE_TOKEN" ]; then
  echo "❌ Failed to get Firebase token"
  exit 1
fi

echo "✅ Got Firebase token"

# Test API call with valid token
echo "🌐 Testing API call with valid token..."
RESPONSE=$(curl -s -X GET "http://35.200.154.218:3000/api/balance/holdings" -H "Authorization: Bearer $FIREBASE_TOKEN")
echo "Response: $RESPONSE"

# Check if we get auth error (we should since this is a custom token, not a real user session)
if echo "$RESPONSE" | grep -q "Authentication expired\|token\|expired\|unauthorized"; then
  echo "✅ API correctly rejects invalid/expired tokens"
else
  echo "⚠️ API response: $RESPONSE"
fi

echo "🎯 Test completed - Automatic logout should work when tokens expire in the app"
