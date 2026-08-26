// Cashfree Payment Gateway configuration
const cashfreeConfig = {
  appId: process.env.CASHFREE_APP_ID,
  secretKey: process.env.CASHFREE_SECRET_KEY,
  baseUrl: process.env.CASHFREE_BASE_URL,
  webhookSecret: process.env.CASHFREE_WEBHOOK_SECRET,
  isSandbox: process.env.CASHFREE_SANDBOX === 'true',
  webhookUrl: process.env.CASHFREE_WEBHOOK_URL,
  returnUrl: process.env.CASHFREE_RETURN_URL,
};

// Payout API configuration
cashfreeConfig.payoutBaseUrl = cashfreeConfig.isSandbox
  ? 'https://payout-gamma.cashfree.com/payout/v1'
  : 'https://payout-api.cashfree.com/payout/v1';

// API version for Cashfree Payment Gateway
cashfreeConfig.apiVersion = '2023-08-01';

// Generate basic auth header for Cashfree API
cashfreeConfig.getAuthHeader = () => {
  const credentials = `${cashfreeConfig.appId}:${cashfreeConfig.secretKey}`;
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
};

// Generate headers for Payout API authentication
cashfreeConfig.getPayoutHeaders = () => {
  return {
    'X-Client-Id': cashfreeConfig.appId,
    'X-Client-Secret': cashfreeConfig.secretKey,
    'Content-Type': 'application/json'
  };
};

console.log('Cashfree config initialized (Sandbox mode:', cashfreeConfig.isSandbox + ')');
console.log('Payout API URL:', cashfreeConfig.payoutBaseUrl);

module.exports = cashfreeConfig;
