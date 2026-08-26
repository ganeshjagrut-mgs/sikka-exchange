#!/bin/bash

# Cancel Order Test
# Requires: Trade ID (UUID), Firebase Token

# HOW TO USE:
# 1. First, place a LIMIT order (not MARKET) using buy.sh or sell.sh so it stays pending
# 2. Copy the trade ID from the response
# 3. Set FIREBASE_TOKEN and TRADE_ID below
# 4. Run this script to cancel the order

# EXAMPLE:
# FIREBASE_TOKEN="your_firebase_token_here"
# TRADE_ID="550e8400-e29b-41d4-a716-446655440000"

FIREBASE_TOKEN="${FIREBASE_TOKEN:-<your_firebase_token>}"
TRADE_ID="${TRADE_ID:-<trade_uuid_from_place_order>}"

if [ "$FIREBASE_TOKEN" == "<your_firebase_token>" ]; then
    echo "Error: Please set FIREBASE_TOKEN environment variable or edit this script"
    echo "Example: FIREBASE_TOKEN='your_token' TRADE_ID='your_trade_id' ./cancel.sh"
    exit 1
fi

if [ "$TRADE_ID" == "<trade_uuid_from_place_order>" ]; then
    echo "Error: Please set TRADE_ID environment variable or edit this script"
    echo "Example: FIREBASE_TOKEN='your_token' TRADE_ID='your_trade_id' ./cancel.sh"
    exit 1
fi

echo "Canceling order..."
echo "Trade ID: $TRADE_ID"
echo ""

curl -X POST "http://localhost:3000/api/trades/${TRADE_ID}/cancel" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${FIREBASE_TOKEN}"

echo ""
