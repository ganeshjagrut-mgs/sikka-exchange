#!/bin/bash

# Get withdrawal history

FIREBASE_TOKEN="your_firebase_token_here"

curl -X GET http://localhost:3000/api/withdrawals/history \
  -H "Authorization: Bearer $FIREBASE_TOKEN"
