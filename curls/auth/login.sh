#!/bin/bash

# Login existing user
# Verifies Firebase token and returns user profile

FIREBASE_TOKEN="<your_firebase_token_here>"

curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FIREBASE_TOKEN"

# Expected Success Response (200):
# {
#   "success": true,
#   "data": {
#     "id": 1,
#     "firebase_uid": "abc123xyz456",
#     "phone_number": "+919876543210",
#     "email": "user@example.com",
#     "full_name": "John Doe",
#     "kyc_status": "PENDING",
#     "kucoin_uid": null,
#     "is_active": true,
#     "created_at": "2025-10-13T12:00:00.000Z"
#   }
# }

# Expected Error Responses:
# 401 - UNAUTHORIZED (missing or invalid token)
# 403 - USER_NOT_FOUND (token valid but user not registered)
# 500 - LOGIN_FAILED (server error)
