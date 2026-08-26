const express = require('express');
const router = express.Router();
const dbService = require('../services/db.service');
const kucoin = require('../services/kucoin.service');
const { verifyFirebaseToken, requireAuth, requireKYC } = require('../middleware/auth');

/**
 * POST /api/trades/estimate-fees
 * Calculate trading fees before placing order
 * Fee is fetched from KuCoin API - reflects actual broker rate
 *
 * Body: { symbol, side, quantity }
 * Headers: Authorization: Bearer <firebase_token>
 * Returns: { symbol, quantity, price, subtotal, tradingFee, totalUSD, feeRate }
 */
router.post('/estimate-fees', verifyFirebaseToken, requireAuth, requireKYC, async (req, res) => {
  try {
    const { symbol, side, quantity } = req.body;

    // Validate inputs
    if (!symbol || !side || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: symbol, side, quantity'
      });
    }

    if (!['buy', 'sell'].includes(side)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid side. Must be "buy" or "sell"'
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Quantity must be greater than 0'
      });
    }

    // Verify token exists in database
    const token = await dbService.findOne('tokens', { symbol: symbol.toUpperCase() });
    if (!token || !token.is_active) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or inactive token symbol'
      });
    }

    // Get current market price from KuCoin
    const priceResponse = await kucoin.getMarketPrice(token.kucoin_symbol);
    if (priceResponse.code !== '200000') {
      return res.status(400).json({
        success: false,
        error: priceResponse.msg || 'Failed to fetch market price'
      });
    }

    const price = parseFloat(priceResponse.data.last);

    // Get actual trading fee from KuCoin (includes broker rate)
    let takerFeeRate = 0.001; // Default 0.1% if API fails
    try {
      const feeResponse = await kucoin.getActualFee(token.kucoin_symbol);
      if (feeResponse.code === '200000' && feeResponse.data && feeResponse.data.length > 0) {
        // Market orders are always taker orders
        takerFeeRate = parseFloat(feeResponse.data[0].takerFeeRate);
      }
    } catch (feeError) {
      console.warn('Failed to fetch KuCoin fee, using default:', feeError.message);
    }

    // Calculate totals in USD (USDT = USD for display)
    const subtotalUSD = quantity * price;
    const tradingFeeUSD = subtotalUSD * takerFeeRate;
    // Note: Fee is deducted by KuCoin, not added to order cost
    // For buy: user gets slightly less crypto (fee deducted from received amount)
    // For sell: user gets slightly less USDT (fee deducted from proceeds)

    // Total is same as subtotal - fee is deducted from trade output, not added to input
    const totalUSD = subtotalUSD;

    return res.status(200).json({
      success: true,
      data: {
        symbol: token.symbol,
        quantity: quantity.toString(),
        price: price.toFixed(2),
        subtotal: parseFloat(subtotalUSD.toFixed(2)),
        tradingFee: parseFloat(tradingFeeUSD.toFixed(2)),      // KuCoin's fee (informational)
        platformFee: parseFloat(tradingFeeUSD.toFixed(2)),      // Alias for backward compatibility
        totalUSD: parseFloat(totalUSD.toFixed(2)),
        feeRate: (takerFeeRate * 100).toFixed(3) + '%'  // e.g., "0.100%"
      }
    });
  } catch (error) {
    console.error('Estimate fees error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/trades/buy
 * Place a buy order on KuCoin
 *
 * Body: { symbol, quantity }
 * Headers: Authorization: Bearer <firebase_token>
 * Returns: Trade record with status='pending'
 */
router.post('/buy', verifyFirebaseToken, requireAuth, requireKYC, async (req, res) => {
  try {
    const { symbol, quantity } = req.body;
    const userId = req.user.id;

    // Validate inputs
    if (!symbol || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: symbol, quantity'
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Quantity must be greater than 0'
      });
    }

    // Verify token exists in database
    const token = await dbService.findOne('tokens', { symbol: symbol.toUpperCase() });
    if (!token || !token.is_active) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or inactive token symbol'
      });
    }

    // Get current market price
    const priceResponse = await kucoin.getMarketPrice(token.kucoin_symbol);
    if (priceResponse.code !== '200000') {
      return res.status(400).json({
        success: false,
        error: priceResponse.msg || 'Failed to fetch market price'
      });
    }

    const price = parseFloat(priceResponse.data.last);

    // Calculate order value in USD (USDT = USD)
    const orderValueUSD = quantity * price;

    // Round orderValueUSD to 2 decimal places to meet KuCoin increment requirements
    // KuCoin requires funds in increments of 0.01 USDT (2 decimal places)
    const orderValueUSDRounded = Math.round(orderValueUSD * 100) / 100;

    // Validate minimum order size (quote_min_size is in USDT/USD)
    if (token.quote_min_size && orderValueUSDRounded < parseFloat(token.quote_min_size)) {
      return res.status(400).json({
        success: false,
        error: `Order value $${orderValueUSD.toFixed(2)} is below minimum $${parseFloat(token.quote_min_size).toFixed(2)}`
      });
    }

    // Validate maximum order size (quote_max_size is in USDT/USD)
    if (token.quote_max_size && orderValueUSDRounded > parseFloat(token.quote_max_size)) {
      return res.status(400).json({
        success: false,
        error: `Order value $${orderValueUSD.toFixed(2)} exceeds maximum $${parseFloat(token.quote_max_size).toFixed(2)}`
      });
    }

    // Total USDT required is just the order value
    // KuCoin automatically deducts their fee from the trade output
    const totalUSDTNeeded = orderValueUSDRounded;

    // Get user's KuCoin API keys
    const apiKeys = {
      apiKey: req.user.kucoin_api_key,
      apiSecret: req.user.kucoin_api_secret,
      apiPassphrase: req.user.kucoin_api_passphrase
    };

    // Check USDT balance in TRADE account
    const balanceResponse = await kucoin.getBalance('USDT', 'trade', apiKeys);

    if (balanceResponse.code !== '200000') {
      return res.status(500).json({
        success: false,
        error: 'BALANCE_CHECK_FAILED',
        message: 'Failed to check USDT balance'
      });
    }

    // Validate balance exists
    if (!balanceResponse.data || balanceResponse.data.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'INSUFFICIENT_BALANCE',
        message: 'No USDT balance found in TRADE account. Please deposit and transfer USDT to your TRADE account.'
      });
    }

    const kucoinBalance = parseFloat(balanceResponse.data[0].available);

    // Get locked balance from database (funds locked for pending withdrawals)
    const userLocked = await dbService.queryOne(
      'SELECT locked_balance_usdt FROM users WHERE id = $1',
      [userId]
    );
    const lockedBalance = parseFloat(userLocked?.locked_balance_usdt || 0);

    // Calculate truly available balance (KuCoin balance - locked funds)
    const availableBalance = Math.max(0, kucoinBalance - lockedBalance);

    if (availableBalance < totalUSDTNeeded) {
      return res.status(400).json({
        success: false,
        error: 'INSUFFICIENT_BALANCE',
        message: lockedBalance > 0
          ? `Insufficient USDT in TRADE account. Available: ${availableBalance.toFixed(2)} USDT (${lockedBalance.toFixed(2)} USDT locked for withdrawals), Required: ${totalUSDTNeeded.toFixed(2)} USDT`
          : `Insufficient USDT in TRADE account. Available: ${availableBalance.toFixed(2)} USDT, Required: ${totalUSDTNeeded.toFixed(2)} USDT`
      });
    }

    // Place order on KuCoin with funds parameter (for market BUY)
    // Use rounded value to meet KuCoin's increment requirements
    const orderResponse = await kucoin.placeOrder(
      token.kucoin_symbol,
      'buy',
      'market',
      { funds: orderValueUSDRounded },
      apiKeys
    );

    if (orderResponse.code !== '200000') {
      return res.status(400).json({
        success: false,
        error: orderResponse.msg || 'Failed to place order on KuCoin'
      });
    }

    // Insert trade record into database
    // Note: KuCoin deducts fee automatically, we just record the order value
    // amount_inr column kept for historical records, now stores USD value
    const trade = await dbService.insert('trades', {
      user_id: userId,
      token_symbol: token.symbol,
      side: 'buy',
      order_type: 'market',
      amount_inr: orderValueUSDRounded,  // Now storing USD value
      amount_usdt: orderValueUSDRounded,
      quantity: quantity,
      price_usdt: price,
      usdt_inr_rate: 1,  // No longer using INR conversion
      platform_fee_inr: 0,  // Fee handled by KuCoin
      status: 'pending',
      kucoin_order_id: orderResponse.data.orderId,
      kucoin_client_oid: orderResponse.data.clientOid,
      created_at: new Date()
    });

    console.log('Buy order placed:', {
      tradeId: trade.id,
      symbol: token.symbol,
      quantity,
      price,
      kucoinOrderId: orderResponse.data.orderId
    });

    return res.status(201).json({
      success: true,
      data: {
        id: trade.id,
        symbol: trade.token_symbol,
        side: trade.side,
        type: trade.order_type,
        quantity: trade.quantity,
        status: trade.status,
        kucoin_order_id: trade.kucoin_order_id,
        created_at: trade.created_at
      }
    });
  } catch (error) {
    console.error('Buy order error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/trades/sell
 * Place a sell order on KuCoin
 *
 * Body: { symbol, quantity }
 * Headers: Authorization: Bearer <firebase_token>
 * Returns: Trade record with status='pending'
 */
router.post('/sell', verifyFirebaseToken, requireAuth, requireKYC, async (req, res) => {
  try {
    const { symbol, quantity } = req.body;
    const userId = req.user.id;

    // Validate inputs
    if (!symbol || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: symbol, quantity'
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Quantity must be greater than 0'
      });
    }

    // Verify token exists in database
    const token = await dbService.findOne('tokens', { symbol: symbol.toUpperCase() });
    if (!token || !token.is_active) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or inactive token symbol'
      });
    }

    // Check user's holdings - calculate from filled buy/sell trades
    const buyTrades = await dbService.queryOne(
      `SELECT COALESCE(SUM(quantity), 0) as total_bought
       FROM trades
       WHERE user_id = $1 AND token_symbol = $2 AND side = 'buy' AND status = 'filled'`,
      [userId, token.symbol]
    );

    const sellTrades = await dbService.queryOne(
      `SELECT COALESCE(SUM(quantity), 0) as total_sold
       FROM trades
       WHERE user_id = $1 AND token_symbol = $2 AND side = 'sell' AND status = 'filled'`,
      [userId, token.symbol]
    );

    const totalBought = parseFloat(buyTrades.total_bought) || 0;
    const totalSold = parseFloat(sellTrades.total_sold) || 0;
    const currentHolding = totalBought - totalSold;

    if (currentHolding < quantity) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance',
        message: `You have ${currentHolding} ${token.symbol}, but trying to sell ${quantity}`
      });
    }

    // Get current market price
    const priceResponse = await kucoin.getMarketPrice(token.kucoin_symbol);
    if (priceResponse.code !== '200000') {
      return res.status(400).json({
        success: false,
        error: priceResponse.msg || 'Failed to fetch market price'
      });
    }

    const price = parseFloat(priceResponse.data.last);

    // Get user's KuCoin API keys
    const apiKeys = {
      apiKey: req.user.kucoin_api_key,
      apiSecret: req.user.kucoin_api_secret,
      apiPassphrase: req.user.kucoin_api_passphrase
    };

    // Round quantity DOWN to meet KuCoin baseIncrement requirements for this token
    // Using floor to ensure we never try to sell more than user has
    const baseIncrement = parseFloat(token.base_increment || '0.00000001');
    const precision = baseIncrement < 1 ? Math.round(-Math.log10(baseIncrement)) : 0;
    const multiplier = Math.pow(10, precision);
    const quantityRounded = Math.floor(quantity * multiplier) / multiplier;

    // Place order on KuCoin
    const orderResponse = await kucoin.placeOrder(
      token.kucoin_symbol,
      'sell',
      'market',
      { size: quantityRounded },
      apiKeys
    );

    if (orderResponse.code !== '200000') {
      return res.status(400).json({
        success: false,
        error: orderResponse.msg || 'Failed to place order on KuCoin'
      });
    }

    // Calculate values using rounded quantity (what was actually sold)
    const orderValueUSD = quantityRounded * price;

    // Insert trade record into database
    // Note: KuCoin deducts fee automatically from proceeds
    // amount_inr column kept for historical records, now stores USD value
    const trade = await dbService.insert('trades', {
      user_id: userId,
      token_symbol: token.symbol,
      side: 'sell',
      order_type: 'market',
      amount_inr: orderValueUSD,  // Now storing USD value
      amount_usdt: orderValueUSD,
      quantity: quantityRounded,
      price_usdt: price,
      usdt_inr_rate: 1,  // No longer using INR conversion
      platform_fee_inr: 0,  // Fee handled by KuCoin
      status: 'pending',
      kucoin_order_id: orderResponse.data.orderId,
      kucoin_client_oid: orderResponse.data.clientOid,
      created_at: new Date()
    });

    console.log('Sell order placed:', {
      tradeId: trade.id,
      symbol: token.symbol,
      quantity,
      price,
      kucoinOrderId: orderResponse.data.orderId
    });

    return res.status(201).json({
      success: true,
      data: {
        id: trade.id,
        symbol: trade.token_symbol,
        side: trade.side,
        type: trade.order_type,
        quantity: trade.quantity,
        status: trade.status,
        kucoin_order_id: trade.kucoin_order_id,
        created_at: trade.created_at
      }
    });
  } catch (error) {
    console.error('Sell order error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/trades/history
 * Get all trades for current user
 *
 * Headers: Authorization: Bearer <firebase_token>
 * Returns: Array of trades
 */
router.get('/history', verifyFirebaseToken, requireAuth, requireKYC, async (req, res) => {
  try {
    const userId = req.user.id;

    // Query all trades for user, ordered by most recent first
    const trades = await dbService.queryMany(
      `SELECT
        id,
        token_symbol,
        side,
        order_type,
        amount_inr,
        amount_usdt,
        quantity,
        price_usdt,
        usdt_inr_rate,
        platform_fee_inr,
        status,
        kucoin_order_id,
        created_at,
        filled_at
      FROM trades
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 100`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      data: trades
    });
  } catch (error) {
    console.error('Trade history error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/trades/pnl
 * Calculate profit/loss for user across all holdings
 *
 * Headers: Authorization: Bearer <firebase_token>
 * Returns: { totalPnlUSD, totalPnlPercentage, bySymbol: [...] }
 */
router.get('/pnl', verifyFirebaseToken, requireAuth, requireKYC, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all filled trades for user
    const trades = await dbService.queryMany(
      `SELECT
        token_symbol,
        side,
        quantity,
        price_usdt,
        amount_inr,
        usdt_inr_rate
      FROM trades
      WHERE user_id = $1 AND status = 'filled'
      ORDER BY created_at ASC`,
      [userId]
    );

    // Group by symbol and calculate holdings + avg buy price
    const holdings = {};

    for (const trade of trades) {
      const symbol = trade.token_symbol;

      if (!holdings[symbol]) {
        holdings[symbol] = {
          quantity: 0,
          totalCostUSD: 0
        };
      }

      if (trade.side === 'buy') {
        holdings[symbol].quantity += parseFloat(trade.quantity);
        // Use quantity * price for USD cost (more accurate than amount_inr for historical data)
        holdings[symbol].totalCostUSD += parseFloat(trade.quantity) * parseFloat(trade.price_usdt);
      } else {
        // Sell - reduce quantity and cost proportionally
        const sellQuantity = parseFloat(trade.quantity);
        const sellProportion = sellQuantity / holdings[symbol].quantity;

        holdings[symbol].quantity -= sellQuantity;
        holdings[symbol].totalCostUSD -= holdings[symbol].totalCostUSD * sellProportion;
      }
    }

    // Calculate P&L for each holding
    const pnlBySymbol = [];
    let totalPnlUSD = 0;
    let totalInvestedUSD = 0;

    for (const [symbol, holding] of Object.entries(holdings)) {
      if (holding.quantity <= 0) continue; // Skip if fully sold

      // Get token info
      const token = await dbService.findOne('tokens', { symbol });
      if (!token) continue;

      // Get current market price
      const priceResponse = await kucoin.getMarketPrice(token.kucoin_symbol);
      if (priceResponse.code !== '200000') continue;

      const currentPriceUSD = parseFloat(priceResponse.data.last);
      const currentValueUSD = holding.quantity * currentPriceUSD;

      const avgBuyPriceUSD = holding.totalCostUSD / holding.quantity;
      const investedUSD = holding.totalCostUSD;

      const pnlUSD = currentValueUSD - investedUSD;
      const pnlPercentage = (pnlUSD / investedUSD) * 100;

      pnlBySymbol.push({
        symbol,
        quantity: holding.quantity,
        avgBuyPrice: avgBuyPriceUSD.toFixed(2),
        currentPrice: currentPriceUSD.toFixed(2),
        investedUSD: parseFloat(investedUSD.toFixed(2)),
        currentValueUSD: parseFloat(currentValueUSD.toFixed(2)),
        pnlUSD: parseFloat(pnlUSD.toFixed(2)),
        pnlPercentage: parseFloat(pnlPercentage.toFixed(2))
      });

      totalPnlUSD += pnlUSD;
      totalInvestedUSD += investedUSD;
    }

    const totalPnlPercentage = totalInvestedUSD > 0
      ? (totalPnlUSD / totalInvestedUSD) * 100
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        totalPnlUSD: parseFloat(totalPnlUSD.toFixed(2)),
        totalPnlPercentage: parseFloat(totalPnlPercentage.toFixed(2)),
        totalInvestedUSD: parseFloat(totalInvestedUSD.toFixed(2)),
        bySymbol: pnlBySymbol
      }
    });
  } catch (error) {
    console.error('P&L calculation error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/trades/:id
 * Get a specific trade by ID
 *
 * Headers: Authorization: Bearer <firebase_token>
 * Returns: Single trade record or 404
 */
router.get('/:id', verifyFirebaseToken, requireAuth, requireKYC, async (req, res) => {
  try {
    const tradeId = req.params.id;
    const userId = req.user.id;

    // Query trade with security check (must belong to user)
    const trade = await dbService.queryOne(
      `SELECT
        id,
        token_symbol,
        side,
        order_type,
        amount_inr,
        amount_usdt,
        quantity,
        price_usdt,
        usdt_inr_rate,
        platform_fee_inr,
        status,
        kucoin_order_id,
        created_at,
        filled_at
      FROM trades
      WHERE id = $1 AND user_id = $2`,
      [tradeId, userId]
    );

    if (!trade) {
      return res.status(404).json({
        success: false,
        error: 'Trade not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: trade
    });
  } catch (error) {
    console.error('Trade get error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/trades/:id/cancel
 * Cancel a pending/open order
 *
 * Headers: Authorization: Bearer <firebase_token>
 * Returns: { success, data: {...} }
 */
router.post('/:id/cancel', verifyFirebaseToken, requireAuth, requireKYC, async (req, res) => {
  try {
    const tradeId = req.params.id;
    const userId = req.user.id;

    // Get trade details
    const trade = await dbService.queryOne(
      'SELECT * FROM trades WHERE id = $1 AND user_id = $2',
      [tradeId, userId]
    );

    if (!trade) {
      return res.status(404).json({
        success: false,
        error: 'TRADE_NOT_FOUND',
        message: 'Trade not found'
      });
    }

    // Check if trade can be canceled (must be in pending/active status)
    if (trade.status === 'completed' || trade.status === 'filled' || trade.status === 'canceled') {
      return res.status(400).json({
        success: false,
        error: 'CANNOT_CANCEL',
        message: `Cannot cancel order with status: ${trade.status}`
      });
    }

    // Verify user has KuCoin API keys
    if (!req.user.kucoin_api_key || !req.user.kucoin_api_secret || !req.user.kucoin_api_passphrase) {
      return res.status(400).json({
        success: false,
        error: 'KUCOIN_NOT_SETUP',
        message: 'KuCoin account not set up'
      });
    }

    // Prepare API keys
    const apiKeys = {
      apiKey: req.user.kucoin_api_key,
      apiSecret: req.user.kucoin_api_secret,
      apiPassphrase: req.user.kucoin_api_passphrase
    };

    // Cancel order on KuCoin
    console.log('Canceling order on KuCoin:', {
      tradeId,
      kucoinOrderId: trade.kucoin_order_id,
      userId
    });

    const cancelResponse = await kucoin.cancelOrder(trade.kucoin_order_id, apiKeys);

    if (cancelResponse.code !== '200000') {
      return res.status(500).json({
        success: false,
        error: 'CANCEL_FAILED',
        message: cancelResponse.msg || 'Failed to cancel order on KuCoin'
      });
    }

    // Update trade status in database
    const updatedTrade = await dbService.query(
      `UPDATE trades
       SET status = $1
       WHERE id = $2
       RETURNING *`,
      ['canceled', tradeId]
    );

    console.log('Order canceled successfully:', {
      tradeId,
      kucoinOrderId: trade.kucoin_order_id,
      userId
    });

    return res.status(200).json({
      success: true,
      message: 'Order canceled successfully',
      data: {
        id: updatedTrade.rows[0].id,
        status: updatedTrade.rows[0].status,
        kucoin_order_id: updatedTrade.rows[0].kucoin_order_id
      }
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    return res.status(500).json({
      success: false,
      error: 'CANCEL_ORDER_FAILED',
      message: error.message || 'Failed to cancel order'
    });
  }
});

module.exports = router;
