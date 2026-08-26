#!/bin/bash

# Get all transactions for a specific user
# Usage: ./transactions.sh

ADMIN_TOKEN="your_jwt_token_here"
USER_ID="user-uuid-here"

# Query parameters:
# - type: all, deposits, withdrawals, trades (default: all)
# - limit: number of transactions to return (default: 100)

curl -X GET \
  "http://localhost:3000/api/admin/users/$USER_ID/transactions?type=all&limit=100" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | json_pp
