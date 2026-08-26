// REAL KUCOIN SERVICE - Production API Integration

const crypto = require('crypto');
const axios = require('axios');

/**
 * KuCoin Real Service
 *
 * This service implements the complete KuCoin Broker API and Trading API integration
 * with proper authentication, signatures, and error handling.
 *
 * Documentation: /kucoin-docs/ directory
 *
 * Authentication:
 * - All requests require 3 different signatures
 * - Broker API uses: https://api-broker.kucoin.com
 * - Trading API uses: https://api.kucoin.com
 */

// ============================================================================
// Configuration - Load all credentials from .env
// ============================================================================

const config = {
  // Broker API credentials (for broker operations: sub-accounts, KYC, etc.)
  apiKey: process.env.KUCOIN_API_KEY,
  secretKey: process.env.KUCOIN_API_SECRET,
  passphrase: process.env.KUCOIN_API_PASSPHRASE,
  apiVersion: process.env.KUCOIN_API_VERSION || '2',

  // Trading API credentials (for trading operations: wallets, deposits, trades)
  tradingApiKey: process.env.KUCOIN_TRADING_API_KEY,
  tradingSecretKey: process.env.KUCOIN_TRADING_API_SECRET,
  tradingPassphrase: process.env.KUCOIN_TRADING_API_PASSPHRASE,

  // Broker API credentials
  brokerName: process.env.KUCOIN_BROKER_NAME,
  apiPartner: process.env.KUCOIN_API_PARTNER,
  apiPartnerSecretKey: process.env.KUCOIN_API_PARTNER_SECRET,

  // Base URLs
  baseUrl: process.env.KUCOIN_BASE_URL || 'https://api.kucoin.com',
  brokerBaseUrl: process.env.KUCOIN_BROKER_BASE_URL || 'https://api-broker.kucoin.com',
};

// Validate required configuration
const requiredVars = [
  'apiKey', 'secretKey', 'passphrase', 'brokerName',
  'apiPartner', 'apiPartnerSecretKey'
];

for (const varName of requiredVars) {
  if (!config[varName]) {
    console.error(`KUCOIN CONFIG ERROR: Missing required environment variable for ${varName}`);
  }
}

// ============================================================================
// Signature Generation Helpers
// ============================================================================

/**
 * Generate KC-API-SIGN signature
 * Formula: Base64(HMAC-SHA256(secret_key, timestamp + method + endpoint + body))
 *
 * @param {string} timestamp - Unix timestamp in milliseconds (as STRING)
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {string} endpoint - API endpoint path (including query params for GET)
 * @param {string} body - JSON stringified body (empty string for GET)
 * @param {string} secretKey - API secret key to use for signing
 * @returns {string} Base64 encoded signature
 */
function generateSignature(timestamp, method, endpoint, body, secretKey) {
  const message = timestamp + method + endpoint + body;
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(message)
    .digest('base64');

  return signature;
}

/**
 * Generate KC-API-PASSPHRASE signature
 * Formula: Base64(HMAC-SHA256(secret_key, passphrase))
 *
 * @param {string} passphrase - API passphrase
 * @param {string} secretKey - API secret key to use for signing
 * @returns {string} Base64 encoded passphrase signature
 */
function generatePassphraseSignature(passphrase, secretKey) {
  const passphraseSign = crypto
    .createHmac('sha256', secretKey)
    .update(passphrase)
    .digest('base64');

  return passphraseSign;
}

/**
 * Generate KC-API-PARTNER-SIGN signature
 * Formula: Base64(HMAC-SHA256(partner_secret_key, timestamp + partner_id + api_key))
 *
 * @param {string} timestamp - Unix timestamp in milliseconds (as STRING)
 * @param {string} apiPartner - Partner ID
 * @param {string} apiKey - API key
 * @param {string} partnerSecretKey - Partner secret key
 * @returns {string} Base64 encoded partner signature
 */
function generatePartnerSignature(timestamp, apiPartner, apiKey, partnerSecretKey) {
  const message = timestamp + apiPartner + apiKey;
  const partnerSign = crypto
    .createHmac('sha256', partnerSecretKey)
    .update(message)
    .digest('base64');

  return partnerSign;
}

/**
 * Build complete headers for KuCoin API request
 *
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {string} endpoint - API endpoint path (including query params for GET)
 * @param {Object|null} body - Request body object (null for GET)
 * @param {Object|null} subAccountKeys - Optional sub-account API keys {apiKey, apiSecret, apiPassphrase}
 * @param {boolean} useTradingKeys - Use trading API keys instead of broker keys (for deposit/wallet operations)
 * @returns {Object} Complete headers object with all 10 required headers
 */
