#!/bin/bash

# Get specific withdrawal

FIREBASE_TOKEN="your_firebase_token_here"
WITHDRAWAL_ID="withdrawal_uuid_here"

curl -X GET http://localhost:3000/api/withdrawals/$WITHDRAWAL_ID \
  -H "Authorization: Bearer $FIREBASE_TOKEN"
