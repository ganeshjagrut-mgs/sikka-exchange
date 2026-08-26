#!/bin/bash

# Update USDT/INR conversion rate
# Usage: ./update-rate.sh

ADMIN_TOKEN="your_jwt_token_here"

curl -X POST \
  http://localhost:3000/api/admin/config/conversion-rate \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rate": 85.5
  }' \
  | json_pp