function buildHeaders(method, endpoint, body = null, subAccountKeys = null, useTradingKeys = false) {
  // Priority: sub-account keys > trading keys > broker keys
  let apiKey, secretKey, passphrase;

  if (subAccountKeys) {
    // Sub-account keys (highest priority)
    apiKey = subAccountKeys.apiKey;
    secretKey = subAccountKeys.apiSecret;
    passphrase = subAccountKeys.apiPassphrase;
  } else if (useTradingKeys) {
    // Trading API keys (for deposit/wallet operations)
    apiKey = config.tradingApiKey;
    secretKey = config.tradingSecretKey;
    passphrase = config.tradingPassphrase;
  } else {
    // Broker API keys (default)
    apiKey = config.apiKey;
    secretKey = config.secretKey;
    passphrase = config.passphrase;
  }

  // CRITICAL: Timestamp MUST be string
  const timestamp = Date.now().toString();

  // CRITICAL: Empty body MUST be empty string, not "{}"
  const bodyString = body ? JSON.stringify(body) : '';

  // Generate standard signatures (always needed)
  const apiSign = generateSignature(timestamp, method, endpoint, bodyString, secretKey);
  const passphraseSign = generatePassphraseSignature(passphrase, secretKey);

  // Base headers (always included)
  const headers = {
    'KC-API-KEY': apiKey,
    'KC-API-SIGN': apiSign,
    'KC-API-TIMESTAMP': timestamp,
    'KC-API-PASSPHRASE': passphraseSign,
    'KC-API-KEY-VERSION': config.apiVersion,
    'Content-Type': 'application/json'
  };

  // Add broker/partner headers ONLY for broker endpoints
  // Do NOT add broker headers when using sub-account keys or Trading API keys
  if (!useTradingKeys && !subAccountKeys) {
    const partnerSign = generatePartnerSignature(timestamp, config.apiPartner, apiKey, config.apiPartnerSecretKey);
    headers['KC-BROKER-NAME'] = config.brokerName;
    headers['KC-API-PARTNER'] = config.apiPartner;
    headers['KC-API-PARTNER-SIGN'] = partnerSign;
    headers['KC-API-PARTNER-VERIFY'] = 'true';
  }

  return headers;
}

// ============================================================================
// HTTP Request Wrapper
// ============================================================================

/**
 * Make authenticated request to KuCoin API
 *
 * @param {string} method - HTTP method (GET, POST, DELETE, etc.)
 * @param {string} endpoint - API endpoint path (including query params for GET)
 * @param {Object|null} body - Request body (null for GET)
 * @param {boolean} useBrokerBase - Use broker base URL (true) or standard API URL (false)
 * @param {Object|null} subAccountKeys - Optional sub-account API keys
 * @param {boolean} useTradingKeys - Use trading API keys instead of broker keys
 * @returns {Promise<Object>} API response data
 */
async function makeRequest(method, endpoint, body = null, useBrokerBase = false, subAccountKeys = null, useTradingKeys = false) {
  const baseUrl = useBrokerBase ? config.brokerBaseUrl : config.baseUrl;
  const url = `${baseUrl}${endpoint}`;

  const headers = buildHeaders(method, endpoint, body, subAccountKeys, useTradingKeys);

  try {
    console.log(`[KuCoin API] ${method} ${url}`);
    // Debug: Log headers (without exposing full values)
    if (process.env.DEBUG_KUCOIN) {
      console.log('[KuCoin Debug] Headers:', {
        hasApiKey: !!headers['KC-API-KEY'],
        apiKeyPrefix: headers['KC-API-KEY']?.substring(0, 10),
        hasSign: !!headers['KC-API-SIGN'],
        hasTimestamp: !!headers['KC-API-TIMESTAMP'],
        hasPassphrase: !!headers['KC-API-PASSPHRASE']
      });
    }

    const response = await axios({
      method,
      url,
      headers,
      data: body || undefined,
      timeout: 30000 // 30 second timeout
    });

    // KuCoin API returns {code, data} structure
    if (response.data.code !== '200000') {
      console.error('[KuCoin API Error]', {
        endpoint,
        code: response.data.code,
        message: response.data.msg,
        data: response.data.data
      });
    }

    return response.data;

  } catch (error) {
    // Enhanced error logging
    if (error.response) {
      // API returned error response
      console.error('[KuCoin API Error Response]', {
        endpoint,
        status: error.response.status,
        statusText: error.response.statusText,
        code: error.response.data?.code,
        message: error.response.data?.msg,
        data: error.response.data?.data
      });

      // Return KuCoin error format
      return {
        code: error.response.data?.code || error.response.status.toString(),
        msg: error.response.data?.msg || error.response.statusText
      };
    } else if (error.request) {
      // Request made but no response received
      console.error('[KuCoin API No Response]', {
        endpoint,
        message: error.message
      });

      throw new Error(`KuCoin API request failed: ${error.message}`);
    } else {
      // Error in request setup
      console.error('[KuCoin API Request Error]', {
        endpoint,
        message: error.message
      });

      throw new Error(`KuCoin API request setup failed: ${error.message}`);
    }
  }
}

