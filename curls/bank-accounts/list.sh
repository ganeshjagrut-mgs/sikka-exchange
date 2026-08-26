#!/bin/bash

# List all bank accounts for current user

FIREBASE_TOKEN="your_firebase_token_here"

curl -X GET http://localhost:3000/api/bank-accounts \
  -H "Authorization: Bearer $FIREBASE_TOKEN"
