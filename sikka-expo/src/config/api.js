/**
 * API Configuration
 * Direct JavaScript config - no environment variables, no caching issues
 *
 * To switch environments, simply edit this file:
 * - Local development: http://localhost:3000
 * - GCP development: http://35.200.154.218:3000
 * - Production: https://api.sikka.exchange
 */

const API_CONFIG = {
  // Current environment (for logging/debugging)
  ENV: 'local',

  // Backend API base URL (GCP development server)
  API_BASE_URL: 'http://localhost:3001',

  // WebSocket URL
  WS_URL: 'ws://localhost:3001/ws',
};

// Validate configuration
if (!API_CONFIG.API_BASE_URL) {
  throw new Error('API_BASE_URL must be configured in src/config/api.js');
}

// Log configuration on import (helps debugging)
console.log(`🌐 API Config: ${API_CONFIG.ENV.toUpperCase()} - ${API_CONFIG.API_BASE_URL}`);

export default API_CONFIG;
