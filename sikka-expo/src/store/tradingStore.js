import { create } from 'zustand';
import backendApi from '../services/backendApi';
import { useStore } from './useStore';

/**
 * Trading Store
 *
 * Manages trading-related state including:
 * - Buy/sell order execution
 * - Trade history (executed trades)
 * - Profit & Loss tracking
 * - Loading and error states
 */
const useTradingStore = create((set, get) => ({
  // State
  trades: [],
  orders: [], // Recent orders (same as trades, for compatibility)
  pnl: null, // { realized: 0, unrealized: 0, total: 0, ... }
  loading: false,
  error: null,
  lastFetch: null,

  // Actions

  /**
   * Place a buy order
   * @param {string} symbol - Trading symbol (e.g., 'BTC', 'ETH')
   * @param {number} quantity - Quantity to buy
   * @returns {Promise<Object>} Trade execution response
   */
  buyOrder: async (symbol, quantity) => {
    set({ loading: true, error: null });

    try {
      console.log(`📝 Placing BUY order: ${quantity} ${symbol}...`);
      const response = await backendApi.trading.buy(symbol, quantity);

      console.log('✅ Buy order executed:', response);

      set({ loading: false });

      // Refresh trades and P&L after successful trade
      await Promise.all([
        get().fetchTrades(),
        get().fetchPNL(),
      ]);

      return response.data;
    } catch (error) {
      console.error('❌ Buy order error:', error);
      
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
        error: error.message || 'Failed to place buy order',
        loading: false
      });
      throw error;
    }
  },

  /**
   * Place a sell order
   * @param {string} symbol - Trading symbol (e.g., 'BTC', 'ETH')
   * @param {number} quantity - Quantity to sell
   * @returns {Promise<Object>} Trade execution response
   */
  sellOrder: async (symbol, quantity) => {
    set({ loading: true, error: null });

    try {
      console.log(`📝 Placing SELL order: ${quantity} ${symbol}...`);
      const response = await backendApi.trading.sell(symbol, quantity);

      console.log('✅ Sell order executed:', response);

      set({ loading: false });

      // Refresh trades and P&L after successful trade
      await Promise.all([
        get().fetchTrades(),
        get().fetchPNL(),
      ]);

      return response.data;
    } catch (error) {
      console.error('❌ Sell order error:', error);
      
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
        error: error.message || 'Failed to place sell order',
        loading: false
      });
      throw error;
    }
  },

  /**
   * Fetch user's trade history (executed trades)
   * @param {Object} filters - Filter options
   * @param {string} [filters.symbol] - Filter by trading symbol
   * @param {string} [filters.side] - Filter by side (buy/sell)
   * @param {number} [filters.limit] - Number of trades to fetch (default: 50)
   * @param {number} [filters.offset] - Pagination offset
   * @returns {Promise<Array>} Array of trades
   */
  fetchTrades: async (filters = {}) => {
    set({ loading: true, error: null });

    try {
      console.log('📊 Fetching trades...', filters);
      const response = await backendApi.trading.getHistory(filters);

      console.log('✅ Trades fetched:', response.data?.length || 0, 'items');

      // Backend returns: { success: true, data: [...] }
      const tradesData = Array.isArray(response.data) ? response.data : [];

      set({
        trades: tradesData,
        orders: tradesData, // Keep orders in sync with trades
        loading: false,
        lastFetch: new Date(),
      });

      return tradesData;
    } catch (error) {
      console.error('❌ Fetch trades error:', error);
      
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
        error: error.message || 'Failed to fetch trades',
        loading: false
      });
      throw error;
    }
  },

  /**
   * Get specific trade by ID
   * @param {string} tradeId - Trade ID
   * @returns {Promise<Object>} Trade details
   */
  getTradeById: async (tradeId) => {
    set({ loading: true, error: null });

    try {
      console.log('🔍 Fetching trade:', tradeId);
      const response = await backendApi.trading.getById(tradeId);

      console.log('✅ Trade fetched:', response.data);
      set({ loading: false });

      return response.data;
    } catch (error) {
      console.error('❌ Fetch trade error:', error);
      set({
        error: error.message || 'Failed to fetch trade',
        loading: false
      });
      throw error;
    }
  },

  /**
   * Cancel a pending trade order
   * @param {string} tradeId - Trade ID to cancel
   * @returns {Promise<void>}
   */
  cancelTrade: async (tradeId) => {
    set({ loading: true, error: null });

    try {
      console.log('❌ Cancelling trade:', tradeId);
      const response = await backendApi.trading.cancel(tradeId);

      console.log('✅ Trade cancelled:', response);

      set({ loading: false });

      // Refresh trades after cancellation
      await get().fetchTrades();
    } catch (error) {
      console.error('❌ Cancel trade error:', error);
      set({
        error: error.message || 'Failed to cancel trade',
        loading: false
      });
      throw error;
    }
  },

  /**
   * Fetch profit and loss summary
   * @returns {Promise<Object>} P&L data
   */
  fetchPNL: async () => {
    set({ loading: true, error: null });

    try {
      console.log('💰 Fetching P&L...');
      const response = await backendApi.trading.getPNL();

      console.log('✅ P&L fetched:', response.data);

      set({
        pnl: response.data,
        loading: false,
      });

      return response.data;
    } catch (error) {
      console.error('❌ Fetch P&L error:', error);
      
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
        error: error.message || 'Failed to fetch P&L',
        loading: false
      });
      throw error;
    }
  },

  /**
   * Refresh all trading data (trades + P&L)
   * @returns {Promise<void>}
   */
  refreshTrading: async () => {
    try {
      console.log('🔄 Refreshing trading data...');
      await Promise.all([
        get().fetchTrades({ limit: 50 }),
        get().fetchPNL(),
      ]);
      console.log('✅ Trading data refreshed');
    } catch (error) {
      console.error('❌ Refresh trading error:', error);
      // Error already handled in individual functions
    }
  },

  /**
   * Get trades by side (buy/sell)
   * @param {string} side - Side to filter by ('buy' or 'sell')
   * @returns {Array} Filtered trades
   */
  getTradesBySide: (side) => {
    const { trades } = get();
    return trades.filter(trade => trade.side === side);
  },

  /**
   * Get trades by symbol
   * @param {string} symbol - Symbol to filter by (e.g., 'BTC', 'ETH')
   * @returns {Array} Filtered trades
   */
  getTradesBySymbol: (symbol) => {
    const { trades } = get();
    return trades.filter(trade => trade.symbol === symbol);
  },

  /**
   * Get recent trades (last N trades)
   * @param {number} limit - Number of trades to return
   * @returns {Array} Recent trades
   */
  getRecentTrades: (limit = 5) => {
    const { trades } = get();
    return trades.slice(0, limit);
  },

  /**
   * Estimate trading fees for an order
   * @param {string} symbol - Trading symbol (e.g., 'BTCUSDT')
   * @param {string} side - Order side ('buy' or 'sell')
   * @param {number} quantity - Order quantity
   * @returns {Promise<Object>} Fee estimation data
   */
  estimateFees: async (symbol, side, quantity) => {
    set({ loading: true, error: null });

    try {
      console.log(`💰 Estimating fees for ${side} ${quantity} ${symbol}...`);
      const response = await backendApi.trading.estimateFees(symbol, side, quantity);

      console.log('✅ Fee estimation:', response.data);

      set({ loading: false });

      return response.data;
    } catch (error) {
      console.error('❌ Estimate fees error:', error);
      
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
        error: error.message || 'Failed to estimate fees',
        loading: false
      });
      throw error;
    }
  },  /**
   * Fetch orders (alias for fetchTrades for compatibility)
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Array of orders/trades
   */
  fetchOrders: async (filters = {}) => {
    return await get().fetchTrades(filters);
  },

  /**
   * Clear error state
   */
  clearError: () => set({ error: null }),

  /**
   * Reset trading store to initial state
   */
  reset: () => set({
    trades: [],
    orders: [],
    pnl: null,
    loading: false,
    error: null,
    lastFetch: null,
  }),
}));

export default useTradingStore;
