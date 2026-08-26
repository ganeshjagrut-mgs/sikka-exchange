const express = require('express');
const router = express.Router();
const dbService = require('../services/db.service');
const kucoin = require('../services/kucoin.service');
const { verifyFirebaseToken, requireAuth, requireKYC } = require('../middleware/auth');

/**
 * GET /api/tokens/prices
 * Get current market prices for all supported tokens (PUBLIC endpoint - no auth required)
 * Prices are in USD (USDT = USD for display)
 *
 * Returns: { success: true, data: { BTC: {...}, ETH: {...}, SOL: {...} }, updated_at: "..." }
 */
router.get('/prices', async (req, res) => {
  try {
    // Fetch all active tokens from database
    const tokens = await dbService.queryMany(
      'SELECT symbol, kucoin_symbol FROM tokens WHERE is_active = true ORDER BY display_order',
      []
    );

    // Fetch prices from KuCoin for all tokens
    const pricesData = {};

    for (const token of tokens) {
      const symbol = token.symbol;
      try {
        let priceUsd = null;

        // USDT and USDC are stablecoins always worth 1.0 USD
        if (symbol === 'USDT' || symbol === 'USDC') {
          priceUsd = 1.0;
        } else {
          // Fetch from KuCoin API using kucoin_symbol from database
          const priceResponse = await kucoin.getMarketPrice(token.kucoin_symbol);

          if (priceResponse.code === '200000' && priceResponse.data) {
            priceUsd = parseFloat(priceResponse.data.last || priceResponse.data.price);
          }
        }

        pricesData[symbol] = {
          symbol: symbol,
          price_usd: priceUsd,
          price_usdt: priceUsd  // Alias for backward compatibility
        };
      } catch (error) {
        console.error(`Error fetching price for ${symbol}:`, error.message);
        pricesData[symbol] = {
          symbol: symbol,
          price_usd: null,
          price_usdt: null
        };
      }
    }

    return res.status(200).json({
      success: true,
      data: pricesData,
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Tokens prices error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tokens/rates/inr-usdt
 * DEPRECATED: INR conversion no longer used. Returns 1:1 rate for backward compatibility.
 *
 * Returns: { success: true, data: { rate: 1, source: "deprecated", timestamp: "..." } }
 */
router.get('/rates/inr-usdt', async (req, res) => {
  try {
    // Return 1:1 rate since INR conversion is no longer used
    return res.status(200).json({
      success: true,
      data: {
        rate: 1,
        source: 'deprecated',
        message: 'INR conversion deprecated. All values are now in USD.',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Exchange rate fetch error:', error);
    return res.status(500).json({
      success: false,
      error: 'FETCH_RATE_FAILED',
      message: error.message
    });
  }
});

/**
 * GET /api/tokens/available
 * Get all available tokens with current market prices
 *
 * Headers: Authorization: Bearer <firebase_token>
 * Returns: Array of tokens with current prices
 */
router.get('/available', verifyFirebaseToken, requireAuth, requireKYC, async (req, res) => {
  try {
    // Fetch all tokens from database
    const tokens = await dbService.queryMany(
      'SELECT id, symbol, name, kucoin_symbol, icon_url as logo_url, quote_min_size, quote_max_size FROM tokens WHERE is_active = true ORDER BY display_order',
      []
    );

    // Fetch current price for each token from KuCoin
    const tokensWithPrices = await Promise.all(
      tokens.map(async (token) => {
        try {
          // Get market price from KuCoin using kucoin_symbol from database
          const priceResponse = await kucoin.getMarketPrice(token.kucoin_symbol);

          // Check if KuCoin API returned success
          if (priceResponse.code === '200000' && priceResponse.data) {
            return {
              id: token.id,
              symbol: token.symbol,
              name: token.name,
              logo_url: token.logo_url,
              quote_min_size: token.quote_min_size,
              quote_max_size: token.quote_max_size,
              current_price: priceResponse.data.last // Use 'last' field from KuCoin API
            };
          } else {
            // If price fetch failed, return token without price
            console.error(`Failed to fetch price for ${token.symbol}:`, priceResponse.msg);
            return {
              id: token.id,
              symbol: token.symbol,
              name: token.name,
              logo_url: token.logo_url,
              quote_min_size: token.quote_min_size,
              quote_max_size: token.quote_max_size,
              current_price: null
            };
          }
        } catch (error) {
          console.error(`Error fetching price for ${token.symbol}:`, error);
          return {
            id: token.id,
            symbol: token.symbol,
            name: token.name,
            logo_url: token.logo_url,
            quote_min_size: token.quote_min_size,
            quote_max_size: token.quote_max_size,
            current_price: null
          };
        }
      })
    );

    return res.status(200).json({
      success: true,
      data: tokensWithPrices
    });
  } catch (error) {
    console.error('Tokens available error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tokens/:symbol/price
 * Get current market price for a specific token
 *
 * Params: symbol (e.g., "BTC", "ETH", "SOL", "MATIC")
 * Headers: Authorization: Bearer <firebase_token>
 * Returns: { symbol, price, timestamp }
 */
router.get('/:symbol/price', verifyFirebaseToken, requireAuth, requireKYC, async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();

    // Get token from database to get kucoin_symbol
    const token = await dbService.findOne('tokens', { symbol, is_active: true });

    if (!token) {
      return res.status(404).json({
        success: false,
        error: 'Token not found or not active'
      });
    }

    // Get market price from KuCoin using kucoin_symbol from database
    const priceResponse = await kucoin.getMarketPrice(token.kucoin_symbol);

    // Check if KuCoin API returned success
    if (priceResponse.code !== '200000') {
      return res.status(400).json({
        success: false,
        error: priceResponse.msg || 'Failed to fetch price'
      });
    }

    // Return price data
    return res.status(200).json({
      success: true,
      data: {
        symbol: symbol,
        price: priceResponse.data.last, // Use 'last' field from KuCoin API
        timestamp: priceResponse.data.time
      }
    });
  } catch (error) {
    console.error('Token price error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