// ============================================================================
// PHASE 9A - Account & KYC APIs
// ============================================================================

/**
 * Create a new sub-account under the broker account
 * API: POST /api/v1/broker/nd/account/sub-user
 *
 * @param {string} accountName - Name for the sub-account
 * @returns {Promise<Object>} Response with sub-account UID
 */
async function createSubAccount(accountName) {
  const endpoint = '/api/v1/broker/nd/account';
  const body = {
    accountName: accountName
  };

  return await makeRequest('POST', endpoint, body, true);
}

/**
 * Submit KYC information for a sub-account
 * CRITICAL: Uses broker ND KYC endpoint with BROKER API keys (not sub-account keys!)
 *
 * API: POST /api/kyc/ndBroker/proxyClient/submit (Broker ND KYC API)
 *
 * @param {string} uid - Sub-account UID (required as clientUid in request body)
 * @param {Object} kycData - KYC information (in KuCoin API format)
 * @param {string} kycData.firstName - First name
 * @param {string} kycData.lastName - Last name
 * @param {string} kycData.issueCountry - Country code (e.g., "IN")
 * @param {string} kycData.identityNumber - ID document number
 * @param {string} kycData.identityType - ID type ("passport", "idcard", "drivinglicense")
 * @param {string} kycData.birthDate - Date of birth (YYYY-MM-DD)
 * @param {string} kycData.expireDate - ID expiration date (YYYY-MM-DD)
 * @param {string} kycData.facePhoto - Base64 encoded selfie photo
 * @param {string} kycData.frontPhoto - Base64 encoded ID front photo
 * @param {string} kycData.backendPhoto - Base64 encoded ID back photo
 * @param {Object} apiKeys - NOT USED - This endpoint uses broker keys, kept for backward compatibility
 * @returns {Promise<Object>} Response with KYC status
 */
async function submitKYC(uid, kycData, apiKeys) {
  // CRITICAL: Use broker ND KYC endpoint with BROKER API keys (not sub-account keys!)
  // The curl example from KuCoin shows this endpoint uses broker authentication
  const endpoint = '/api/kyc/ndBroker/proxyClient/submit';
  const body = {
    clientUid: uid,  // OpenAPI spec requires clientUid, not uid
    ...kycData
  };
  console.log('🔐 KuCoin KYC Request:', {
    endpoint,
    clientUid: uid,
    photoSizes: {
      facePhoto: kycData.facePhoto?.length,
      frontPhoto: kycData.frontPhoto?.length,
      backendPhoto: kycData.backendPhoto?.length
    },
    timestamp: Date.now()
  });

  // CRITICAL: useBrokerBase = true, apiKeys = null (use broker keys from config)
  const kycResponse = await makeRequest('POST', endpoint, body, true, null);
  
  // Enhanced error logging for KYC submission failures
  if (kycResponse.code !== '200000') {
    console.error('❌ KuCoin KYC Error Details:', {
      code: kycResponse.code,
      message: kycResponse.msg,
      data: kycResponse.data,
      requestSummary: {
        clientUid: uid,
        identityType: body.identityType,
        photoSizesKB: {
          facePhoto: Math.round((body.facePhoto?.length || 0) * 0.75 / 1024),
          frontPhoto: Math.round((body.frontPhoto?.length || 0) * 0.75 / 1024),
          backendPhoto: Math.round((body.backendPhoto?.length || 0) * 0.75 / 1024)
        }
      }
    });
  }
  
  return kycResponse;
}

/**
 * Get KYC verification status for one or multiple sub-accounts
  return await makeRequest('POST', endpoint, body, true, null);
}

/**
 * Get KYC verification status for one or multiple sub-accounts
 * API: GET /api/kyc/ndBroker/proxyClient/status/list?clientUids={uids}
 *
 * ENHANCED: Now supports batch queries (comma-separated UIDs)
 * BACKWARD COMPATIBLE: Single UID still works (returns array with 1 item)
 *
 * @param {string|Array<string>} uids - Single UID OR array of UIDs OR comma-separated string
 * @returns {Promise<Object>} Response with array of {clientUid, status (NONE/PROCESS/PASS/REJECT), rejectReason}
 */
async function getKYCStatus(uids) {
  // Normalize input to comma-separated string
  let uidString;
  if (Array.isArray(uids)) {
    uidString = uids.join(',');
  } else if (typeof uids === 'string') {
    uidString = uids;
  } else {
    throw new Error('uids must be a string or array of strings');
  }

  // Use new list endpoint that supports multiple UIDs
  const endpoint = `/api/kyc/ndBroker/proxyClient/status/list?clientUids=${uidString}`;

  return await makeRequest('GET', endpoint, null, true, null);
}

