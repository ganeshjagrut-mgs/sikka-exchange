const express = require('express');
const router = express.Router();
const kucoinService = require('../services/kucoin.service');

/**
 * GET /api/market/candles
 * Get historical candle/kline data for a trading pair (PUBLIC endpoint - no auth required)
 *
 * Query params:
 * - symbol: Trading pair (e.g., BTC-USDT)
 * - type: Candle interval (e.g., 1hour, 1day, 1week)
 *
 * Returns: { success: true, data: { symbol, interval, candles: [...] } }
 */
router.get('/candles', async (req, res) => {
  try {
    const { symbol, type } = req.query;

    if (!symbol || !type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: symbol, type'
      });
    }

    // Map frontend intervals to KuCoin intervals
    const intervalMap = {
      '1min': '1min',
      '5min': '5min',
      '15min': '15min',
      '30min': '30min',
      '1hour': '1hour',
      '4hour': '4hour',
      '1day': '1day',
      '1week': '1week'
    };

    const kucoinInterval = intervalMap[type] || '1hour';

    // Fetch from KuCoin public API (no auth required)
    const candles = await kucoinService.getCandles(symbol, kucoinInterval);

    return res.status(200).json({
      success: true,
      data: {
        symbol: symbol,
        interval: type,
        candles: candles
      }
    });
  } catch (error) {
    console.error('Candles fetch error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
