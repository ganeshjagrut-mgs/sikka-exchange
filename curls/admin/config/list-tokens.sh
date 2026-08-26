#!/bin/bash

# Get all configured tokens
# Usage: ./list-tokens.sh

ADMIN_TOKEN="your_jwt_token_here"

curl -X GET \
  http://localhost:3000/api/admin/config/tokens \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | json_pp
