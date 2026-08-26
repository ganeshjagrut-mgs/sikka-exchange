#!/bin/bash

# Verification Script: Test GCP Database Migrations
# Date: 2025-10-31
# Purpose: Verify bank_accounts table and related migrations are working

echo "========================================="
echo "GCP Database Migration Verification"
echo "========================================="
echo ""

# Test 1: Check all tables exist
echo "Test 1: Checking all required tables..."
TABLES=$(ssh m.devaj.m@35.200.154.218 "docker exec sikka_postgres psql -U postgres -d sikka_exchange -t -c 'SELECT tablename FROM pg_tables WHERE schemaname = '\''public'\'' ORDER BY tablename;'")
echo "$TABLES"
echo ""

# Test 2: Check bank_accounts structure
echo "Test 2: Checking bank_accounts table structure..."
ssh m.devaj.m@35.200.154.218 "docker exec sikka_postgres psql -U postgres -d sikka_exchange -c '\d bank_accounts'"
echo ""

# Test 3: Check withdrawals has bank_account_id
echo "Test 3: Checking withdrawals table has bank_account_id..."
BANK_ACCOUNT_ID=$(ssh m.devaj.m@35.200.154.218 "docker exec sikka_postgres psql -U postgres -d sikka_exchange -t -c 'SELECT column_name FROM information_schema.columns WHERE table_name = '\''withdrawals'\'' AND column_name = '\''bank_account_id'\'';'")
if [ -n "$BANK_ACCOUNT_ID" ]; then
  echo "✅ bank_account_id column exists in withdrawals"
else
  echo "❌ bank_account_id column missing in withdrawals"
fi
echo ""

# Test 4: Check webhook_logs exists
echo "Test 4: Checking webhook_logs table..."
WEBHOOK_LOGS=$(ssh m.devaj.m@35.200.154.218 "docker exec sikka_postgres psql -U postgres -d sikka_exchange -t -c 'SELECT tablename FROM pg_tables WHERE tablename = '\''webhook_logs'\'';'")
if [ -n "$WEBHOOK_LOGS" ]; then
  echo "✅ webhook_logs table exists"
else
  echo "❌ webhook_logs table missing"
fi
echo ""

# Test 5: Check kyc_submissions has photo columns
echo "Test 5: Checking kyc_submissions has photo columns..."
PHOTO_COLS=$(ssh m.devaj.m@35.200.154.218 "docker exec sikka_postgres psql -U postgres -d sikka_exchange -t -c 'SELECT column_name FROM information_schema.columns WHERE table_name = '\''kyc_submissions'\'' AND column_name IN ('\''face_photo'\'', '\''front_photo'\'', '\''backend_photo'\'') ORDER BY column_name;'")
if [ -n "$PHOTO_COLS" ]; then
  echo "✅ KYC photo columns exist:"
  echo "$PHOTO_COLS"
else
  echo "❌ KYC photo columns missing"
fi
echo ""

# Test 6: Test backend API endpoints (without auth - should return 401, not 500)
echo "Test 6: Testing backend API endpoints..."
echo "Testing GET /api/bank-accounts..."
BANK_API=$(ssh m.devaj.m@35.200.154.218 "curl -s -X GET http://localhost:3000/api/bank-accounts")
if echo "$BANK_API" | grep -q "UNAUTHORIZED"; then
  echo "✅ Bank accounts endpoint working (returns 401 auth error)"
else
  echo "❌ Bank accounts endpoint error:"
  echo "$BANK_API"
fi
echo ""

echo "Testing GET /api/withdrawals/history..."
WITHDRAWAL_API=$(ssh m.devaj.m@35.200.154.218 "curl -s -X GET http://localhost:3000/api/withdrawals/history")
if echo "$WITHDRAWAL_API" | grep -q "UNAUTHORIZED"; then
  echo "✅ Withdrawals history endpoint working (returns 401 auth error)"
else
  echo "❌ Withdrawals history endpoint error:"
  echo "$WITHDRAWAL_API"
fi
echo ""

# Test 7: Check table row counts
echo "Test 7: Checking table row counts..."
ssh m.devaj.m@35.200.154.218 "docker exec sikka_postgres psql -U postgres -d sikka_exchange -c 'SELECT '\''users'\'' as table_name, COUNT(*) FROM users UNION ALL SELECT '\''bank_accounts'\'', COUNT(*) FROM bank_accounts UNION ALL SELECT '\''withdrawals'\'', COUNT(*) FROM withdrawals UNION ALL SELECT '\''deposits'\'', COUNT(*) FROM deposits UNION ALL SELECT '\''trades'\'', COUNT(*) FROM trades;'"
echo ""

echo "========================================="
echo "Verification Complete!"
echo "========================================="
