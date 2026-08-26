#!/bin/bash

# List all users
# Usage: ./list.sh

ADMIN_TOKEN="your_jwt_token_here"

curl -X GET \
  "http://localhost:3000/api/admin/users?page=1&limit=50" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | json_pp
