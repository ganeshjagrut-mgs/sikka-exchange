const API_BASE = import.meta.env.VITE_API_URL || 'http://35.200.154.218:3000';

let authToken = null;

export const setToken = (token) => {
  authToken = token;
};

export const clearToken = () => {
  authToken = null;
};

export const hasToken = () => !!authToken;

const request = async (method, endpoint, body = null) => {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const config = {
    method,
    headers,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Request failed');
  }

  return data;
};

const GET = (endpoint) => request('GET', endpoint);
const POST = (endpoint, body) => request('POST', endpoint, body);
const PUT = (endpoint, body) => request('PUT', endpoint, body);

export const adminApi = {
  // Auth
  login: (username, password) => POST('/api/admin/login', { username, password }),

  // Stats
  getStats: () => GET('/api/admin/stats/overview'),

  // Withdrawals
  getPendingWithdrawals: () => GET('/api/admin/withdrawals/pending'),
  completeWithdrawal: (id, data) => POST(`/api/admin/withdrawals/${id}/complete`, data),
  failWithdrawal: (id, data) => POST(`/api/admin/withdrawals/${id}/fail`, data),

  // Deposits - Cashfree (paid)
  getPendingDeposits: () => GET('/api/admin/deposits/pending'),
  transferUSDT: (id, data) => POST(`/api/admin/deposits/${id}/transfer`, data),

  // Deposits - Manual bank transfer
  getPendingApprovalDeposits: () => GET('/api/admin/deposits/pending-approval'),
  approveDeposit: (id) => POST(`/api/admin/deposits/${id}/approve`, {}),
  rejectDeposit: (id, reason) => POST(`/api/admin/deposits/${id}/reject`, { reason }),

  // Manual Transfers
  executeManualTransfer: (data) => POST('/api/admin/transfers/manual', data),
  getTransferHistory: (limit = 20) => GET(`/api/admin/transfers/history?limit=${limit}`),

  // Users
  getUsers: (page = 1, limit = 50) => GET(`/api/admin/users?page=${page}&limit=${limit}`),
  getUserById: (id) => GET(`/api/admin/users/${id}`),
  getUserTransactions: (id, type = 'all', limit = 100) =>
    GET(`/api/admin/users/${id}/transactions?type=${type}&limit=${limit}`),

  // Config
  getConversionRate: () => GET('/api/admin/config/conversion-rate'),
  updateConversionRate: (rate) => POST('/api/admin/config/conversion-rate', { rate }),
  getTokens: () => GET('/api/admin/config/tokens'),
  updateToken: (symbol, data) => PUT(`/api/admin/config/tokens/${symbol}`, data),
};
