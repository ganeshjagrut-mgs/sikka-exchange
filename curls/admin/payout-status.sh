#!/bin/bash

# Check Cashfree payout status for a withdrawal
# Usage: ./payout-status.sh <withdrawal_id>

WITHDRAWAL_ID=${1:-"withdrawal-uuid-here"}

curl -X GET "http://localhost:3000/api/admin/withdrawals/${WITHDRAWAL_ID}/payout-status" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json"
