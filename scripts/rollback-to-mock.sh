#!/bin/bash
# Rollback to Mock Mode Script
# Usage: ./rollback-to-mock.sh
# Created: 2025-10-31

set -e

echo "========================================="
echo "SIKKA ROLLBACK TO MOCK MODE"
echo "========================================="
echo ""
echo "This will disable real KuCoin API and switch back to mocks"
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "=== Disabling Real Mode ==="
echo "Updating KUCOIN_USE_MOCK flag..."
ssh m.devaj.m@35.200.154.218 "sed -i 's/KUCOIN_USE_MOCK=false/KUCOIN_USE_MOCK=true/g' ~/sikka/.env"
ssh m.devaj.m@35.200.154.218 "sed -i 's/USE_REAL_KUCOIN=true/USE_REAL_KUCOIN=false/g' ~/sikka/.env"
echo "✅ Flags updated"

echo ""
echo "=== Restarting Backend ==="
ssh m.devaj.m@35.200.154.218 "cd ~/sikka && docker-compose restart backend"
echo "✅ Backend restarted"

echo "Waiting for backend to start (5 seconds)..."
sleep 5

echo ""
echo "=== Verifying Mock Mode ==="
ssh m.devaj.m@35.200.154.218 "docker logs sikka_backend 2>&1 | grep -A 3 'KuCoin Service Wrapper' | tail -4"

echo ""
echo "=== Testing Mock API ==="
echo "Checking if backend responds..."
HEALTH=$(ssh m.devaj.m@35.200.154.218 "curl -s http://localhost:3000/health | jq -r .status" || echo "FAIL")

if [ "$HEALTH" == "ok" ]; then
    echo "✅ Backend healthy"
else
    echo "❌ Backend health check failed"
    exit 1
fi

echo ""
echo "========================================="
echo "ROLLBACK COMPLETE"
echo "========================================="
echo ""
echo "✅ System is now in MOCK mode"
echo ""
echo "Test UI still accessible at:"
echo "  http://35.200.154.218:3000/test-ui/user-flows.html"
echo ""
echo "To re-enable real mode: ./enable-real-trading.sh"
echo ""
