#!/bin/bash

# Request withdrawal
# Requires: KYC approved, bank account added

FIREBASE_TOKEN="your_firebase_token_here"

curl -X POST http://localhost:3000/api/withdrawals/request \
  -H "Authorization: Bearer $FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount_inr": 5000
  }'

# Or specify bank account explicitly:
# curl -X POST http://localhost:3000/api/withdrawals/request \
#   -H "Authorization: Bearer $FIREBASE_TOKEN" \
#   -H "Content-Type: application/json" \
#   -d '{
#     "amount_inr": 5000,
#     "bank_account_id": "bank_account_uuid_here"
#   }'
