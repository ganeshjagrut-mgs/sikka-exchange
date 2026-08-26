#!/bin/bash

# Get USDT/INR conversion rate
# Usage: ./get-rate.sh

ADMIN_TOKEN="your_jwt_token_here"

curl -X GET \
  http://localhost:3000/api/admin/config/conversion-rate \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | json_pp
