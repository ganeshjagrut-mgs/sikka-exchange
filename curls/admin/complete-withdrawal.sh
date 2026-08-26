#!/bin/bash

# Complete withdrawal
# This:
# 1. Transfers USDT from user's sub-account back to broker
# 2. Initiates Cashfree payout to user's bank account
# 3. Returns payout status (SUCCESS, PENDING, or ERROR)

ADMIN_TOKEN="your_admin_jwt_token_here"
WITHDRAWAL_ID="withdrawal_uuid_here"

curl -X POST http://localhost:3000/api/admin/withdrawals/$WITHDRAWAL_ID/complete \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "admin_notes": "Withdrawal processed"
  }'

# Response includes:
# - status: 'completed', 'processing_payout', or 'pending' (if payout failed)
# - cashfree_payout_status: 'SUCCESS', 'PENDING', or 'FAILED'
# - cashfree_transfer_id: Cashfree reference ID
# - cashfree_transfer_utr: Bank UTR number (if available)
# - inr_sent_at: Timestamp when payout was initiated
