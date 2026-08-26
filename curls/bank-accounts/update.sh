#!/bin/bash

# Update bank account
# Replace ACCOUNT_ID with actual UUID

FIREBASE_TOKEN="your_firebase_token_here"
ACCOUNT_ID="bank_account_uuid_here"

curl -X PUT http://localhost:3000/api/bank-accounts/$ACCOUNT_ID \
  -H "Authorization: Bearer $FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bank_name": "Updated Bank Name"
  }'
