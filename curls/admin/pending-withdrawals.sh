#!/bin/bash

# Get pending withdrawals

ADMIN_TOKEN="your_admin_jwt_token_here"

curl -X GET http://localhost:3000/api/admin/withdrawals/pending \
  -H "Authorization: Bearer $ADMIN_TOKEN"
