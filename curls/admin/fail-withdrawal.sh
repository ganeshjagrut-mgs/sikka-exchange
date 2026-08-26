#!/bin/bash

# Mark withdrawal as failed

ADMIN_TOKEN="your_admin_jwt_token_here"
WITHDRAWAL_ID="withdrawal_uuid_here"

curl -X POST http://localhost:3000/api/admin/withdrawals/$WITHDRAWAL_ID/fail \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "failed_reason": "Insufficient USDT balance",
    "admin_notes": "User traded away USDT after requesting withdrawal"
  }'
