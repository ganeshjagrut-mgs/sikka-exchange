#!/bin/bash

# Get KYC status
# Requires Firebase token from authenticated user

FIREBASE_TOKEN="<your_firebase_token_here>"

curl -X GET http://localhost:3000/api/kyc/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FIREBASE_TOKEN"

# Expected Success Response - Not Submitted (200):
# {
#   "success": true,
#   "data": {
#     "status": "not_submitted",
#     "message": "No KYC submission found. Please submit your KYC documents."
#   }
# }

# Expected Success Response - Pending (200):
# {
#   "success": true,
#   "data": {
#     "status": "pending",
#     "submissionId": "uuid-here",
#     "submittedAt": "2025-10-13T12:00:00.000Z",
#     "reviewedAt": null,
#     "rejectionReason": null,
#     "kucoinStatus": "PROCESSING",
#     "details": {
#       "fullName": "John Doe",
#       "dateOfBirth": "1990-01-15",
#       "address": "123 Main Street, Mumbai",
#       "idType": "AADHAAR",
#       "idNumber": "123456789012"
#     }
#   }
# }

# Expected Success Response - Approved (200):
# {
#   "success": true,
#   "data": {
#     "status": "approved",
#     "submissionId": "uuid-here",
#     "submittedAt": "2025-10-13T12:00:00.000Z",
#     "reviewedAt": "2025-10-13T14:00:00.000Z",
#     "rejectionReason": null,
#     "kucoinStatus": "APPROVED",
#     "details": { ... }
#   }
# }

# Expected Success Response - Rejected (200):
# {
#   "success": true,
#   "data": {
#     "status": "rejected",
#     "submissionId": "uuid-here",
#     "submittedAt": "2025-10-13T12:00:00.000Z",
#     "reviewedAt": "2025-10-13T14:00:00.000Z",
#     "rejectionReason": "Document image unclear",
#     "kucoinStatus": "REJECTED",
#     "details": { ... }
#   }
# }

# Expected Error Responses:
# 401 - UNAUTHORIZED (missing or invalid token)
# 500 - Failed to fetch KYC status
