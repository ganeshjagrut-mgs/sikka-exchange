#!/bin/bash
# GET /api/tokens/prices
# Get current market prices for all supported tokens (BTC, ETH, SOL, USDT)
# PUBLIC endpoint - no authentication required
#
# Returns:
# - price_usdt: Price in USDT
# - price_inr: Price in INR (converted using admin USDT_INR_RATE)
# - updated_at: Timestamp of price fetch

curl -X GET http://localhost:3000/api/tokens/prices \
  -H "Content-Type: application/json" \
  | python3 -m json.tool

# Example response:
# {
#   "success": true,
#   "data": {
#     "BTC": {
#       "symbol": "BTC",
#       "price_usdt": 109655.4,
#       "price_inr": 9211053.6
#     },
#     "ETH": {
#       "symbol": "ETH",
#       "price_usdt": 3848.14,
#       "price_inr": 323243.76
#     },
#     "SOL": {
#       "symbol": "SOL",
#       "price_usdt": 186.31,
#       "price_inr": 15650.04
#     },
#     "USDT": {
#       "symbol": "USDT",
#       "price_usdt": 1.0,
#       "price_inr": 84.0
#     }
#   },
#   "updated_at": "2025-10-31T01:54:54.163Z"
# }
