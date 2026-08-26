#!/bin/bash

# Add bank account
# Requires: Firebase ID token

FIREBASE_TOKEN="your_firebase_token_here"

curl -X POST http://localhost:3000/api/bank-accounts \
  -H "Authorization: Bearer $FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "account_holder_name": "John Doe",
    "account_number": "1234567890",
    "ifsc_code": "SBIN0001234",
    "bank_name": "State Bank of India",
    "is_default": true
  }'
