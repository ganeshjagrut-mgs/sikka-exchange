#!/bin/bash

# Test Internal Account Transfer (MAIN ↔ TRADE)
#
# Usage:
#   ./curls/transfers/inner-account.sh <FIREBASE_TOKEN> <AMOUNT> <FROM> <TO> <CURRENCY>
#
# Example:
#   ./curls/transfers/inner-account.sh "eyJhbGc..." 100 main trade USDT

FIREBASE_TOKEN=${1:-"YOUR_FIREBASE_TOKEN"}
AMOUNT=${2:-100}
FROM_TYPE=${3:-"main"}
TO_TYPE=${4:-"trade"}
CURRENCY=${5:-"USDT"}

API_URL="http://localhost:3000/api/transfers/inner-account"

curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FIREBASE_TOKEN" \
  -d "{
    \"currency\": \"$CURRENCY\",
    \"amount\": $AMOUNT,
    \"from_type\": \"$FROM_TYPE\",
    \"to_type\": \"$TO_TYPE\"
  }" | jq '.'

echo ""
echo "Transfer Request:"
echo "  Amount: $AMOUNT $CURRENCY"
echo "  From: $FROM_TYPE"
echo "  To: $TO_TYPE"
