import { create } from 'zustand';
import backendApi from '../services/backendApi';
import { useStore } from './useStore';
import useKYCStore from './kycStore';
import { parseNumeric } from '../utils/walletData';

/**
 * Wallet Store
 *
 * Manages wallet-related state including:
 * - User balances (USD, USDT, crypto assets) in MAIN and TRADE accounts
 * - Crypto holdings with current market values
 * - Deposit history
 * - Loading and error states
 *
 * Key Issues Fixed:
 * 1. Data synchronization between balance and holdings APIs
 * 2. Proper P&L calculation from holdings API
 * 3. Better error handling and loading states
 * 4. Standardized data transformation
 * 5. All values now in USD (no INR conversion)
 */

/**
 * Helper function to handle API errors and trigger logout on auth expiration
 * @param {Error} error - The error from API call
 */
const handleApiError = (error) => {
  if (error.code === 'AUTH_EXPIRED' || error.status === 401) {
    console.warn('🚨 Auth expired detected in walletStore, triggering logout...');
    // Trigger logout by calling the store's logout method
    // We need to get the store instance, but since this is a helper function,
    // we'll throw the error and let the calling function handle it
    throw error;
  }
  throw error;
};
const useWalletStore = create((set, get) => ({
  // State
  balance: null, // { main: {...}, trade: {...} }
  holdings: [], // Array of holdings with market values
  deposits: [],
  transactions: [],
  loading: false,
  balanceLoading: false,
  holdingsLoading: false,
  transactionsLoading: false,
  hasFetchedBalance: false,
  hasFetchedHoldings: false,
  hasFetchedTransactions: false,
  error: null,
  errorCode: null, // Error code for KYC-related errors
  transactionsError: null,
  lastFetch: null,

  // Actions

  /**
   * Fetch user's wallet balance from backend
   * Retrieves both MAIN and TRADE account balances
   * @returns {Promise<Object>} Balance object with main and trade accounts
   */
  fetchBalance: async () => {
    set({ loading: true, balanceLoading: true, error: null });

    try {
      console.log('📊 Fetching wallet balance...');
      const response = await backendApi.balance.get();

      console.log('✅ Balance fetched:', response);

      // Backend returns: { success: true, data: { main: {...}, trade: {...}, totalValueUSD, balances } }
      const balanceData = response.data || { main: { balances: [], totalValueUSD: 0 }, trade: { balances: [], totalValueUSD: 0 } };

      // Ensure backward compatibility - if no main/trade structure, use legacy format
      const normalizedBalance = {
        main: balanceData.main || { balances: [], totalValueUSD: 0 },
        trade: balanceData.trade || { balances: [], totalValueUSD: 0 },
        // Legacy fields for backward compatibility
        balances: balanceData.balances || balanceData.trade?.balances || [],
        totalValueUSD: balanceData.totalValueUSD || balanceData.trade?.totalValueUSD || 0,
        portfolioValueUSD: balanceData.portfolioValueUSD || 0,
        // Locked and available balance for withdrawal tracking
        locked: balanceData.locked || { usdt: 0, usd: 0 },
        available: balanceData.available || { usdt: 0, usd: 0 }
      };

      set({
        balance: normalizedBalance,
        loading: false,
        balanceLoading: false,
        hasFetchedBalance: true,
        lastFetch: new Date(),
      });

      return normalizedBalance;
    } catch (error) {
      console.error('❌ Fetch balance error:', error);

      // Better error message for KYC blocked calls
      let errorMessage = error.message || 'Failed to fetch balance';
      let errorCode = error.code;

      // Detect KYC-related errors
      if (error.code === 'KYC_NOT_APPROVED' ||
          error.code === 'KYC_NOT_SUBMITTED' ||
          error.message?.includes('KYC') ||
          error.status === 403) {
        errorMessage = 'KYC_REQUIRED';
        errorCode = 'KYC_REQUIRED';
        console.log('🔒 Balance blocked: KYC not approved');

        // NEW: Check if KYC is actually approved (backend data inconsistency)
        const kycStore = useKYCStore.getState();
        const isKYCApproved = kycStore.kycStatus?.status === 'approved';

        if (isKYCApproved) {
          console.warn('⚠️ Wallet API returned KYC_REQUIRED but KYC is approved - retrying in 2s');

          // Retry after short delay (gives backend time to sync)
          await new Promise(resolve => setTimeout(resolve, 2000));

          try {
            console.log('🔄 Retrying balance fetch after KYC approval...');
            const retryResponse = await backendApi.balance.get();

            const retryBalanceData = retryResponse.data || { main: { balances: [], totalValueUSD: 0 }, trade: { balances: [], totalValueUSD: 0 } };
            const retryNormalizedBalance = {
              main: retryBalanceData.main || { balances: [], totalValueUSD: 0 },
              trade: retryBalanceData.trade || { balances: [], totalValueUSD: 0 },
              balances: retryBalanceData.balances || retryBalanceData.trade?.balances || [],
              totalValueUSD: retryBalanceData.totalValueUSD || retryBalanceData.trade?.totalValueUSD || 0,
              portfolioValueUSD: retryBalanceData.portfolioValueUSD || 0,
              locked: retryBalanceData.locked || { usdt: 0, usd: 0 },
              available: retryBalanceData.available || { usdt: 0, usd: 0 }
            };

            set({
              balance: retryNormalizedBalance,
              loading: false,
              balanceLoading: false,
              hasFetchedBalance: true,
              lastFetch: new Date(),
              error: null,
              errorCode: null
            });

            console.log('✅ Retry successful! Balance loaded after KYC approval');
            return retryNormalizedBalance;
          } catch (retryError) {
            console.error('❌ Retry failed:', retryError);
            // Continue to normal error handling with friendly message
            errorMessage = 'Your KYC is approved but wallet is still initializing. Please refresh in a moment.';
            errorCode = 'KYC_APPROVED_WALLET_PENDING';
          }
        }
      }

      // Check if this is an auth error and handle logout
      const authResult = await useStore.getState().handleAuthError(error);
      if (authResult.loggedOut) {
        set({
          error: 'Authentication expired',
          errorCode: 'AUTH_EXPIRED',
          loading: false,
          balanceLoading: false,
          hasFetchedBalance: true,
        });
        throw new Error('Authentication expired');
      }

      set({
        error: errorMessage,
        errorCode: errorCode,
        loading: false,
        balanceLoading: false,
        hasFetchedBalance: true,
      });
      throw error;
    }
  },

  /**
   * Fetch user's crypto holdings with current market values
   * @returns {Promise<Array>} Array of holdings with market prices
   */
  fetchHoldings: async () => {
   set({ loading: true, holdingsLoading: true, error: null });

     try {
       console.log('📊 Fetching holdings...');
       const response = await backendApi.balance.getHoldings();

       console.log('✅ Holdings fetched:', response);

       // Backend returns: { success: true, data: { holdings: [...], totalInvestedUSD, totalCurrentValueUSD, totalPnlUSD, totalPnlPercentage } }
       const holdingsData = response.data?.holdings || [];
       const totalInvestedUSD = response.data?.totalInvestedUSD || 0;
       const totalCurrentValueUSD = response.data?.totalCurrentValueUSD || 0;
       const totalPnlUSD = response.data?.totalPnlUSD || 0;
       const totalPnlPercentage = response.data?.totalPnlPercentage || 0;

       // Store holdings with enhanced P&L data
       const enhancedHoldings = holdingsData.map(holding => ({
         ...holding,
         // Ensure all numeric fields are properly parsed
         quantity: parseNumeric(holding.quantity, 0),
         currentValueUSD: parseNumeric(holding.currentValueUSD, 0),
         pnlUSD: parseNumeric(holding.pnlUSD, 0),
         pnlPercentage: parseNumeric(holding.pnlPercentage, 0),
         avgBuyPrice: parseNumeric(holding.avgBuyPrice, 0),
         currentPrice: parseNumeric(holding.currentPrice, 0),
       }));

       set({
         holdings: enhancedHoldings,
         loading: false,
         holdingsLoading: false,
         hasFetchedHoldings: true,
       });

       return {
         holdings: enhancedHoldings,
         summary: {
           totalInvestedUSD,
           totalCurrentValueUSD,
           totalPnlUSD,
           totalPnlPercentage,
         }
       };
     } catch (error) {
       console.error('❌ Fetch holdings error:', error);

       // Better error message for KYC blocked calls
       let errorMessage = error.message || 'Failed to fetch holdings';
       let errorCode = error.code;

       // Detect KYC-related errors
       if (error.code === 'KYC_NOT_APPROVED' ||
           error.code === 'KYC_NOT_SUBMITTED' ||
           error.message?.includes('KYC') ||
           error.status === 403) {
         errorMessage = 'KYC_REQUIRED';
         errorCode = 'KYC_REQUIRED';
         console.log('🔒 Holdings blocked: KYC not approved');
       }

       // Check if this is an auth error and handle logout
       const authResult = await useStore.getState().handleAuthError(error);
       if (authResult.loggedOut) {
         set({
           error: 'Your session has expired. Please log in again.',
           errorCode: 'AUTH_EXPIRED',
           loading: false,
           holdingsLoading: false,
           hasFetchedHoldings: true,
         });
         throw new Error('Authentication expired');
       }

       set({
         error: errorMessage,
         errorCode: errorCode,
         loading: false,
         holdingsLoading: false,
         hasFetchedHoldings: true,
       });
       throw error;
     }
   },

  /**
   * Create a deposit order and get payment URL
   * @param {number} amount - Amount to deposit in USD
   * @returns {Promise<Object>} Payment details with payment_session_id for Cashfree WebView
   */
  createDeposit: async (amount) => {
    set({ loading: true, error: null });

    try {
      console.log(`💰 Creating deposit order for $${amount}...`);
      const response = await backendApi.deposits.initiate(amount);

      console.log('✅ Deposit order created:', response);

      set({ loading: false });

      // Backend returns: { success: true, data: { payment_session_id, order_id, ... } }
      return response.data;
    } catch (error) {
      console.error('❌ Create deposit error:', error);

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
        error: error.message || 'Failed to create deposit',
        loading: false
      });
      throw error;
    }
  },

  /**
   * Create a manual bank transfer deposit
   * @param {number} amount - Amount deposited in USD
   * @param {string} utrNumber - UTR/Reference number from bank transfer
   * @returns {Promise<Object>} Manual deposit details
   */
  createManualDeposit: async (amount, utrNumber) => {
    set({ loading: true, error: null });

    try {
      console.log(`💰 Creating manual deposit for $${amount} with UTR: ${utrNumber}...`);
      const response = await backendApi.deposits.createManual(amount, utrNumber);

      console.log('✅ Manual deposit created:', response);

      set({ loading: false });

      // Backend returns: { success: true, data: { depositId, orderId, status, bankDetails, ... } }
      return response.data;
    } catch (error) {
      console.error('❌ Create manual deposit error:', error);

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
        error: error.message || 'Failed to create manual deposit',
        loading: false
      });
      throw error;
    }
  },

  /**
   * Fetch deposit history
   * @param {Object} filters - Filter options { status, limit, offset }
   * @returns {Promise<Array>} Array of deposits
   */
  fetchDepositHistory: async (filters = {}) => {
    set({ loading: true, error: null });

    try {
      console.log('📜 Fetching deposit history...', filters);
      const response = await backendApi.deposits.getHistory(filters);

      console.log('✅ Deposit history fetched:', response.data?.length || 0, 'items');

      // Backend returns: { success: true, data: [...] }
      const depositsData = Array.isArray(response.data) ? response.data : [];

      set({
        deposits: depositsData,
        loading: false,
      });

      return depositsData;
    } catch (error) {
      console.error('❌ Fetch deposit history error:', error);
      
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
        error: error.message || 'Failed to fetch deposit history',
        loading: false
      });
      throw error;
    }
  },

  /**
   * Refresh balance, holdings, deposits, and transfers
   * Ensures data synchronization between APIs
   * @returns {Promise<void>}
   */
  refreshWallet: async () => {
    try {
      console.log('🔄 Refreshing wallet data...');

      // Fetch all data in parallel for better performance
      const [balanceResult, holdingsResult] = await Promise.allSettled([
        get().fetchBalance(),
        get().fetchHoldings(),
      ]);

      // Handle balance fetch result
      if (balanceResult.status === 'rejected') {
        console.warn('⚠️ Balance fetch failed:', balanceResult.reason);
      } else {
        console.log('✅ Balance refreshed');
      }

      // Handle holdings fetch result
      if (holdingsResult.status === 'rejected') {
        console.warn('⚠️ Holdings fetch failed:', holdingsResult.reason);
      } else {
        console.log('✅ Holdings refreshed');
      }

      // Fetch transaction data (less critical, can fail silently)
      try {
        await Promise.all([
          get().fetchDepositHistory({ limit: 50 }),
          get().fetchTransferHistory({ limit: 50 }),
          get().fetchTransactions({ limit: 100 }),
        ]);
        console.log('✅ Transaction data refreshed');
      } catch (txError) {
        console.warn('⚠️ Transaction data fetch failed:', txError);
      }

      console.log('✅ Wallet data refresh completed');
    } catch (error) {
      console.error('❌ Refresh wallet error:', error);
      // Error already handled in individual functions
    }
  },

  /**
   * Fetch unified wallet transactions (deposits, withdrawals, trades)
   * @param {Object} filters - Filter options { limit }
   * @returns {Promise<Array>} Array of normalized transactions
   */
  fetchTransactions: async (filters = {}) => {
    set({ transactionsLoading: true, transactionsError: null });

    const mapStatus = (status) => {
      if (!status) return 'pending';
      const normalized = String(status).toLowerCase();

      if (['success', 'completed', 'filled', 'approved'].includes(normalized)) {
        return 'completed';
      }

      if (['failed', 'rejected', 'cancelled', 'error'].includes(normalized)) {
        return 'failed';
      }

      return 'pending';
    };

    const resolveTimestamp = (...timestamps) => {
      for (const value of timestamps) {
        if (!value) {
          continue;
        }

        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) {
          return date.toISOString();
        }
      }
      return new Date().toISOString();
    };

    const toArray = (response) => {
      if (!response) return [];
      if (Array.isArray(response)) return response;
      if (Array.isArray(response.data)) return response.data;
      if (Array.isArray(response.results)) return response.results;
      return [];
    };

    try {
      const limit = filters.limit ?? 100;

      // Fetch data from all sources
      const [depositResponse, withdrawalResponse, tradeResponse, p2pResponse] = await Promise.all([
        backendApi.deposits.getHistory(filters).catch(err => {
          console.warn('Failed to fetch deposits:', err);
          return { data: [] };
        }),
        backendApi.withdrawals.getHistory(filters).catch(err => {
          console.warn('Failed to fetch withdrawals:', err);
          return { data: [] };
        }),
        backendApi.trading.getHistory({ limit }).catch(err => {
          console.warn('Failed to fetch trades:', err);
          return { data: [] };
        }),
        backendApi.p2p.getHistory({ limit }).catch(err => {
          console.warn('Failed to fetch P2P transfers:', err);
          return { data: { transfers: [] } };
        }),
      ]);

      const depositTransactions = toArray(depositResponse).map((deposit) => {
        const amountUSD = parseNumeric(deposit.estimated_usdt, 0);
        const date = resolveTimestamp(
          deposit.completed_at,
          deposit.paid_at,
          deposit.requested_at,
        );

        return {
          id: `deposit-${deposit.id}`,
          sourceId: deposit.id,
          type: 'deposit',
          status: mapStatus(deposit.status),
          total: amountUSD,
          amount: amountUSD,
          crypto: 'USD',
          currency: 'USD',
          paymentMethod: deposit.cashfree_order_id ? 'cashfree' : 'bank',
          date,
          createdAt: deposit.requested_at || date,
          updatedAt: resolveTimestamp(deposit.completed_at, deposit.paid_at, deposit.updated_at, date),
          metadata: {
            cashfreeOrderId: deposit.cashfree_order_id,
            cashfreePaymentId: deposit.cashfree_payment_id,
          },
        };
      });

      const withdrawalTransactions = toArray(withdrawalResponse).map((withdrawal) => {
        const amountUSD = parseNumeric(withdrawal.amount_usdt, 0);
        const date = resolveTimestamp(
          withdrawal.completed_at,
          withdrawal.approved_at,
          withdrawal.requested_at,
        );

        return {
          id: `withdrawal-${withdrawal.id}`,
          sourceId: withdrawal.id,
          type: 'withdrawal',
          status: mapStatus(withdrawal.status),
          total: amountUSD,
          amount: amountUSD,
          crypto: 'USD',
          currency: 'USD',
          bankAccount: withdrawal.bank_account_id,
          date,
          createdAt: withdrawal.requested_at || date,
          updatedAt: resolveTimestamp(withdrawal.completed_at, withdrawal.updated_at, date),
          metadata: {
            bank: {
              name: withdrawal.bank_name,
              accountNumber: withdrawal.account_number,
              ifsc: withdrawal.ifsc_code,
              holder: withdrawal.account_holder_name,
            },
          },
        };
      });

      const tradeTransactions = toArray(tradeResponse).map((trade) => {
        const amountUSD = parseNumeric(trade.amount_usdt, 0);
        const quantity = parseNumeric(trade.quantity, 0);
        const priceUSD = parseNumeric(trade.price_usdt, 0);
        const date = resolveTimestamp(trade.filled_at, trade.created_at);

        return {
          id: `trade-${trade.id}`,
          sourceId: trade.id,
          type: trade.side === 'sell' ? 'sell' : 'buy',
          status: mapStatus(trade.status),
          total: amountUSD,
          amount: quantity,
          crypto: trade.token_symbol,
          currency: 'USD',
          price: priceUSD,
          side: trade.side,
          date,
          createdAt: trade.created_at || date,
          updatedAt: resolveTimestamp(trade.filled_at, trade.updated_at, date),
          metadata: {
            orderType: trade.order_type,
            platformFeeUSD: parseNumeric(trade.platform_fee_usdt, 0),
            kucoinOrderId: trade.kucoin_order_id,
          },
        };
      });

      // P2P Transfers
      const p2pTransfers = (p2pResponse?.data?.transfers || []).map((transfer) => {
        const amount = parseNumeric(transfer.amount, 0);
        const date = resolveTimestamp(transfer.completed_at, transfer.created_at);

        return {
          id: `p2p-${transfer.id}`,
          sourceId: transfer.id,
          type: transfer.direction, // 'sent' or 'received'
          status: mapStatus(transfer.status),
          total: amount,
          amount: amount,
          crypto: transfer.currency,
          currency: transfer.currency,
          date,
          createdAt: transfer.created_at || date,
          updatedAt: resolveTimestamp(transfer.completed_at, date),
          metadata: {
            counterparty: transfer.counterparty?.name || 'Sikka User',
            counterpartyEmail: transfer.counterparty?.email,
            note: transfer.note,
            direction: transfer.direction,
          },
        };
      });

      const combinedTransactions = [
        ...depositTransactions,
        ...withdrawalTransactions,
        ...tradeTransactions,
        ...p2pTransfers,
      ].sort((a, b) => new Date(b.date) - new Date(a.date));

      set({
        transactions: combinedTransactions,
        transactionsLoading: false,
        hasFetchedTransactions: true,
        transactionsError: null,
      });

      return combinedTransactions;
    } catch (error) {
      console.error('❌ Fetch transactions error:', error);

      // Auth handling
      const authResult = await useStore.getState().handleAuthError(error);
      if (authResult.loggedOut) {
        set({
          transactionsError: 'Your session has expired. Please log in again.',
          transactionsLoading: false,
          hasFetchedTransactions: true,
        });
        throw new Error('Authentication expired');
      }

      set({
        transactionsError: error.message || 'Failed to fetch transactions',
        transactionsLoading: false,
        hasFetchedTransactions: true,
      });
      throw error;
    }
  },

  /**
   * Clear error state
   */
  clearError: () => set({ error: null }),

  /**
   * Transfer funds between MAIN and TRADE accounts
   * @param {string} fromType - Source account type ('MAIN' or 'TRADE')
   * @param {string} toType - Destination account type ('MAIN' or 'TRADE')
   * @param {string} currency - Currency to transfer (e.g., 'USDT')
   * @param {number} amount - Amount to transfer
   * @returns {Promise<Object>} Transfer response with transfer_id
   */
  createInnerAccountTransfer: async (fromType, toType, currency, amount) => {
    set({ loading: true, error: null });

    try {
      console.log(`💱 Transferring ${amount} ${currency} from ${fromType} to ${toType}...`);
      const response = await backendApi.transfers.innerAccount(fromType, toType, currency, amount);

      console.log('✅ Inner account transfer created:', response);

      // Refresh balance after successful transfer
      await get().fetchBalance();

      set({ loading: false });

      return response.data;
    } catch (error) {
      console.error('❌ Create inner account transfer error:', error);
      
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
        error: error.message || 'Failed to create transfer',
        loading: false
      });
      throw error;
    }
  },

  /**
   * Fetch transfer history
   * @param {Object} filters - Filter options { limit, offset }
   * @returns {Promise<Array>} Array of transfers
   */
  fetchTransferHistory: async (filters = {}) => {
    set({ loading: true, error: null });

    try {
      console.log('📜 Fetching transfer history...', filters);
      const response = await backendApi.transfers.getHistory(filters);

      console.log('✅ Transfer history fetched:', response.data?.length || 0, 'items');

      set({
        loading: false,
      });

      // Return transfer history data
      return response.data;
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
        loading: false
      });
      throw error;
    }
  },

  /**
   * Get balance for a specific currency from account balances array
   * @param {string} currency - Currency symbol (e.g., 'USDT', 'BTC')
   * @param {string} accountType - Account type ('main' or 'trade')
   * @returns {number} Available balance for the currency
   */
  getCurrencyBalance: (currency, accountType = 'trade') => {
    const state = get();
    const account = state.balance?.[accountType];

    if (!account?.balances || !Array.isArray(account.balances)) {
      return 0;
    }

    const item = account.balances.find(b => b.currency === currency);
    return parseFloat(item?.available || item?.balance || 0);
  },

  /**
   * Get total USD value for an account
   * @param {string} accountType - Account type ('main' or 'trade')
   * @returns {number} Total value in USD
   */
  getTotalUSDValue: (accountType = 'trade') => {
    const state = get();
    return parseFloat(state.balance?.[accountType]?.totalValueUSD || 0);
  },

  /**
   * Reset wallet store to initial state
   */
  reset: () => set({
    balance: null,
    holdings: [],
    deposits: [],
    transactions: [],
    loading: false,
    balanceLoading: false,
    holdingsLoading: false,
    transactionsLoading: false,
    hasFetchedBalance: false,
    hasFetchedHoldings: false,
    hasFetchedTransactions: false,
    error: null,
    transactionsError: null,
    lastFetch: null,
  }),
}));

export default useWalletStore;
