import { create } from 'zustand';
import backendApi from '../services/backendApi';

/**
 * Bank Account Store
 *
 * Manages bank account-related state including:
 * - Bank account CRUD operations
 * - Setting default bank account
 * - Loading and error states
 */
const useBankAccountStore = create((set, get) => ({
  // State
  accounts: [],
  loading: false,
  error: null,
  lastFetch: null,

  // Actions

  /**
   * Fetch all bank accounts
   * @returns {Promise<Array>} Bank accounts list
   */
  fetchAccounts: async () => {
    set({ loading: true, error: null });

    try {
      console.log('🏦 Fetching bank accounts...');
      const response = await backendApi.bankAccounts.list();

      console.log('✅ Bank accounts fetched:', response.data?.length || 0, 'items');

      // Backend returns: { success: true, data: [...] }
      const accountsData = Array.isArray(response.data) ? response.data : [];

      set({
        accounts: accountsData,
        loading: false,
        lastFetch: new Date(),
      });

      return accountsData;
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
   * @param {Object} data - Bank account details
   * @param {string} data.account_holder_name - Account holder name
   * @param {string} data.bank_name - Bank name
   * @param {string} data.account_number - Account number
   * @param {string} data.ifsc_code - IFSC code
   * @param {string} data.account_type - Account type (savings/current)
   * @param {string} [data.branch] - Branch name (optional)
   * @returns {Promise<Object>} Created bank account
   */
  addAccount: async (data) => {
    set({ loading: true, error: null });

    try {
      console.log('🏦 Adding bank account...', data.account_holder_name);
      const response = await backendApi.bankAccounts.add(data);

      console.log('✅ Bank account added:', response.data);

      set({ loading: false });

      // Refresh accounts list
      await get().fetchAccounts();

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
   * Update existing bank account
   * @param {string} id - Bank account ID
   * @param {Object} data - Updated bank account details
   * @returns {Promise<Object>} Updated bank account
   */
  updateAccount: async (id, data) => {
    set({ loading: true, error: null });

    try {
      console.log('🏦 Updating bank account:', id);
      const response = await backendApi.bankAccounts.update(id, data);

      console.log('✅ Bank account updated:', response.data);

      set({ loading: false });

      // Refresh accounts list
      await get().fetchAccounts();

      return response.data;
    } catch (error) {
      console.error('❌ Update bank account error:', error);
      set({
        error: error.message || 'Failed to update bank account',
        loading: false,
      });
      throw error;
    }
  },

  /**
   * Delete bank account
   * @param {string} id - Bank account ID
   * @returns {Promise<void>}
   */
  deleteAccount: async (id) => {
    set({ loading: true, error: null });

    try {
      console.log('🗑️ Deleting bank account:', id);
      await backendApi.bankAccounts.delete(id);

      console.log('✅ Bank account deleted');

      set({ loading: false });

      // Refresh accounts list
      await get().fetchAccounts();
    } catch (error) {
      console.error('❌ Delete bank account error:', error);
      set({
        error: error.message || 'Failed to delete bank account',
        loading: false,
      });
      throw error;
    }
  },

  /**
   * Set bank account as default
   * @param {string} id - Bank account ID
   * @returns {Promise<Object>} Updated bank account
   */
  setDefault: async (id) => {
    set({ loading: true, error: null });

    try {
      console.log('⭐ Setting default bank account:', id);
      const response = await backendApi.bankAccounts.setDefault(id);

      console.log('✅ Default bank account set:', response.data);

      set({ loading: false });

      // Refresh accounts list to update is_default flags
      await get().fetchAccounts();

      return response.data;
    } catch (error) {
      console.error('❌ Set default bank account error:', error);
      set({
        error: error.message || 'Failed to set default bank account',
        loading: false,
      });
      throw error;
    }
  },

  /**
   * Get default bank account
   * @returns {Object|null} Default bank account or null if none set
   */
  getDefaultAccount: () => {
    const { accounts } = get();
    return accounts.find(account => account.is_default) || null;
  },

  /**
   * Get bank account by ID
   * @param {string} id - Bank account ID
   * @returns {Object|null} Bank account or null if not found
   */
  getAccountById: (id) => {
    const { accounts } = get();
    return accounts.find(account => account.id === id) || null;
  },

  /**
   * Clear error state
   */
  clearError: () => set({ error: null }),

  /**
   * Reset bank account store to initial state
   */
  reset: () => set({
    accounts: [],
    loading: false,
    error: null,
    lastFetch: null,
  }),
}));

export default useBankAccountStore;