/**
 * Get sub-account information and details
 * API: GET /api/v1/broker/nd/account?uid={uid}
 *
 * @param {string} uid - Sub-account UID
 * @returns {Promise<Object>} Response with sub-account details
 */
async function getSubAccount(uid) {
  // Use ND broker pattern (same as createSubAccount)
  const endpoint = `/api/v1/broker/nd/account?uid=${uid}`;

  return await makeRequest('GET', endpoint, null, true, null);
}

/**
 * Get API key information for a sub-account
 * API: GET /api/v1/broker/nd/account/apikey?uid={uid}
 *
 * @param {string} uid - Sub-account UID
 * @returns {Promise<Object>} Response with API key details (without secrets)
 */
async function getSubAccountAPIKeys(uid) {
  // Use ND broker pattern (same as createSubAccountAPIKeys)
  const endpoint = `/api/v1/broker/nd/account/apikey?uid=${uid}`;

  return await makeRequest('GET', endpoint, null, true, null);
}

/**
 * Get API key information for a sub-account
 * API: GET /api/v1/broker/nd/account/apikey?uid={uid}&apiKey={apiKey}
 *
 * @param {string} uid - Sub-account UID (required)
 * @param {string} apiKey - Specific API key to query (optional - if omitted, returns all keys)
 * @returns {Promise<Object>} Response with array of {uid, label, apiKey, apiVersion, permissions, ipWhitelist, createdAt}
 */
async function getSubAccountAPIKey(uid, apiKey = null) {
  let endpoint = `/api/v1/broker/nd/account/apikey?uid=${uid}`;
  if (apiKey) {
    endpoint += `&apiKey=${apiKey}`;
  }

  return await makeRequest('GET', endpoint, null, true, null);
}

/**
 * Delete API key for a sub-account
 * API: DELETE /api/v1/broker/nd/account/apikey
 *
 * Use this to delete an existing API key before creating a new one.
 * Note: API secrets are only returned once at creation time, so if lost,
 * you must delete and recreate the key.
 *
 * @param {string} uid - Sub-account UID (required)
 * @param {string} apiKey - API key to delete (required)
 * @returns {Promise<Object>} Response with deletion confirmation
 */
async function deleteSubAccountAPIKey(uid, apiKey) {
  if (!uid || !apiKey) {
    throw new Error('Both uid and apiKey are required to delete an API key');
  }

  const endpoint = `/api/v1/broker/nd/account/apikey?uid=${uid}&apiKey=${apiKey}`;

  return await makeRequest('DELETE', endpoint, null, true, null);
}

/**
 * Get transfer history for a specific transfer operation
 * API: GET /api/v3/broker/nd/transfer/detail?orderId={orderId}
 *
 * @param {string} orderId - Transfer order ID (from transferBrokerToSub response)
 * @returns {Promise<Object>} Response with {orderId, currency, amount, fromUid, fromAccountType, toUid, toAccountType, status, reason, createdAt}
 */
async function getTransferHistory(orderId) {
  const endpoint = `/api/v3/broker/nd/transfer/detail?orderId=${orderId}`;

  return await makeRequest('GET', endpoint, null, true, null);
}

/**
 * Get deposit records for ALL sub-accounts under the broker
 * API: GET /api/v1/asset/ndbroker/deposit/list
 *
 * IMPORTANT: This endpoint has rate limit weight = 10 (heavier than most)
 *
 * @param {Object} filters - Optional filters
 * @param {string} [filters.currency] - Currency filter (e.g., "USDT")
 * @param {string} [filters.status] - Status filter: "PROCESSING", "SUCCESS", "FAILURE"
 * @param {string} [filters.hash] - Transaction hash filter
 * @param {number} [filters.startTimestamp] - Start time in milliseconds
 * @param {number} [filters.endTimestamp] - End time in milliseconds
 * @param {number} [filters.limit] - Max records (default: 1000, max: 1000)
 * @returns {Promise<Object>} Response with array of deposits
 */
async function getDepositList(filters = {}) {
  // Build query parameters
  const params = new URLSearchParams();

  if (filters.currency) params.append('currency', filters.currency);
  if (filters.status) params.append('status', filters.status);
  if (filters.hash) params.append('hash', filters.hash);
  if (filters.startTimestamp) params.append('startTimestamp', filters.startTimestamp.toString());
  if (filters.endTimestamp) params.append('endTimestamp', filters.endTimestamp.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());

  const queryString = params.toString();
  const endpoint = queryString
    ? `/api/v1/asset/ndbroker/deposit/list?${queryString}`
    : `/api/v1/asset/ndbroker/deposit/list`;

  return await makeRequest('GET', endpoint, null, true, null);
}

