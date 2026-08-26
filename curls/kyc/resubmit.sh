#!/bin/bash

# Resubmit KYC after rejection with photo uploads
# Requires Firebase token from authenticated user
# Can only be used when current KYC status is "rejected"

FIREBASE_TOKEN="<your_firebase_token_here>"
FIRST_NAME="John"
LAST_NAME="Doe"
DATE_OF_BIRTH="1990-01-15"
ADDRESS="123 Main Street, Apartment 4B, Mumbai, Maharashtra 400001, India"
ID_TYPE="PASSPORT"
ID_NUMBER="A12345678"
COUNTRY="IN"
EXPIRE_DATE="2030-12-31"

# Test photos - small 1x1 pixel PNGs (base64 encoded)
FACE_PHOTO="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
FRONT_PHOTO="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
BACKEND_PHOTO="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

curl -X POST http://localhost:3000/api/kyc/resubmit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FIREBASE_TOKEN" \
  -d "{
    \"firstName\": \"$FIRST_NAME\",
    \"lastName\": \"$LAST_NAME\",
    \"dateOfBirth\": \"$DATE_OF_BIRTH\",
    \"address\": \"$ADDRESS\",
    \"idType\": \"$ID_TYPE\",
    \"idNumber\": \"$ID_NUMBER\",
    \"country\": \"$COUNTRY\",
    \"expireDate\": \"$EXPIRE_DATE\",
    \"facePhoto\": \"$FACE_PHOTO\",
    \"frontPhoto\": \"$FRONT_PHOTO\",
    \"backendPhoto\": \"$BACKEND_PHOTO\"
  }"

# Expected Success Response (200):
# {
#   "success": true,
#   "data": {
#     "submissionId": "new-uuid-here",
#     "status": "pending",
#     "submittedAt": "2025-10-13T15:00:00.000Z",
#     "message": "KYC resubmitted successfully. You will be notified once it is reviewed."
#   }
# }

# Expected Error Responses:
# 400 - Missing required fields (including expireDate and photos)
# 400 - Cannot resubmit (only allowed for rejected KYC)
# 400 - Invalid dateOfBirth or expireDate format (must be YYYY-MM-DD)
# 400 - expireDate must be a future date
# 400 - Invalid idType (must be PASSPORT, NATIONAL_ID, DRIVERS_LICENSE, or AADHAAR)
# 400 - Photo validation failed (invalid format, size > 2MB, or missing required photos)
# 401 - UNAUTHORIZED (missing or invalid token)
# 500 - KYC resubmission failed

# Photo Requirements by ID Type:
# - PASSPORT: facePhoto required, frontPhoto optional, backendPhoto optional
# - NATIONAL_ID/AADHAAR: facePhoto, frontPhoto, and backendPhoto all required
# - DRIVERS_LICENSE: facePhoto and frontPhoto required, backendPhoto optional
#
# Photo Format: Base64 encoded image (data URI or raw base64)
# Photo Size Limit: 2MB per photo (decoded size)
