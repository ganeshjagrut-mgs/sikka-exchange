#!/bin/bash

# Get current user profile
# Requires valid Firebase token for authenticated user

FIREBASE_TOKEN="<your_firebase_token_here>"

curl -X GET http://localhost:3000/api/auth/profile \
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
#     "kyc_status": "APPROVED",
#     "kucoin_uid": "kucoin-sub-123456",
#     "kucoin_sub_api_key": "***",
#     "is_active": true,
#     "created_at": "2025-10-13T12:00:00.000Z",
#     "updated_at": "2025-10-13T14:30:00.000Z"
#   }
# }

# Expected Error Responses:
# 401 - UNAUTHORIZED (missing or invalid token)
# 403 - USER_NOT_FOUND (token valid but user not registered)
# 404 - USER_NOT_FOUND (user not found in database)
# 500 - PROFILE_FETCH_FAILED (server error)
