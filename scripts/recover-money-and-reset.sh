#!/bin/bash
# Script to recover money and reset state

echo "========================================="
echo "MONEY RECOVERY & STATE RESET"
echo "========================================="

cd ~/sikka

# Step 1: Transfer money from sub-account to broker
echo ""
echo "Step 1: Recovering money from sub-account..."
echo "Sub-account UID: 251702548"
echo "Current balance: ~1 USDT in TRADE account"
echo ""
echo "Manual action needed:"
echo "  - Transfer ~1 USDT from sub-account (251702548) back to broker"
echo "  - Use KuCoin dashboard OR API call"
echo ""
read -p "Press enter when money is recovered..."

# Step 2: Verify broker balance
echo ""
echo "Step 2: Checking broker balance..."
node scripts/check-money-state.js

# Step 3: Confirm reset
echo ""
echo "Step 3: Ready to reset database"
echo "This will DELETE ALL DATA (users, trades, deposits, withdrawals)"
echo ""
read -p "Type 'RESET' to confirm: " confirm

if [ "$confirm" != "RESET" ]; then
  echo "Reset cancelled."
  exit 1
fi

# Step 4: Nuclear reset
echo ""
echo "Step 4: Wiping database..."
docker-compose down -v

echo ""
echo "Step 5: Restarting services..."
docker-compose up -d

echo ""
echo "Step 6: Waiting for services to start..."
sleep 10

echo ""
echo "Step 7: Checking backend logs..."
docker logs --tail 50 sikka_backend

echo ""
echo "========================================="
echo "RESET COMPLETE!"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Create new test user via test-ui/user-flows.html"
echo "  2. Complete KYC (will create fresh sub-account)"
echo "  3. Test deposit flow"
echo "  4. Start fresh with clean data"
echo ""
