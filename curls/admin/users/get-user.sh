#!/bin/bash

# Get specific user details
# Usage: ./get-user.sh

ADMIN_TOKEN="your_jwt_token_here"
USER_ID="user-uuid-here"

curl -X GET \
  "http://localhost:3000/api/admin/users/$USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | json_pp
