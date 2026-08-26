#!/bin/bash

# Register a new user
# Requires Firebase token from mobile app authentication

FIREBASE_TOKEN="<your_firebase_token_here>"
PHONE_NUMBER="+919876543210"
EMAIL="user@example.com"
FULL_NAME="John Doe"

curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FIREBASE_TOKEN" \
  -d "{
    \"phone_number\": \"$PHONE_NUMBER\",
    \"email\": \"$EMAIL\",
    \"full_name\": \"$FULL_NAME\"
  }"

# Expected Success Response (201):
# {
#   "success": true,
#   "data": {
#     "id": 1,
#     "firebase_uid": "abc123xyz456",
#     "phone_number": "+919876543210",
#     "email": "user@example.com",
#     "full_name": "John Doe",
#     "kyc_status": "PENDING",
#     "is_active": true,
#     "created_at": "2025-10-13T12:00:00.000Z"
#   }
# }

# Expected Error Responses:
# 400 - USER_ALREADY_EXISTS (user already registered)
# 400 - MISSING_PHONE (phone_number not provided)
# 400 - PHONE_ALREADY_REGISTERED (phone number already in use)
# 401 - UNAUTHORIZED (missing or invalid token)
# 500 - REGISTRATION_FAILED (server error)
