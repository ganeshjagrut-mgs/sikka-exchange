#!/usr/bin/env node
/**
 * Auto-update local network IP in .env.local file
 * Run this script when your local network IP changes
 *
 * Usage: npm run env:update-local-ip
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get local network IP address
function getLocalIP() {
  try {
    // macOS/Linux command to get local IP
    const result = execSync(
      "ifconfig | grep 'inet ' | grep -v 127.0.0.1 | awk '{print $2}' | head -1",
      { encoding: 'utf8' }
    );
    return result.trim();
  } catch (error) {
    console.error('❌ Failed to get local IP:', error.message);
    return null;
  }
}

// Update .env.local file with new IP
function updateEnvFile(ip) {
  const envLocalPath = path.join(__dirname, '..', '.env.local');
  const envPath = path.join(__dirname, '..', '.env');

  if (!fs.existsSync(envLocalPath)) {
    console.error('❌ .env.local file not found');
    return false;
  }

  try {
    // Read .env.local
    let content = fs.readFileSync(envLocalPath, 'utf8');

    // Replace IP in API URL
    content = content.replace(
      /EXPO_PUBLIC_API_BASE_URL=http:\/\/[\d.]+:3000/,
      `EXPO_PUBLIC_API_BASE_URL=http://${ip}:3000`
    );

    // Replace IP in WebSocket URL
    content = content.replace(
      /EXPO_PUBLIC_WS_URL=ws:\/\/[\d.]+:3000/,
      `EXPO_PUBLIC_WS_URL=ws://${ip}:3000`
    );

    // Write updated content
    fs.writeFileSync(envLocalPath, content, 'utf8');

    // Check if current .env is using local config (has EXPO_PUBLIC_ENV=local)
    if (fs.existsSync(envPath)) {
      const currentEnv = fs.readFileSync(envPath, 'utf8');
      if (currentEnv.includes('EXPO_PUBLIC_ENV=local')) {
        // Update .env too
        let envContent = currentEnv.replace(
          /EXPO_PUBLIC_API_BASE_URL=http:\/\/[\d.]+:3000/,
          `EXPO_PUBLIC_API_BASE_URL=http://${ip}:3000`
        );
        envContent = envContent.replace(
          /EXPO_PUBLIC_WS_URL=ws:\/\/[\d.]+:3000/,
          `EXPO_PUBLIC_WS_URL=ws://${ip}:3000`
        );
        fs.writeFileSync(envPath, envContent, 'utf8');
        console.log('✅ Updated .env (currently using local config)');
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Failed to update .env.local:', error.message);
    return false;
  }
}

// Main execution
const ip = getLocalIP();

if (!ip) {
  console.error('❌ Could not determine local network IP');
  process.exit(1);
}

console.log('🌐 Detected local network IP:', ip);

if (updateEnvFile(ip)) {
  console.log('✅ Successfully updated .env.local with new IP');
  console.log('');
  console.log('📝 To use this configuration:');
  console.log('   npm run use:local');
  console.log('   npm run start:clear');
} else {
  console.error('❌ Failed to update configuration');
  process.exit(1);
}
