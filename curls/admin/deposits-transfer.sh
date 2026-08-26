#!/bin/bash

# Transfer USDT to user after payment confirmed
# This transfers USDT from broker account to user's sub-account

ADMIN_TOKEN="your_admin_jwt_token_here"
DEPOSIT_ID="deposit_uuid_here"

curl -X POST http://localhost:3000/api/admin/deposits/$DEPOSIT_ID/transfer \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount_usdt": 11.9,
    "admin_notes": "USDT transferred on 2025-10-20"
  }'
