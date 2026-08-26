import { create } from 'zustand';
import backendApi from '../services/backendApi';
import { useStore } from './useStore';

/**
 * Transfer Store
 *
 * Manages internal transfer-related state including:
 * - Transfer execution between MAIN and TRADE accounts
 * - Transfer history
 * - Loading and error states
 */
const useTransferStore = create((set, get) => ({
  // State
  transfers: [],
  loading: false,
  error: null,
  lastFetch: null,

  // Actions

  /**
   * Execute internal account transfer
   * @param {string} fromType - Source account type ('MAIN' or 'TRADE')
   * @param {string} toType - Destination account type ('MAIN' or 'TRADE')
   * @param {string} currency - Currency to transfer (e.g., 'USDT')
   * @param {number} amount - Amount to transfer
   * @returns {Promise<Object>} Transfer response with transfer_id
   */
  executeTransfer: async (fromType, toType, currency, amount) => {
    set({ loading: true, error: null });

    try {
      console.log(`💸 Executing transfer: ${amount} ${currency} from ${fromType} to ${toType}...`);
      const response = await backendApi.transfers.innerAccount(fromType, toType, currency, amount);

      console.log('✅ Transfer executed:', response.data);

      set({ loading: false });

      // Refresh transfer history
      await get().fetchTransferHistory({ limit: 50 });

      return response.data;
    } catch (error) {
      console.error('❌ Transfer execution error:', error);
      
      // Check if this is an auth error and handle logout
      const authResult = await useStore.getState().handleAuthError(error);
      if (authResult.loggedOut) {
        set({
          error: 'Your session has expired. Please log in again.',
          loading: false
        });
        throw new Error('Authentication expired');
      }
      
      set({
        error: error.message || 'Failed to execute transfer',
        loading: false,
      });
      throw error;
    }
  },

  /**
   * Fetch transfer history
   * @param {Object} filters - Filter options
   * @param {number} [filters.limit] - Number of transfers to fetch
   * @param {number} [filters.offset] - Pagination offset
   * @returns {Promise<Array>} Array of transfers
   */
  fetchTransferHistory: async (filters = {}) => {
    set({ loading: true, error: null });

    try {
      console.log('📜 Fetching transfer history...', filters);
      const response = await backendApi.transfers.getHistory(filters);

      console.log('✅ Transfer history fetched:', response.data?.length || 0, 'items');

      // Backend returns: { success: true, data: [...] }
      const transfersData = Array.isArray(response.data) ? response.data : [];

      set({
        transfers: transfersData,
        loading: false,
        lastFetch: new Date(),
      });

      return transfersData;
    } catch (error) {
      console.error('❌ Fetch transfer history error:', error);
      
      // Check if this is an auth error and handle logout
      const authResult = await useStore.getState().handleAuthError(error);
      if (authResult.loggedOut) {
        set({
          error: 'Your session has expired. Please log in again.',
          loading: false
        });
        throw new Error('Authentication expired');
      }
      
      set({
        error: error.message || 'Failed to fetch transfer history',
        loading: false,
      });
      throw error;
    }
  },

  /**
   * Get recent transfers (last N transfers)
   * @param {number} limit - Number of transfers to return
   * @returns {Array} Recent transfers
   */
  getRecentTransfers: (limit = 5) => {
    const { transfers } = get();
    return transfers.slice(0, limit);
  },

  /**
   * Get transfers by type
   * @param {string} fromType - Filter by source account type
   * @param {string} toType - Filter by destination account type
   * @returns {Array} Filtered transfers
   */
  getTransfersByType: (fromType, toType) => {
    const { transfers } = get();
    return transfers.filter(
      transfer =>
        transfer.from_type === fromType && transfer.to_type === toType
    );
  },

  /**
   * Clear error state
   */
  clearError: () => set({ error: null }),

  /**
   * Reset transfer store to initial state
   */
  reset: () => set({
    transfers: [],
    loading: false,
    error: null,
    lastFetch: null,
  }),
}));

export default useTransferStore;
