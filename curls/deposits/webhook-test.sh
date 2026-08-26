#!/bin/bash

# Sikka Exchange - Webhook Test (Mock Mode Only)
# POST /api/webhooks/cashfree
#
# Description: Manually trigger webhook for testing in mock mode
# WARNING: This should only be used in development/mock mode
# In production, only Cashfree should call this endpoint
#
# Requirements:
# - ENABLE_PAYMENT_MOCK=true in .env
# - Valid order_id from a deposit you initiated
#
# Webhook Processing:
# 1. Verifies signature (in production mode)
# 2. Checks idempotency (prevents duplicate processing)
# 3. Logs webhook in webhook_logs table
# 4. Verifies payment status with Cashfree API (in production mode)
# 5. Updates deposit status to 'paid'
# 6. Credits user wallet (Phase 6)
# 7. Always returns 200 OK (prevents retries)

# Replace with actual order ID from deposit initiate
ORDER_ID="DEP_1_1697123456789"

# Mock payment ID (in production, comes from Cashfree)
PAYMENT_ID="mock_payment_$(date +%s)"

# Deposit amount
AMOUNT=1000

curl -X POST http://localhost:3000/api/webhooks/cashfree \
  -H "Content-Type: application/json" \
  -H "x-webhook-signature: mock_signature_for_testing" \
  -H "x-webhook-timestamp: $(date +%s)" \
  -d "{
    \"order_id\": \"${ORDER_ID}\",
    \"order_status\": \"PAID\",
    \"payment_id\": \"${PAYMENT_ID}\",
    \"order_amount\": ${AMOUNT},
    \"payment_time\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\"
  }"

# Expected Response (Success - 200 OK):
# {
#   "success": true,
#   "message": "Webhook processed successfully"
# }

# Expected Response (Duplicate webhook - 200 OK):
# {
#   "success": true,
#   "message": "Duplicate webhook"
# }

# Expected Response (Invalid signature - 200 OK):
# {
#   "success": true,
#   "message": "Invalid signature"
# }

# Note: Webhook ALWAYS returns 200 OK to prevent Cashfree retries
# Check backend logs or webhook_logs table for actual processing status
