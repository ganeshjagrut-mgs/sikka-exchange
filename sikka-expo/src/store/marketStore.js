import { create } from 'zustand';
import backendApi from '../services/backendApi';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Get WebSocket URL based on environment
 */
const getWebSocketUrl = () => {
  const envWsUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_WS_URL ||
                   process.env.EXPO_PUBLIC_WS_URL;

  if (envWsUrl) {
    console.log('🔌 Using WebSocket URL from environment:', envWsUrl);
    return envWsUrl;
  }

  // Fallback to platform-specific defaults
  if (__DEV__) {
    if (Platform.OS === 'web') {
      return 'ws://localhost:3000/ws';
    } else {
      // For mobile, use the ngrok URL or network IP
      return 'wss://up-serval-awaited.ngrok-free.app/ws';
    }
  } else {
    // Production
    return 'wss://api.sikka.exchange/ws';
  }
};

/**
 * Market Store
 *
 * Manages real-time market data including:
 * - Live crypto prices from KuCoin WebSocket
 * - Ticker updates (price, bid/ask, volume)
 * - WebSocket connection state
 * - Historical price data (for charts)
 */
const useMarketStore = create((set, get) => ({
  // State
  tickers: new Map(), // Map<symbol, tickerData>
  loading: false,
  error: null,
  wsConnected: false,
  ws: null,
  reconnectAttempts: 0,
  maxReconnectAttempts: 5,

  // Supported trading pairs - all 19 active tokens
  supportedPairs: [
    'BTC-USDT', 'ETH-USDT', 'SOL-USDT', 'USDT-USDT', 'USDC-USDT',
    'BNB-USDT', 'XRP-USDT', 'ADA-USDT', 'DOGE-USDT', 'TRX-USDT',
    'DOT-USDT', 'AVAX-USDT', 'LINK-USDT', 'UNI-USDT', 'ATOM-USDT',
    'LTC-USDT', 'NEAR-USDT', 'APT-USDT', 'ARB-USDT'
  ],

  // Actions

  /**
   * Fetch token prices from REST API
   * @param {string[]} symbols - Optional array of symbols to fetch (defaults to all)
   * @returns {Promise<Object>} Price data
   */
  fetchPrices: async (symbols = []) => {
    set({ loading: true, error: null });

    try {
      console.log('📊 Fetching token prices...');
      const response = await backendApi.market.getPrices(symbols);

      console.log('✅ Prices fetched:', response.data);

      // Backend returns: { success: true, data: { BTC: {...}, ETH: {...}, ... } }
      const pricesData = response.data || {};

      // Convert to Map for efficient lookups
      const tickersMap = new Map();
      Object.entries(pricesData).forEach(([symbol, priceInfo]) => {
        tickersMap.set(symbol, {
          symbol,
          price: priceInfo.price_usd || priceInfo.price_usdt,
          lastUpdate: Date.now(),
        });
      });

      set({
        tickers: tickersMap,
        loading: false,
      });

      return pricesData;
    } catch (error) {
      console.error('❌ Fetch prices error:', error);
      set({
        error: error.message || 'Failed to fetch market data',
        loading: false
      });
      throw error;
    }
  },

  /**
   * Fetch single token price
   * @param {string} symbol - Token symbol (e.g., 'BTC', 'ETH')
   * @returns {Promise<Object>} Price data
   */
  fetchPrice: async (symbol) => {
    set({ loading: true, error: null });

    try {
      console.log(`📊 Fetching ${symbol} price...`);
      const response = await backendApi.market.getPrice(symbol);

      console.log('✅ Price fetched:', response.data);

      // Backend returns: { success: true, data: { symbol, price, ... } }
      const priceData = response.data;

      // Update ticker in Map
      const { tickers } = get();
      const newTickers = new Map(tickers);
      newTickers.set(symbol, {
        symbol: priceData.symbol,
        price: priceData.price,
        lastUpdate: Date.now(),
      });

      set({
        tickers: newTickers,
        loading: false,
      });

      return priceData;
    } catch (error) {
      console.error('❌ Fetch price error:', error);
      set({
        error: error.message || 'Failed to fetch price',
        loading: false
      });
      throw error;
    }
  },

  /**
   * Fetch available tokens for trading
   * @returns {Promise<Array>} Available tokens list
   */
  fetchAvailableTokens: async () => {
    set({ loading: true, error: null });

    try {
      console.log('📊 Fetching available tokens...');
      const response = await backendApi.market.getAvailableTokens();

      console.log('✅ Available tokens fetched:', response.data);

      set({ loading: false });

      // Backend returns: { success: true, data: [...] }
      return response.data;
    } catch (error) {
      console.error('❌ Fetch available tokens error:', error);
      set({
        error: error.message || 'Failed to fetch available tokens',
        loading: false
      });
      throw error;
    }
  },

  /**
   * Connect to WebSocket for real-time updates
   */
  connectWebSocket: () => {
    const { ws, wsConnected } = get();

    // Don't reconnect if already connected
    if (ws && wsConnected) {
      console.log('🔌 WebSocket already connected');
      return;
    }

    try {
      const wsUrl = getWebSocketUrl();
      console.log('🔌 Connecting to WebSocket:', wsUrl);

      const websocket = new WebSocket(wsUrl);

      websocket.onopen = () => {
        console.log('✅ WebSocket connected');
        set({
          ws: websocket,
          wsConnected: true,
          reconnectAttempts: 0,
          error: null,
        });

        // Subscribe to all supported pairs
        get().supportedPairs.forEach(symbol => {
          websocket.send(JSON.stringify({
            type: 'subscribe',
            symbol: symbol,
          }));
          console.log('📡 Subscribed to:', symbol);
        });

        // Request all tickers
        websocket.send(JSON.stringify({
          type: 'get_all_tickers',
        }));
      };

      websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          switch (message.type) {
            case 'welcome':
              console.log('👋 WebSocket welcome:', message.clientId);
              break;

            case 'ticker_update':
              get().handleTickerUpdate(message.symbol, message.data);
              break;

            case 'all_tickers_response':
              get().handleAllTickers(message.data);
              break;

            case 'error':
              console.error('❌ WebSocket error message:', message.message);
              break;

            default:
              console.log('📨 Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('❌ WebSocket message parse error:', error);
        }
      };

      websocket.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        set({
          error: 'WebSocket connection error',
          wsConnected: false,
        });
      };

      websocket.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        set({
          ws: null,
          wsConnected: false,
        });

        // Auto-reconnect with exponential backoff
        const { reconnectAttempts, maxReconnectAttempts } = get();
        if (reconnectAttempts < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})...`);

          setTimeout(() => {
            set({ reconnectAttempts: reconnectAttempts + 1 });
            get().connectWebSocket();
          }, delay);
        } else {
          console.error('❌ Max reconnection attempts reached');
          set({
            error: 'Failed to maintain WebSocket connection',
          });
        }
      };

      set({ ws: websocket });
    } catch (error) {
      console.error('❌ WebSocket connection error:', error);
      set({
        error: error.message || 'Failed to connect to WebSocket',
        wsConnected: false,
      });
    }
  },

  /**
   * Disconnect WebSocket
   */
  disconnectWebSocket: () => {
    const { ws } = get();
    if (ws) {
      console.log('🔌 Disconnecting WebSocket...');
      ws.close();
      set({
        ws: null,
        wsConnected: false,
        reconnectAttempts: 0,
      });
    }
  },

  /**
   * Handle individual ticker update from WebSocket
   * @param {string} symbol - Trading pair symbol
   * @param {Object} data - Ticker data
   */
  handleTickerUpdate: (symbol, data) => {
    const { tickers } = get();
    const newTickers = new Map(tickers);

    newTickers.set(symbol, {
      symbol,
      price: data.price,
      bestAsk: data.bestAsk,
      bestBid: data.bestBid,
      lastUpdate: data.timestamp || Date.now(),
      // Keep previous data if available
      ...tickers.get(symbol),
      // Overwrite with new data
      ...data,
    });

    set({ tickers: newTickers });
  },

  /**
   * Handle all tickers response from WebSocket
   * @param {Array} tickersArray - Array of ticker data
   */
  handleAllTickers: (tickersArray) => {
    if (!Array.isArray(tickersArray)) return;

    const newTickers = new Map();
    tickersArray.forEach(ticker => {
      newTickers.set(ticker.symbol, ticker);
    });

    console.log('📊 Received all tickers:', newTickers.size, 'items');
    set({ tickers: newTickers });
  },

  /**
   * Get ticker data for a specific symbol
   * @param {string} symbol - Trading pair symbol
   * @returns {Object|null} Ticker data or null
   */
  getTicker: (symbol) => {
    const { tickers } = get();
    return tickers.get(symbol) || null;
  },

  /**
   * Get all tickers as array
   * @returns {Array} Array of ticker data
   */
  getAllTickers: () => {
    const { tickers } = get();
    return Array.from(tickers.values());
  },

  /**
   * Subscribe to a specific trading pair
   * @param {string} symbol - Trading pair symbol
   */
  subscribe: (symbol) => {
    const { ws, wsConnected } = get();
    if (ws && wsConnected) {
      ws.send(JSON.stringify({
        type: 'subscribe',
        symbol: symbol,
      }));
      console.log('📡 Subscribed to:', symbol);
    }
  },

  /**
   * Unsubscribe from a trading pair
   * @param {string} symbol - Trading pair symbol
   */
  unsubscribe: (symbol) => {
    const { ws, wsConnected } = get();
    if (ws && wsConnected) {
      ws.send(JSON.stringify({
        type: 'unsubscribe',
        symbol: symbol,
      }));
      console.log('📡 Unsubscribed from:', symbol);
    }
  },

  /**
   * Initialize market store (fetch initial data + connect WebSocket)
   */
  initialize: async () => {
    console.log('🚀 Initializing market store...');

    try {
      // Fetch initial price data
      await get().fetchPrices();

      // Connect to WebSocket for real-time updates (optional)
      // get().connectWebSocket();

      console.log('✅ Market store initialized');
    } catch (error) {
      console.error('❌ Market store initialization error:', error);
    }
  },

  /**
   * Clear error state
   */
  clearError: () => set({ error: null }),

  /**
   * Reset market store to initial state
   */
  reset: () => {
    get().disconnectWebSocket();
    set({
      tickers: new Map(),
      loading: false,
      error: null,
      wsConnected: false,
      ws: null,
      reconnectAttempts: 0,
    });
  },
}));

export default useMarketStore;
