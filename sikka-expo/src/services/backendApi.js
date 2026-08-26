import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { auth } from '../config/firebase';
import API_CONFIG from '../config/api';

// Import the store to trigger logout on 401 errors
import { useStore } from '../store/useStore';

// Backend API base URL from JavaScript config file
// No more .env caching issues - just edit src/config/api.js directly
const API_BASE_URL = API_CONFIG.API_BASE_URL;

// Firebase Auth Token Storage Key
const FIREBASE_AUTH_TOKEN_KEY = '@sikka_firebase_auth_token';

/**
 * Get current Firebase auth token
 * @returns {Promise<string|null>} Firebase auth token
 */
const getAuthToken = async () => {
  try {
    // Try to get fresh token from current user
    const currentUser = auth.currentUser;
    if (currentUser) {
      // Force token refresh to prevent expiry issues (tokens expire after 1 hour)
      return await currentUser.getIdToken(true);
    }

    // Fallback to stored token
    return await AsyncStorage.getItem(FIREBASE_AUTH_TOKEN_KEY);
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

/**
 * Make authenticated API request
 * @param {string} endpoint - API endpoint path
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} API response
 */
const apiRequest = async (endpoint, options = {}) => {
  try {
    const token = await getAuthToken();

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add ngrok header only when using ngrok URLs
    if (API_BASE_URL.includes('ngrok')) {
      headers['ngrok-skip-browser-warning'] = 'true';
    }

    // Add Authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      // If no token, throw auth expired error immediately
      console.warn('🚨 API Request: No auth token available');
      const authError = new Error('Authentication expired. Please log in again.');
      authError.code = 'AUTH_EXPIRED';
      authError.status = 401;
      throw authError;
    }

    const url = `${API_BASE_URL}${endpoint}`;
    console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    let data;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { message: text };
    }

    // Handle HTTP errors
    if (!response.ok) {
      console.error(`❌ API Error: ${response.status}`, data);
      
      // Special handling for 401 Unauthorized - token expired
      if (response.status === 401) {
        console.warn('🚨 API Error: 401 Unauthorized - Token expired, user needs to re-authenticate');
        
        // Create a special error that indicates authentication is required
        const authError = new Error('Authentication expired. Please log in again.');
        authError.code = 'AUTH_EXPIRED';
        authError.status = 401;
        
        // Don't throw here - return the error so it can be handled by the caller
        throw authError;
      }
      
      throw new Error(data.error || data.message || `HTTP ${response.status}`);
    }

    console.log(`✅ API Success: ${options.method || 'GET'} ${endpoint}`);
    return data;
  } catch (error) {
    console.error(`❌ API Request Failed: ${endpoint}`, error);

    // Provide user-friendly error messages
    if (error.message.includes('Failed to fetch') || error.message.includes('Network request failed')) {
      throw new Error('Network error. Please check your connection and ensure the backend is running.');
    }

    throw error;
  }
};

/**
 * Make public API request (no auth)
 * @param {string} endpoint - API endpoint path
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} API response
 */
const publicApiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`🌐 Public API Request: ${options.method || 'GET'} ${url}`);

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add ngrok header only when using ngrok URLs
  if (API_BASE_URL.includes('ngrok')) {
    headers['ngrok-skip-browser-warning'] = 'true';
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  let data;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = { message: await response.text() };
  }

  if (!response.ok) {
    console.error(`❌ Public API Error: ${response.status}`, data);
    throw new Error(data.error || data.message || `HTTP ${response.status}`);
  }

  console.log(`✅ Public API Success: ${options.method || 'GET'} ${endpoint}`);
  return data;
};

/**
 * Backend API Service
 */
