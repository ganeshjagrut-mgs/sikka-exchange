#!/bin/bash

# Sikka Exchange - Get Specific Deposit API Test
# GET /api/deposits/:id
#
# Description: Get details of a specific deposit by ID
#
# Requirements:
# - Valid Firebase ID token (get from test-ui/user-flows.html)
# - User must be registered
# - Deposit must belong to the authenticated user
#
# Response includes:
# - id: Deposit database ID
# - user_id: User database ID
# - amount_inr: Deposit amount in INR
# - estimated_usdt: Estimated USDT amount
# - usdt_inr_rate: Exchange rate at time of deposit
# - status: 'pending', 'paid', 'completed', 'failed'
# - cashfree_order_id: Cashfree order ID
# - cashfree_payment_id: Cashfree payment ID (after payment)
# - requested_at: Timestamp when deposit was initiated
# - paid_at: Timestamp when payment was completed (if paid)

# Replace with your actual Firebase ID token
FIREBASE_TOKEN="your_firebase_id_token_here"

# Replace with actual deposit ID
DEPOSIT_ID=1

curl -X GET http://localhost:3000/api/deposits/${DEPOSIT_ID} \
  -H "Authorization: Bearer ${FIREBASE_TOKEN}"

# Expected Response (Success - 200 OK):
# {
#   "id": 1,
#   "user_id": 1,
#   "amount_inr": 1000,
#   "estimated_usdt": 11.83,
#   "usdt_inr_rate": 84.50,
#   "status": "paid",
#   "cashfree_order_id": "DEP_1_1697123456789",
#   "cashfree_payment_id": "mock_payment_1697123456999",
#   "requested_at": "2025-10-13T12:00:00.000Z",
#   "paid_at": "2025-10-13T12:05:00.000Z"
# }

# Expected Response (Not Found - 404):
# {
#   "error": "Deposit not found"
# }

# Expected Response (Unauthorized - deposit belongs to another user - 404):
# {
#   "error": "Deposit not found"
# }
