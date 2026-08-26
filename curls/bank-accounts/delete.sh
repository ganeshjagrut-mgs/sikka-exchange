#!/bin/bash

# Delete bank account

FIREBASE_TOKEN="your_firebase_token_here"
ACCOUNT_ID="bank_account_uuid_here"

curl -X DELETE http://localhost:3000/api/bank-accounts/$ACCOUNT_ID \
  -H "Authorization: Bearer $FIREBASE_TOKEN"