export const backendApi = {
  /**
   * Generic GET request
   * @param {string} endpoint - API endpoint path
   * @returns {Promise<Object>} API response
   */
  get: async (endpoint) => {
    return await apiRequest(endpoint, { method: 'GET' });
  },

  /**
   * Generic POST request
   * @param {string} endpoint - API endpoint path
   * @param {Object} data - Request body data
   * @returns {Promise<Object>} API response
   */
  post: async (endpoint, data) => {
    return await apiRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Generic PUT request
   * @param {string} endpoint - API endpoint path
   * @param {Object} data - Request body data
   * @returns {Promise<Object>} API response
   */
  put: async (endpoint, data) => {
    return await apiRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Generic DELETE request
   * @param {string} endpoint - API endpoint path
   * @returns {Promise<Object>} API response
   */
  delete: async (endpoint) => {
    return await apiRequest(endpoint, { method: 'DELETE' });
  },

  /**
   * Register new user after Firebase signup
   * @param {Object} userData - User registration data
   * @param {string} userData.fullName - User full name
   * @param {string} [userData.phone] - User phone number (optional)
   * @returns {Promise<Object>} Registration response with user data and token
   * Note: Email is extracted from Firebase token in Authorization header
   */
  registerUser: async (userData) => {
    return await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  /**
   * Get current user basic info
   * @returns {Promise<Object>} User data
   */
  getCurrentUser: async () => {
    return await apiRequest('/api/auth/profile', {
      method: 'GET',
    });
  },

  /**
   * Get full user profile
   * @returns {Promise<Object>} Full profile data
   */
  getUserProfile: async () => {
    return await apiRequest('/api/auth/profile', {
      method: 'GET',
    });
  },

  /**
   * Login user with Firebase authentication
   * Verifies token and returns user profile
   * @returns {Promise<Object>} User data
   */
  login: async () => {
    return await apiRequest('/api/auth/login', {
      method: 'POST'
    });
  },

  /**
   * Update user profile
   * @param {Object} profileData - Profile data to update
   * @param {string} [profileData.fullName] - User full name
   * @param {string} [profileData.phone] - User phone number
   * @param {string} [profileData.displayCurrency] - Display currency (INR/USD)
   * @returns {Promise<Object>} Updated profile data
   */
  updateUserProfile: async (profileData) => {
    return await apiRequest('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  /**
   * KYC API methods
   */
  kyc: {
    /**
     * Get KYC status
     * @returns {Promise<Object>} KYC status data
     */
    getStatus: async () => {
      return await apiRequest('/api/kyc/status', {
        method: 'GET',
      });
    },

    /**
     * Submit KYC documents
     * @param {Object} kycData - KYC document data with fields:
     *   firstName, lastName, dateOfBirth, address, idType, idNumber, country,
     *   expireDate, facePhoto, frontPhoto, backendPhoto
     * @returns {Promise<Object>} Submission result
     */
    submit: async (kycData) => {
      return await apiRequest('/api/kyc/submit', {
        method: 'POST',
        body: JSON.stringify(kycData),
      });
    },

    /**
     * Resubmit KYC data (after rejection)
     * @param {Object} kycData - KYC resubmission data
     * @param {string} kycData.fullName - Full name
     * @param {string} kycData.dateOfBirth - Date of birth (YYYY-MM-DD)
     * @param {Object} kycData.address - Address object
     * @param {Object} kycData.idProof - ID proof object with images
     * @returns {Promise<Object>} KYC resubmission response
     */
    resubmit: async (kycData) => {
      return await apiRequest('/api/kyc/resubmit', {
        method: 'POST',
        body: JSON.stringify(kycData),
      });
    },
  },

  /**
   * Trading API methods
   */
  trading: {
    /**
     * Place a buy order
     * @param {string} symbol - Trading symbol (e.g., 'BTC', 'ETH')
     * @param {number} quantity - Quantity to buy
     * @returns {Promise<Object>} Trade execution response
     */
    buy: async (symbol, quantity) => {
      return await apiRequest('/api/trades/buy', {
        method: 'POST',
        body: JSON.stringify({ symbol, quantity }),
      });
    },

    /**
     * Place a sell order
     * @param {string} symbol - Trading symbol (e.g., 'BTC', 'ETH')
     * @param {number} quantity - Quantity to sell
     * @returns {Promise<Object>} Trade execution response
     */
    sell: async (symbol, quantity) => {
      return await apiRequest('/api/trades/sell', {
        method: 'POST',
        body: JSON.stringify({ symbol, quantity }),
      });
    },

    /**
     * Get trade history with optional filters
     * @param {Object} filters - Filter options
     * @param {string} [filters.symbol] - Filter by trading symbol
     * @param {string} [filters.side] - Filter by side (buy/sell)
     * @param {number} [filters.limit] - Number of trades to fetch
     * @param {number} [filters.offset] - Pagination offset
     * @returns {Promise<Object>} Trade history
     */
    getHistory: async (filters = {}) => {
      const params = new URLSearchParams();
      if (filters.symbol) params.append('symbol', filters.symbol);
      if (filters.side) params.append('side', filters.side);
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.offset) params.append('offset', filters.offset.toString());

      const queryString = params.toString();
      const endpoint = queryString
        ? `/api/trades/history?${queryString}`
        : '/api/trades/history';

      return await apiRequest(endpoint, { method: 'GET' });
    },

    /**
     * Get specific trade by ID
     * @param {string} tradeId - Trade ID
     * @returns {Promise<Object>} Trade details
     */
    getById: async (tradeId) => {
      return await apiRequest(`/api/trades/${tradeId}`, {
        method: 'GET',
      });
    },

    /**
     * Cancel a pending trade order
     * @param {string} tradeId - Trade ID to cancel
     * @returns {Promise<Object>} Cancellation response
     */
    cancel: async (tradeId) => {
      return await apiRequest(`/api/trades/${tradeId}/cancel`, {
        method: 'POST',
      });
    },

    /**
     * Get profit and loss summary
     * @returns {Promise<Object>} P&L data with realized/unrealized gains
     */
    getPNL: async () => {
      return await apiRequest('/api/trades/pnl', {
        method: 'GET',
      });
    },

    /**
     * Estimate trading fees
     * @param {string} symbol - Trading symbol (e.g., 'BTC', 'ETH')
     * @param {string} side - 'buy' or 'sell'
     * @param {number} quantity - Quantity to trade
     * @returns {Promise<Object>} Fee estimation
     */
    estimateFees: async (symbol, side, quantity) => {
      return await apiRequest('/api/trades/estimate-fees', {
        method: 'POST',
        body: JSON.stringify({ symbol, side, quantity }),
      });
    },
  },

  /**
   * Balance API methods
   */
  balance: {
    /**
     * Get user's account balance (MAIN and TRADE accounts)
     * @returns {Promise<Object>} Balance data for all accounts and currencies
     */
    get: async () => {
      return await apiRequest('/api/balance', {
        method: 'GET',
      });
    },

    /**
     * Get user's crypto holdings with current values
     * @returns {Promise<Object>} Holdings data with market prices
     */
    getHoldings: async () => {
      return await apiRequest('/api/balance/holdings', {
        method: 'GET',
      });
    },
  },

  /**
   * Deposits API methods
   */
  deposits: {
    /**
     * Initiate a deposit (create Cashfree payment order)
     * @param {number} amount - Amount to deposit in INR
     * @returns {Promise<Object>} Payment session details with payment_session_id
     */
    initiate: async (amount) => {
      return await apiRequest('/api/deposits/initiate', {
        method: 'POST',
        body: JSON.stringify({ amount }),
      });
    },

    /**
     * Create manual bank transfer deposit
     * @param {number} amount - Amount to deposit in INR
     * @param {string} utr_number - UTR/Reference number from bank transfer
     * @returns {Promise<Object>} Manual deposit details
     */
    createManual: async (amount, utr_number) => {
      return await apiRequest('/api/deposits/manual', {
        method: 'POST',
        body: JSON.stringify({ amount, utr_number }),
      });
    },

    /**
     * Get deposit history
     * @param {Object} filters - Filter options
     * @param {string} [filters.status] - Filter by status (pending/success/failed)
     * @param {number} [filters.limit] - Number of deposits to fetch
     * @param {number} [filters.offset] - Pagination offset
     * @returns {Promise<Object>} Deposit history
     */
    getHistory: async (filters = {}) => {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.offset) params.append('offset', filters.offset.toString());

      const queryString = params.toString();
      const endpoint = queryString
        ? `/api/deposits/history?${queryString}`
        : '/api/deposits/history';

      return await apiRequest(endpoint, { method: 'GET' });
    },

    /**
     * Get specific deposit by ID
     * @param {string} depositId - Deposit ID
     * @returns {Promise<Object>} Deposit details with Cashfree status
     */
    getById: async (depositId) => {
      return await apiRequest(`/api/deposits/${depositId}`, {
        method: 'GET',
      });
    },

    /**
     * Get deposit by Cashfree order ID
     * @param {string} orderId - Cashfree order ID
     * @returns {Promise<Object>} Deposit details
     */
    getByOrderId: async (orderId) => {
      return await apiRequest(`/api/deposits/status?order_id=${orderId}`, {
        method: 'GET',
      });
    },
  },

  /**
   * Withdrawals API methods
   */
  withdrawals: {
    /**
     * Request a withdrawal
     * @param {number} amountInr - Amount to withdraw in INR
     * @param {string} bankAccountId - Bank account ID for withdrawal
     * @returns {Promise<Object>} Withdrawal request response
     */
    request: async (amountInr, bankAccountId) => {
      return await apiRequest('/api/withdrawals/request', {
        method: 'POST',
        body: JSON.stringify({ amount_inr: amountInr, bank_account_id: bankAccountId }),
      });
    },

    /**
     * Get withdrawal history with optional filters
     * @param {Object} filters - Filter options
     * @param {string} [filters.status] - Filter by status (pending/approved/rejected/completed)
     * @param {number} [filters.limit] - Number of withdrawals to fetch
     * @param {number} [filters.offset] - Pagination offset
     * @returns {Promise<Object>} Withdrawal history
     */
    getHistory: async (filters = {}) => {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.offset) params.append('offset', filters.offset.toString());

      const queryString = params.toString();
      const endpoint = queryString
        ? `/api/withdrawals/history?${queryString}`
        : '/api/withdrawals/history';

      return await apiRequest(endpoint, { method: 'GET' });
    },

    /**
     * Get specific withdrawal by ID
     * @param {string} id - Withdrawal ID
     * @returns {Promise<Object>} Withdrawal details
     */
    getById: async (id) => {
      return await apiRequest(`/api/withdrawals/${id}`, {
        method: 'GET',
      });
    },
  },

  /**
   * Bank Accounts API methods
   */
  bankAccounts: {
    /**
     * List all bank accounts
     * @returns {Promise<Object>} Bank accounts list
     */
    list: async () => {
      return await apiRequest('/api/bank-accounts', {
        method: 'GET',
      });
    },

    /**
     * Add new bank account
     * @param {Object} data - Bank account details
     * @param {string} data.account_holder_name - Account holder name
     * @param {string} data.bank_name - Bank name
     * @param {string} data.account_number - Account number
     * @param {string} data.ifsc_code - IFSC code
     * @param {string} data.account_type - Account type (savings/current)
     * @param {string} [data.branch] - Branch name (optional)
     * @returns {Promise<Object>} Created bank account
     */
    add: async (data) => {
      return await apiRequest('/api/bank-accounts', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    /**
     * Update bank account
     * @param {string} id - Bank account ID
     * @param {Object} data - Updated bank account details
     * @returns {Promise<Object>} Updated bank account
     */
    update: async (id, data) => {
      return await apiRequest(`/api/bank-accounts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    /**
     * Delete bank account
     * @param {string} id - Bank account ID
     * @returns {Promise<Object>} Deletion response
     */
    delete: async (id) => {
      return await apiRequest(`/api/bank-accounts/${id}`, {
        method: 'DELETE',
      });
    },

    /**
     * Set bank account as default
     * @param {string} id - Bank account ID
     * @returns {Promise<Object>} Updated bank account
     */
    setDefault: async (id) => {
      return await apiRequest(`/api/bank-accounts/${id}/set-default`, {
        method: 'POST',
      });
    },

    /**
     * Get specific bank account by ID
     * @param {string} id - Bank account ID
     * @returns {Promise<Object>} Bank account details
     */
    getById: async (id) => {
      return await apiRequest(`/api/bank-accounts/${id}`, {
        method: 'GET',
      });
    },
  },

  /**
   * Transfers API methods
   */
  transfers: {
    /**
     * Transfer funds between MAIN and TRADE accounts
     * @param {string} fromType - Source account type ('MAIN' or 'TRADE')
     * @param {string} toType - Destination account type ('MAIN' or 'TRADE')
     * @param {string} currency - Currency to transfer (e.g., 'USDT')
     * @param {number} amount - Amount to transfer
     * @returns {Promise<Object>} Transfer response with transfer_id
     */
    innerAccount: async (fromType, toType, currency, amount) => {
      return await apiRequest('/api/transfers/inner-account', {
        method: 'POST',
        body: JSON.stringify({
          from_type: fromType,
          to_type: toType,
          currency,
          amount,
        }),
      });
    },

    /**
     * Get transfer history
     * @param {Object} filters - Filter options
     * @param {number} [filters.limit] - Number of transfers to fetch
     * @param {number} [filters.offset] - Pagination offset
     * @returns {Promise<Object>} Transfer history
     */
    getHistory: async (filters = {}) => {
      const params = new URLSearchParams();
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.offset) params.append('offset', filters.offset.toString());

      const queryString = params.toString();
      const endpoint = queryString
        ? `/api/transfers/history?${queryString}`
        : '/api/transfers/history';

      return await apiRequest(endpoint, { method: 'GET' });
    },
  },

  /**
   * P2P Transfer API methods
   * Send crypto to other Sikka users (free, instant internal transfers)
   */
  p2p: {
    /**
     * Look up a recipient by email or phone
     * @param {string} type - 'email' or 'phone'
     * @param {string} value - The email or phone number
     * @returns {Promise<Object>} Lookup result with recipient info
     */
    lookup: async (type, value) => {
      return await apiRequest(`/api/p2p/lookup?type=${type}&value=${encodeURIComponent(value)}`, {
        method: 'GET',
      });
    },

    /**
     * Initiate a P2P transfer
     * @param {string} recipientId - UUID of recipient
     * @param {string} currency - Currency to transfer (BTC, ETH, USDT, etc.)
     * @param {number} amount - Amount to transfer
     * @param {string} [note] - Optional note/message
     * @returns {Promise<Object>} Transfer result
     */
    transfer: async (recipientId, currency, amount, note = '') => {
      return await apiRequest('/api/p2p/transfer', {
        method: 'POST',
        body: JSON.stringify({ recipientId, currency, amount, note }),
      });
    },

    /**
     * Get P2P transfer history
     * @param {Object} filters - Filter options
     * @param {string} [filters.direction] - 'sent', 'received', or 'all'
     * @param {string} [filters.currency] - Filter by currency
     * @param {number} [filters.limit] - Number of transfers to fetch
     * @param {number} [filters.offset] - Pagination offset
     * @returns {Promise<Object>} Transfer history
     */
    getHistory: async (filters = {}) => {
      const params = new URLSearchParams();
      if (filters.direction) params.append('direction', filters.direction);
      if (filters.currency) params.append('currency', filters.currency);
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.offset) params.append('offset', filters.offset.toString());

      const queryString = params.toString();
      const endpoint = queryString
        ? `/api/p2p/history?${queryString}`
        : '/api/p2p/history';

      return await apiRequest(endpoint, { method: 'GET' });
    },

    /**
     * Get specific transfer details
     * @param {string} transferId - Transfer UUID
     * @returns {Promise<Object>} Transfer details
     */
    getById: async (transferId) => {
      return await apiRequest(`/api/p2p/transfer/${transferId}`, {
        method: 'GET',
      });
    },
  },

  /**
   * Market API methods
   */
  market: {
    /**
     * Get prices for multiple tokens
     * @param {string[]} symbols - Array of token symbols (e.g., ['BTC', 'ETH', 'SOL'])
     * @returns {Promise<Object>} Price data for requested tokens
     */
    getPrices: async (symbols = []) => {
      const queryString = symbols.length > 0 ? `?symbols=${symbols.join(',')}` : '';
      return await publicApiRequest(`/api/tokens/prices${queryString}`, {
        method: 'GET',
      });
    },

    /**
     * Get price for a single token
     * @param {string} symbol - Token symbol (e.g., 'BTC', 'ETH')
     * @returns {Promise<Object>} Price data for the token
     */
    getPrice: async (symbol) => {
      return await publicApiRequest(`/api/tokens/${symbol}/price`, {
        method: 'GET',
      });
    },

    /**
     * Get INR to USDT exchange rate (public endpoint)
     * @returns {Promise<Object>} Exchange rate data
     */
    getExchangeRate: async () => {
      return await publicApiRequest('/api/tokens/rates/inr-usdt', {
        method: 'GET',
      });
    },

    /**
     * Get list of available tokens for trading
     * @returns {Promise<Object>} Available tokens with trading info
     */
    getAvailableTokens: async () => {
      return await apiRequest('/api/tokens/available', {
        method: 'GET',
      });
    },
  },
};

export default backendApi;