/**
 * Get withdrawal details for a specific withdrawal
 * API: GET /api/v3/broker/nd/withdraw/detail?withdrawalId={withdrawalId}
 *
 * @param {string} withdrawalId - Withdrawal ID
 * @returns {Promise<Object>} Response with withdrawal details
 */
async function getWithdrawDetail(withdrawalId) {
  const endpoint = `/api/v3/broker/nd/withdraw/detail?withdrawalId=${withdrawalId}`;

  return await makeRequest('GET', endpoint, null, true, null);
}

/**
 * Create API keys for a sub-account
 * API: POST /api/v1/broker/nd/account/apikey
 *
 * CRITICAL: Broker ND API uses different parameter format than standard sub-account API:
 * - Uses "uid" not "subName"
 * - Uses "label" not "remark"
 * - Uses "permissions" (array) not "permission" (string)
 * - ipWhitelist should be array, not string
 *
 * @param {string} uid - Sub-account UID
 * @param {string} passphrase - API key passphrase (7-32 chars, no spaces)
 * @param {string} label - Label/description for the API key
 * @param {Array<string>} permissions - Permissions array: ["General", "Spot"] (default: ["General", "Spot"])
 *                                      Note: "Transfer" permission is NOT supported by KuCoin Broker API
 * @param {Array<string>} ipWhitelist - IP whitelist array (optional)
 * @returns {Promise<Object>} Response with API credentials
 */
async function createSubAccountAPIKeys(uid, passphrase, label, permissions = ['General', 'Spot'], ipWhitelist = null) {
  const endpoint = '/api/v1/broker/nd/account/apikey';
  const body = {
    uid,
    passphrase,
    label,
    permissions  // Array format: ["General", "Spot"] - NO "Transfer"
  };

  // Add IP whitelist if provided (as array)
  if (ipWhitelist) {
    // Convert string to array if needed
    if (typeof ipWhitelist === 'string') {
      body.ipWhitelist = [ipWhitelist];
    } else if (Array.isArray(ipWhitelist)) {
      body.ipWhitelist = ipWhitelist;
    }
  } else {
    // Set empty array if not provided (based on KUCOIN_SUMMARY.md)
    body.ipWhitelist = [];
  }

  return await makeRequest('POST', endpoint, body, true);
}

// ============================================================================
// PHASE 9B - Balance & Transfer APIs
// ============================================================================

/**
 * Get all accounts for a sub-account
 * API: GET /api/v1/accounts?type={type}
 *
 * @param {string} type - Account type ("trade" or "main")
 * @param {Object} apiKeys - Sub-account API keys {apiKey, apiSecret, apiPassphrase}
 * @returns {Promise<Object>} Response with array of all accounts
 */
async function getAllAccounts(type, apiKeys) {
  // CRITICAL: Query params MUST be included in endpoint for signature
  const endpoint = `/api/v1/accounts?type=${type}`;

  // Use Trading API keys when checking broker's own balance (apiKeys === null)
  const useTradingKeys = !apiKeys;
  return await makeRequest('GET', endpoint, null, false, apiKeys, useTradingKeys);
}

/**
 * Get account balance for a specific currency and account type
 * API: GET /api/v1/accounts?currency={currency}&type={type}
 *
 * @param {string} currency - Currency code (e.g., "USDT")
 * @param {string} type - Account type ("main", "trade", "margin")
 * @param {Object} apiKeys - API keys (null = use trading keys for broker account)
 * @returns {Promise<Object>} Response with account data for the specified currency
 */
async function getBalance(currency, type, apiKeys) {
  // CRITICAL: Query params MUST be included in endpoint for signature
  const endpoint = `/api/v1/accounts?currency=${currency}&type=${type}`;

  // Use Trading API keys when checking broker's own balance (apiKeys === null)
  const useTradingKeys = !apiKeys;
  return await makeRequest('GET', endpoint, null, false, apiKeys, useTradingKeys);
}

/**
 * Transfer funds between broker account and sub-account
 * API: POST /api/v1/broker/nd/transfer
 *
 * ENHANCED: Supports both directions and all account types
 *
 * @param {number} amount - Amount to transfer
 * @param {string} uid - Sub-account UID
 * @param {string} direction - Transfer direction:
 *   - "OUT" = broker → sub-account (funding user)
 *   - "IN" = sub-account → broker (withdrawal processing)
 * @param {string} currency - Currency (default: "USDT")
 * @param {string} accountType - Broker account type: "MAIN" | "TRADE" (default: "MAIN")
 * @param {string} specialAccountType - Sub-account type: "MAIN" | "TRADE" (default: "MAIN")
 * @param {string} clientOid - Client order ID for idempotency (optional)
 * @returns {Promise<Object>} Response with {orderId}
 */
