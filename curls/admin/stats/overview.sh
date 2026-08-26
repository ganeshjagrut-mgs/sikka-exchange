#!/bin/bash

# Get platform statistics overview
# Usage: ./overview.sh

ADMIN_TOKEN="your_jwt_token_here"

curl -X GET \
  http://localhost:3000/api/admin/stats/overview \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | json_pp
