#!/bin/bash

# Get pending deposits
# Lists all deposits that have been paid but USDT not yet transferred

ADMIN_TOKEN="your_admin_jwt_token_here"

curl -X GET http://localhost:3000/api/admin/deposits/pending \
  -H "Authorization: Bearer $ADMIN_TOKEN"
