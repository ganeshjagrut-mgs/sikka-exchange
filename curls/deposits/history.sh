#!/bin/bash

# Sikka Exchange - Deposit History API Test
# GET /api/deposits/history
#
# Description: Get all deposits for the authenticated user
#
# Requirements:
# - Valid Firebase ID token (get from test-ui/user-flows.html)
# - User must be registered
#
# Response includes array of deposits with:
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

curl -X GET http://localhost:3000/api/deposits/history \
  -H "Authorization: Bearer ${FIREBASE_TOKEN}"

# Expected Response (Success - 200 OK):
# [
#   {
#     "id": 1,
#     "user_id": 1,
#     "amount_inr": 1000,
#     "estimated_usdt": 11.83,
#     "usdt_inr_rate": 84.50,
#     "status": "paid",
#     "cashfree_order_id": "DEP_1_1697123456789",
#     "cashfree_payment_id": "mock_payment_1697123456999",
#     "requested_at": "2025-10-13T12:00:00.000Z",
#     "paid_at": "2025-10-13T12:05:00.000Z"
#   },
#   {
#     "id": 2,
#     "user_id": 1,
#     "amount_inr": 5000,
#     "estimated_usdt": 59.17,
#     "usdt_inr_rate": 84.50,
#     "status": "pending",
#     "cashfree_order_id": "DEP_1_1697123999888",
#     "cashfree_payment_id": null,
#     "requested_at": "2025-10-13T12:30:00.000Z",
#     "paid_at": null
#   }
# ]

# Expected Response (No deposits - 200 OK):
# []