async function transferBrokerToSub(
  amount,
  uid,
  direction = 'OUT',
  currency = 'USDT',
  accountType = 'MAIN',
  specialAccountType = 'MAIN',
  clientOid = null
) {
  const endpoint = '/api/v1/broker/nd/transfer';

  // Generate clientOid if not provided (required by API for idempotency)
  const oid = clientOid || `sikka_transfer_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

  const body = {
    amount: parseFloat(parseFloat(amount).toFixed(8)), // toFixed returns string, wrap in parseFloat to get number
    currency,
    accountType,
    specialAccountType,
    specialUid: uid, // API uses 'specialUid' not 'uid'
    direction,
    clientOid: oid
  };

  return await makeRequest('POST', endpoint, body, true);
}

/**
 * Transfer funds between internal accounts (main, trade, margin)
 * API: POST /api/v2/accounts/inner-transfer
 *
 * @param {number} amount - Amount to transfer
 * @param {string} from - Source account type ("main", "trade", "margin")
 * @param {string} to - Destination account type ("main", "trade", "margin")
 * @param {string} currency - Currency to transfer (default: "USDT")
 * @param {Object} apiKeys - Sub-account API keys {apiKey, apiSecret, apiPassphrase}
 * @param {string} clientOid - Client order ID for idempotency (optional)
 * @returns {Promise<Object>} Response with order ID
 */
async function transferInnerAccount(amount, from, to, currency = 'USDT', apiKeys, clientOid = null) {
  const endpoint = '/api/v2/accounts/inner-transfer';

  // Generate clientOid if not provided (required by API for idempotency)
  const oid = clientOid || `sikka_inner_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

  const body = {
    amount: parseFloat(parseFloat(amount).toFixed(8)), // toFixed returns string, wrap in parseFloat to get number
    currency,
    from,
    to,
    clientOid: oid
  };

  return await makeRequest('POST', endpoint, body, false, apiKeys);
}

/**
 * Execute internal withdrawal (P2P transfer) using Withdraw V3 API
 * API: POST /api/v3/withdrawals
 *
 * For internal transfers (isInner=true):
 * - Instant and free (no fees)
 * - Supports UID, EMAIL, or PHONE as address type
 * - No blockchain transaction required
 *
 * @param {Object} params - Withdrawal parameters
 * @param {string} params.currency - Currency to transfer (e.g., "BTC", "USDT")
 * @param {string} params.amount - Amount to transfer
 * @param {string} params.toAddress - Recipient identifier (UID, email, or phone)
 * @param {string} params.withdrawType - Address type: "UID" | "MAIL" | "PHONE"
 * @param {string} [params.remark] - Optional note/memo
 * @param {string} [params.clientOid] - Client order ID for idempotency
 * @param {Object} apiKeys - Sender's sub-account API keys {apiKey, apiSecret, apiPassphrase}
 * @returns {Promise<Object>} Response with {withdrawalId}
 */
