const crypto = require('crypto');

// KuCoin Broker API configuration
const kucoinConfig = {
  // Broker credentials
  apiKey: process.env.KUCOIN_API_KEY,
  apiSecret: process.env.KUCOIN_API_SECRET,
  apiPassphrase: process.env.KUCOIN_API_PASSPHRASE,
  brokerName: process.env.KUCOIN_BROKER_NAME,

  // Partner credentials for broker-specific endpoints
  apiPartner: process.env.KUCOIN_API_PARTNER,
  apiPartnerSecret: process.env.KUCOIN_API_PARTNER_SECRET,

  // Base URLs
  baseUrl: process.env.KUCOIN_BASE_URL,
  brokerBaseUrl: process.env.KUCOIN_BROKER_BASE_URL,
};

// Generate HMAC-SHA256 signature for KuCoin API requests
kucoinConfig.generateSignature = (timestamp, method, endpoint, body = '') => {
  const message = timestamp + method + endpoint + body;
  return crypto
    .createHmac('sha256', kucoinConfig.apiSecret)
    .update(message)
    .digest('base64');
};

// Generate partner signature for broker endpoints
kucoinConfig.generatePartnerSignature = (timestamp, method, endpoint, body = '') => {
  const message = timestamp + method + endpoint + body;
  return crypto
    .createHmac('sha256', kucoinConfig.apiPartnerSecret)
    .update(message)
    .digest('base64');
};

// Generate API passphrase (encrypted with API secret)
kucoinConfig.getEncryptedPassphrase = () => {
  return crypto
    .createHmac('sha256', kucoinConfig.apiSecret)
    .update(kucoinConfig.apiPassphrase)
    .digest('base64');
};

console.log('KuCoin config initialized (Production mode)');

module.exports = kucoinConfig;
