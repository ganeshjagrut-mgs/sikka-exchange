#!/bin/bash

# Sikka Exchange - Deposit Initiate API Test
# POST /api/deposits/initiate
#
# Description: Initiate a new deposit and get checkout URL
#
# Requirements:
# - Valid Firebase ID token (get from test-ui/user-flows.html)
# - User must be registered
# - User should have approved KYC (though not strictly required)
#
# Response includes:
# - depositId: Database ID of deposit record
# - orderId: Cashfree order ID (format: DEP_{userId}_{timestamp})
# - paymentSessionId: Session ID for checkout (mock_ prefix in mock mode)
# - checkoutUrl: Full URL to open for payment
# - amount: Deposit amount in INR
# - estimatedUsdt: Estimated USDT amount based on conversion rate

# Replace with your actual Firebase ID token
FIREBASE_TOKEN="your_firebase_id_token_here"

# Deposit amount in INR (min: 100, max: 100000 by default)
AMOUNT=1000

curl -X POST http://localhost:3000/api/deposits/initiate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${FIREBASE_TOKEN}" \
  -d "{
    \"amount\": ${AMOUNT}
  }"

# Expected Response (Success - 200 OK):
# {
#   "depositId": 1,
#   "orderId": "DEP_1_1697123456789",
#   "paymentSessionId": "mock_DEP_1_1697123456789_1697123456789",
#   "checkoutUrl": "http://localhost:3000/checkout?session=mock_DEP_1_1697123456789_1697123456789&order_id=DEP_1_1697123456789&amount=1000",
#   "amount": 1000,
#   "estimatedUsdt": 11.83
# }

# Expected Response (Error - Amount too low - 400):
# {
#   "error": "Deposit amount must be at least ₹100"
# }

# Expected Response (Error - Amount too high - 400):
# {
#   "error": "Deposit amount cannot exceed ₹100,000"
# }