async function withdrawV3Internal(params, apiKeys) {
  const endpoint = '/api/v3/withdrawals';

  // Generate clientOid if not provided (for idempotency)
  const clientOid = params.clientOid ||
    `sikka_p2p_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

  const body = {
    currency: params.currency.toUpperCase(),
    amount: parseFloat(parseFloat(params.amount).toFixed(8)), // toFixed returns string, wrap in parseFloat to get number
    toAddress: params.toAddress,
    withdrawType: params.withdrawType, // UID, MAIL, or PHONE
    isInner: true, // CRITICAL: Internal transfer - free and instant
    remark: params.remark || 'Sikka P2P Transfer'
  };

  console.log('[KuCoin P2P] Initiating internal withdrawal:', {
    currency: body.currency,
    amount: body.amount,
    withdrawType: body.withdrawType,
    toAddressPreview: body.toAddress.substring(0, 10) + '...',
    clientOid
  });

  // Use standard API (not broker), with sender's sub-account keys
  return await makeRequest('POST', endpoint, body, false, apiKeys);
}

// ============================================================================
// PHASE 9C - Market Data APIs
// ============================================================================

/**
 * Get all available trading symbols with their configuration
 * API: GET /api/v1/symbols
 *
 * @returns {Promise<Object>} Response with symbol list
 */
async function getAllSymbols() {
  const endpoint = '/api/v1/symbols';

  return await makeRequest('GET', endpoint, null, false);
}

/**
 * Get current market price for a symbol (orderbook level 1)
 * API: GET /api/v1/market/orderbook/level1?symbol={symbol}
 *
 * @param {string} symbol - Trading pair (e.g., "BTC-USDT")
 * @returns {Promise<Object>} Response with current price (best bid/ask)
 */
async function getMarketPrice(symbol) {
  // CRITICAL: Query params MUST be included in endpoint for signature
  const endpoint = `/api/v1/market/orderbook/level1?symbol=${symbol}`;

  const result = await makeRequest('GET', endpoint, null, false);

  // Normalize response: real API uses 'price', mock uses 'last'
  if (result.data && result.data.price && !result.data.last) {
    result.data.last = result.data.price;
  }

  return result;
}

// ============================================================================
// PHASE 9D - Trading APIs
// ============================================================================

/**
 * Place a spot trading order (HF - High Frequency)
 * API: POST /api/v1/hf/orders
 *
 * @param {string} symbol - Trading pair (e.g., "BTC-USDT")
 * @param {string} side - Order side ("buy" or "sell")
 * @param {string} type - Order type ("market" or "limit")
 * @param {Object} params - Order parameters
 * @param {number} [params.size] - Order size (base currency) - for market SELL and limit orders
 * @param {number} [params.funds] - Order funds (quote currency) - for market BUY orders
 * @param {number} [params.price] - Order price (required for limit orders)
 * @param {string} [params.clientOid] - Client order ID for idempotency
 * @param {Object} apiKeys - Sub-account API keys {apiKey, apiSecret, apiPassphrase}
 * @returns {Promise<Object>} Response with order ID
 */
async function placeOrder(symbol, side, type, params, apiKeys) {
  const endpoint = '/api/v1/hf/orders';
  const body = {
    symbol,
    side,
    type
  };

  // Validate required parameters based on order type
  if (type === 'market') {
    if (side === 'buy' && !params.funds) {
      throw new Error('Market buy orders require "funds" parameter (quote currency amount)');
    }
    if (side === 'sell' && !params.size) {
      throw new Error('Market sell orders require "size" parameter (base currency amount)');
    }
  }

  // Add optional parameters - toFixed(8) returns string, wrap in parseFloat to get number
  if (params.size) {
    body.size = parseFloat(parseFloat(params.size).toFixed(8));
  }
  if (params.funds) {
    body.funds = parseFloat(parseFloat(params.funds).toFixed(8));
  }
  if (params.price) {
    body.price = parseFloat(parseFloat(params.price).toFixed(8));
  }

  // Always include clientOid for idempotency (required by KuCoin best practices)
  const clientOid = params.clientOid || `sikka_order_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  body.clientOid = clientOid;

  return await makeRequest('POST', endpoint, body, false, apiKeys);
}

/**
 * Get order status and details
 * API: GET /api/v1/hf/orders/{orderId}
 *
 * @param {string} orderId - Order ID
 * @param {Object} apiKeys - Sub-account API keys {apiKey, apiSecret, apiPassphrase}
 * @returns {Promise<Object>} Response with order details
 */
async function getOrderStatus(orderId, apiKeys) {
  // CRITICAL: Path parameter is part of the endpoint
  const endpoint = `/api/v1/hf/orders/${orderId}`;

  return await makeRequest('GET', endpoint, null, false, apiKeys);
}

/**
 * Get filled (completed) HF orders
 * API: GET /api/v1/hf/orders/done
 *
 * @param {string} symbol - Trading pair (optional, e.g., "BTC-USDT")
 * @param {Object} apiKeys - Sub-account API keys {apiKey, apiSecret, apiPassphrase}
 * @returns {Promise<Object>} Response with list of filled orders
 */
async function getFilledOrders(symbol, apiKeys) {
  let endpoint = '/api/v1/hf/orders/done';

  // Add symbol filter if provided
  if (symbol) {
    endpoint += `?symbol=${symbol}`;
  }

  return await makeRequest('GET', endpoint, null, false, apiKeys);
}

/**
 * Cancel an order by order ID
 * API: DELETE /api/v1/hf/orders/{orderId}
 *
 * @param {string} orderId - KuCoin order ID to cancel
 * @param {Object} apiKeys - Sub-account API keys {apiKey, apiSecret, apiPassphrase}
 * @returns {Promise<Object>} Response with {cancelledOrderIds: [orderId]}
 */
async function cancelOrder(orderId, apiKeys) {
  // CRITICAL: Path parameter is part of the endpoint
  const endpoint = `/api/v1/hf/orders/${orderId}`;

  // Use makeRequest with DELETE method
  // No body required for DELETE request
  return await makeRequest('DELETE', endpoint, null, false, apiKeys);
}

// ============================================================================
// PHASE 9E - Deposit Address APIs
// ============================================================================

/**
 * Get deposit addresses for a currency
 * API: GET /api/v3/deposit-addresses?currency={currency}&chain={chain}
 *
 * @param {string} currency - Currency code (e.g., "USDT")
 * @param {string} chain - Chain ID (e.g., "bsc", "trx", "eth")
 * @param {Object} apiKeys - API keys (null = use trading keys, provide keys for sub-account)
 * @returns {Promise<Object>} Response with array of deposit addresses
 */
