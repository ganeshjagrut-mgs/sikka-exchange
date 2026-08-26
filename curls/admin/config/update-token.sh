#!/bin/bash

# Update token configuration
# Usage: ./update-token.sh

ADMIN_TOKEN="your_jwt_token_here"
TOKEN_SYMBOL="BTC"

# Update token settings (partial update supported)
curl -X PUT \
  "http://localhost:3000/api/admin/config/tokens/$TOKEN_SYMBOL" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "is_active": true,
    "quote_min_size": 100,
    "quote_max_size": 100000
  }' \
  | json_pp
