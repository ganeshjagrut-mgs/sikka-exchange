import { create } from 'zustand';
import backendApi from '../services/backendApi';

/**
 * Withdrawal Store
 *
 * Manages withdrawal-related state including:
 * - Withdrawal requests
 * - Bank accounts
 * - Loading and error states
 */
const useWithdrawalStore = create((set, get) => ({
  // State
  withdrawals: [],
  bankAccounts: [],
  loading: false,
  error: null,

  /**
   * Fetch user's withdrawal requests
   * @param {Object} filters - Filter options
   * @param {string} [filters.status] - pending|approved|rejected|completed
   * @param {number} [filters.limit] - Number of withdrawals to fetch
   * @param {number} [filters.offset] - Pagination offset
   * @returns {Promise<Array>} Withdrawal requests
   */
  fetchWithdrawals: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      console.log('📤 Fetching withdrawals...', filters);
      const response = await backendApi.withdrawals.getHistory(filters);

      console.log('✅ Withdrawals fetched:', response.data?.length || 0, 'items');

      // Backend returns: { success: true, data: [...] }
      const withdrawalsData = Array.isArray(response.data) ? response.data : [];

      set({
        withdrawals: withdrawalsData,
        loading: false,
      });

      return withdrawalsData;
    } catch (error) {
      console.error('❌ Fetch withdrawals error:', error);
      set({
        error: error.message || 'Failed to fetch withdrawals',
        loading: false,
      });
      throw error;
    }
  },

  /**
   * Create withdrawal request
   * @param {number} amountInr - Amount to withdraw in INR
   * @param {string} bankAccountId - Bank account ID
   * @returns {Promise<Object>} Withdrawal request details
   */
  createWithdrawal: async (amountInr, bankAccountId) => {
    set({ loading: true, error: null });
    try {
      console.log(`💸 Creating withdrawal: ₹${amountInr} to bank account ${bankAccountId}`);
      const response = await backendApi.withdrawals.request(amountInr, bankAccountId);

      console.log('✅ Withdrawal request created:', response.data);

      set({ loading: false });

      // Refresh withdrawals list
      await get().fetchWithdrawals();

      return response.data;
    } catch (error) {
      console.error('❌ Create withdrawal error:', error);
      set({
        error: error.message || 'Failed to create withdrawal',
        loading: false,
      });
      throw error;
    }
  },

  /**
   * Get specific withdrawal by ID
   * @param {string} id - Withdrawal ID
   * @returns {Promise<Object>} Withdrawal details
   */
  getWithdrawalById: async (id) => {
    set({ loading: true, error: null });
    try {
      console.log('🔍 Fetching withdrawal:', id);
      const response = await backendApi.withdrawals.getById(id);

      console.log('✅ Withdrawal fetched:', response.data);
      set({ loading: false });

      return response.data;
    } catch (error) {
      console.error('❌ Fetch withdrawal error:', error);
      set({
        error: error.message || 'Failed to fetch withdrawal',
        loading: false,
      });
      throw error;
    }
  },

  /**
   * Fetch user's bank accounts
   * @returns {Promise<Array>} Bank accounts
   */
  fetchBankAccounts: async () => {
    set({ loading: true, error: null });
    try {
      console.log('🏦 Fetching bank accounts...');
      const response = await backendApi.bankAccounts.list();

      console.log('✅ Bank accounts fetched:', response.data?.length || 0, 'items');

      // Backend returns: { success: true, data: [...] }
      const bankAccountsData = Array.isArray(response.data) ? response.data : [];

      set({
        bankAccounts: bankAccountsData,
        loading: false,
      });

      return bankAccountsData;
    } catch (error) {
      console.error('❌ Fetch bank accounts error:', error);
      set({
        error: error.message || 'Failed to fetch bank accounts',
        loading: false,
      });
      throw error;
    }
  },

  /**
   * Add new bank account
   * @param {Object} accountData - Bank account details
   * @param {string} accountData.account_holder_name - Account holder name
   * @param {string} accountData.bank_name - Bank name
   * @param {string} accountData.account_number - Account number
   * @param {string} accountData.ifsc_code - IFSC code
   * @param {string} accountData.account_type - Account type (savings/current)
   * @param {string} [accountData.branch] - Branch name (optional)
   * @returns {Promise<Object>} Created bank account
   */
  addBankAccount: async (accountData) => {
    set({ loading: true, error: null });
    try {
      console.log('🏦 Adding bank account...', accountData.account_holder_name);
      const response = await backendApi.bankAccounts.add(accountData);

      console.log('✅ Bank account added:', response.data);

      // Refresh bank accounts
      await get().fetchBankAccounts();

      set({ loading: false });
      return response.data;
    } catch (error) {
      console.error('❌ Add bank account error:', error);
      set({
        error: error.message || 'Failed to add bank account',
        loading: false,
      });
      throw error;
    }
  },

  /**
   * Clear error state
   */
  clearError: () => set({ error: null }),

  /**
   * Reset withdrawal store to initial state
   */
  reset: () => set({
    withdrawals: [],
    bankAccounts: [],
    loading: false,
    error: null,
  }),
}));

export default useWithdrawalStore;