async function getDepositAddress(currency, chain = null, apiKeys = null) {
  let endpoint = `/api/v3/deposit-addresses?currency=${currency}`;

  if (chain) {
    endpoint += `&chain=${chain}`;
  }

  // Use trading keys if apiKeys not provided (deposit addresses are trading operations)
  const useTradingKeys = !apiKeys;
  return await makeRequest('GET', endpoint, null, false, apiKeys, useTradingKeys);
}

/**
 * Create/Add a deposit address for a currency
 * API: POST /api/v3/deposit-address/create
 *
 * @param {string} currency - Currency code (e.g., "USDT")
 * @param {string} chain - Chain ID (e.g., "bsc", "trx", "eth")
 * @param {string} to - Account type: "main" or "trade" (default: "main")
 * @param {Object} apiKeys - API keys (null = use trading keys, provide keys for sub-account)
 * @returns {Promise<Object>} Response with new deposit address
 */
async function createDepositAddress(currency, chain, to = 'main', apiKeys = null) {
  const endpoint = '/api/v3/deposit-address/create';
  const body = {
    currency,
    chain,
    to
  };

  // Use trading keys if apiKeys not provided (deposit addresses are trading operations)
  const useTradingKeys = !apiKeys;
  return await makeRequest('POST', endpoint, body, false, apiKeys, useTradingKeys);
}

/**
 * Get historical candle data (public endpoint, no auth)
 * @param {string} symbol - Trading pair (e.g., 'BTC-USDT')
 * @param {string} type - Interval (e.g., '1hour', '1day', '1week')
 * @returns {Array} Candle data [time, open, close, high, low, volume, turnover]
 */
async function getCandles(symbol, type = '1hour') {
  try {
    // KuCoin public API - no authentication required
    const endpoint = `/api/v1/market/candles?symbol=${symbol}&type=${type}`;
    const response = await axios.get(`${config.baseUrl}${endpoint}`);

    if (!response.data || response.data.code !== '200000') {
      throw new Error(response.data?.msg || 'Failed to fetch candles');
    }

    return response.data.data || [];
  } catch (error) {
    console.error('KuCoin getCandles error:', error.message);
    throw error;
  }
}

// ============================================================================
// Phase 9F - Trade Fees
// ============================================================================

/**
 * Get actual trading fee rates for symbols
 * API: GET /api/v1/trade-fees?symbols={symbols}
 *
 * This returns the ACTUAL fee rate including broker discounts.
 * The fee rate of sub-accounts is the same as the master account.
 *
 * @param {string|string[]} symbols - Trading pair(s), max 10 at a time (e.g., "BTC-USDT" or ["BTC-USDT", "ETH-USDT"])
 * @param {Object} apiKeys - API keys (null = use broker keys)
 * @returns {Promise<Object>} Response with fee rates: { symbol, takerFeeRate, makerFeeRate }
 */
async function getActualFee(symbols, apiKeys = null) {
  // Convert array to comma-separated string
  const symbolsStr = Array.isArray(symbols) ? symbols.join(',') : symbols;
  const endpoint = `/api/v1/trade-fees?symbols=${symbolsStr}`;

  // Use trading keys if no apiKeys provided (fee lookup is a general operation)
  const useTradingKeys = !apiKeys;
  return await makeRequest('GET', endpoint, null, false, apiKeys, useTradingKeys);
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
  // Export config for testing
  config,

  // Phase 9A - Account & KYC
  createSubAccount,
  getSubAccount,
  submitKYC,
  getKYCStatus,              // ENHANCED - now supports multiple UIDs
  createSubAccountAPIKeys,
  getSubAccountAPIKeys,      // EXISTING
  getSubAccountAPIKey,       // NEW - single key lookup
  deleteSubAccountAPIKey,    // NEW - delete API key for recovery

  // Phase 9B - Balance & Transfers
  getBalance,
  getAllAccounts,            // NEW - get all accounts at once
  transferBrokerToSub,       // ENHANCED (docs only)
  transferInnerAccount,
  withdrawV3Internal,        // NEW - P2P internal transfers
  getTransferHistory,        // NEW

  // Phase 9C - Market Data
  getAllSymbols,
  getMarketPrice,
  getCandles,

  // Phase 9D - Trading
  placeOrder,
  getOrderStatus,
  getFilledOrders,
  cancelOrder,

  // Phase 9E - Deposits & Withdrawals
  getDepositList,           // NEW
  getWithdrawDetail,        // NEW
  getDepositAddress,        // NEW - Get deposit address
  createDepositAddress,     // NEW - Create deposit address

  // Phase 9F - Trade Fees
  getActualFee              // NEW - Get actual trading fee rates
};
