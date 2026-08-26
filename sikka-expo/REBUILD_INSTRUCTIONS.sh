#!/bin/bash
# Rebuild APK with Network Security Fix
# Run this script from the sikka-expo directory

set -e  # Exit on error

echo "================================================"
echo "Rebuilding Android APK with HTTP traffic fix"
echo "================================================"
echo ""

# Check if we're in the right directory
if [ ! -f "app.json" ]; then
    echo "❌ Error: app.json not found. Please run this from sikka-expo directory."
    exit 1
fi

# Verify the fix is in place
if grep -q '"usesCleartextTraffic": true' app.json; then
    echo "✅ Verified: usesCleartextTraffic is enabled in app.json"
else
    echo "❌ Error: usesCleartextTraffic not found in app.json"
    echo "The fix may not have been applied correctly."
    exit 1
fi

echo ""
echo "Starting EAS build..."
echo "This will take 10-15 minutes."
echo ""

# Build the APK
eas build --platform android --profile preview

echo ""
echo "================================================"
echo "✅ Build submitted successfully!"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Wait for the build to complete (check EAS dashboard or CLI output)"
echo "2. Download the new APK from the provided URL"
echo "3. Install it on your device (may need to uninstall old version first)"
echo "4. Test login with: approved-kyc-trader@test.com / Test123456"
echo ""
echo "The login should now work successfully!"
echo "================================================"
