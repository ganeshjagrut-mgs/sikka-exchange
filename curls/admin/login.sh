#!/bin/bash

# Admin login

curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "changeme123"
  }'

# Save the token from response and use in other requests
