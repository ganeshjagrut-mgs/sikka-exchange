#!/bin/bash

# Set bank account as default

FIREBASE_TOKEN="your_firebase_token_here"
ACCOUNT_ID="bank_account_uuid_here"

curl -X POST http://localhost:3000/api/bank-accounts/$ACCOUNT_ID/set-default \
  -H "Authorization: Bearer $FIREBASE_TOKEN"
