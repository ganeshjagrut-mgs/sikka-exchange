const express = require('express');
const router = express.Router();
const { verifyAdminJWT } = require('../../middleware/admin-auth');
const dbService = require('../../services/db.service');

/**
 * GET /api/admin/config/conversion-rate
 * Get current INR to USDT conversion rate
 *
 * Headers: Authorization: Bearer <admin_jwt_token>
 * Returns: { success, data: { rate, last_updated_at } }
 */
router.get('/conversion-rate', verifyAdminJWT, async (req, res) => {
  try {
    const config = await dbService.queryOne(
      `SELECT value, updated_at as last_updated_at
       FROM admin_config
       WHERE key = $1`,
      ['usdt_inr_rate']
    );

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'CONFIG_NOT_FOUND',
        message: 'Conversion rate configuration not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        rate: parseFloat(config.value),
        last_updated_at: config.last_updated_at
      }
    });
  } catch (error) {
    console.error('Get conversion rate error:', error);
    return res.status(500).json({
      success: false,
      error: 'GET_CONVERSION_RATE_FAILED',
      message: 'Failed to get conversion rate'
    });
  }
});

/**
 * POST /api/admin/config/conversion-rate
 * Update INR to USDT conversion rate
 *
 * Body: { rate: number }
 * Headers: Authorization: Bearer <admin_jwt_token>
 * Returns: { success, data: { rate, updated_at } }
 */
router.post('/conversion-rate', verifyAdminJWT, async (req, res) => {
  try {
    const { rate } = req.body;
    const adminId = req.admin.id;

    // Validate rate
    if (!rate || typeof rate !== 'number' || rate <= 0) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_RATE',
        message: 'Rate must be a positive number'
      });
    }

    // Update config
    const updated = await dbService.query(
      `UPDATE admin_config
       SET value = $1, updated_at = NOW(), updated_by = $2
       WHERE key = $3
       RETURNING value, updated_at`,
      [rate.toString(), adminId, 'usdt_inr_rate']
    );

    if (updated.rows.length === 0) {
      // Insert if doesn't exist
      const inserted = await dbService.query(
        `INSERT INTO admin_config (key, value, updated_by)
         VALUES ($1, $2, $3)
         RETURNING value, updated_at`,
        ['usdt_inr_rate', rate.toString(), adminId]
      );

      return res.status(200).json({
        success: true,
        data: {
          rate: parseFloat(inserted.rows[0].value),
          updated_at: inserted.rows[0].updated_at
        }
      });
    }

    console.log('Conversion rate updated:', {
      rate,
      adminId,
      timestamp: updated.rows[0].updated_at
    });

    return res.status(200).json({
      success: true,
      data: {
        rate: parseFloat(updated.rows[0].value),
        updated_at: updated.rows[0].updated_at
      }
    });
  } catch (error) {
    console.error('Update conversion rate error:', error);
    return res.status(500).json({
      success: false,
      error: 'UPDATE_CONVERSION_RATE_FAILED',
      message: 'Failed to update conversion rate'
    });
  }
});

/**
 * GET /api/admin/config/trading-fee
 * Get current trading fee from KuCoin
 *
 * NOTE: Trading fees are managed by KuCoin's broker program.
 * This endpoint fetches the actual fee rate from KuCoin API.
 *
 * Headers: Authorization: Bearer <admin_jwt_token>
 * Returns: { success, data: { fee_percentage, source } }
 */
router.get('/trading-fee', verifyAdminJWT, async (req, res) => {
  try {
    const kucoin = require('../../services/kucoin.service');

    // Fetch actual fee from KuCoin for a common trading pair
    let takerFeeRate = 0.001; // Default 0.1%
    let source = 'default';

    try {
      const feeResponse = await kucoin.getActualFee('BTC-USDT');
      if (feeResponse.code === '200000' && feeResponse.data && feeResponse.data.length > 0) {
        takerFeeRate = parseFloat(feeResponse.data[0].takerFeeRate);
        source = 'kucoin_api';
      }
    } catch (feeError) {
      console.warn('Failed to fetch KuCoin fee:', feeError.message);
      source = 'default_fallback';
    }

    return res.status(200).json({
      success: true,
      data: {
        fee_percentage: takerFeeRate * 100, // Convert to percentage
        fee_rate: takerFeeRate,
        source: source,
        note: 'Trading fees are managed by KuCoin broker program. Sikka receives rebates automatically.'
      }
    });
  } catch (error) {
    console.error('Get trading fee error:', error);
    return res.status(500).json({
      success: false,
      error: 'GET_TRADING_FEE_FAILED',
      message: 'Failed to get trading fee'
    });
  }
});

/**
 * GET /api/admin/config/tokens
 * Get all tokens configuration
 *
 * Headers: Authorization: Bearer <admin_jwt_token>
 * Returns: { success, data: [...] }
 */
router.get('/tokens', verifyAdminJWT, async (req, res) => {
  try {
    const tokens = await dbService.queryMany(
      `SELECT
        id,
        symbol,
        name,
        kucoin_symbol,
        quote_min_size,
        quote_max_size,
        base_min_size,
        is_active,
        display_order,
        icon_url,
        created_at,
        updated_at
       FROM tokens
       ORDER BY display_order ASC, symbol ASC`
    );

    return res.status(200).json({
      success: true,
      data: tokens
    });
  } catch (error) {
    console.error('Get tokens config error:', error);
    return res.status(500).json({
      success: false,
      error: 'GET_TOKENS_FAILED',
      message: 'Failed to get tokens configuration'
    });
  }
});

/**
 * PUT /api/admin/config/tokens/:symbol
 * Update token configuration
 *
 * Body: {
 *   is_active?: boolean,
 *   quote_min_size?: number,
 *   quote_max_size?: number
 * }
 * Headers: Authorization: Bearer <admin_jwt_token>
 * Returns: { success, data: {...} }
 */
router.put('/tokens/:symbol', verifyAdminJWT, async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const { is_active, quote_min_size, quote_max_size } = req.body;

    // Verify token exists
    const token = await dbService.queryOne(
      'SELECT * FROM tokens WHERE symbol = $1',
      [symbol]
    );

    if (!token) {
      return res.status(404).json({
        success: false,
        error: 'TOKEN_NOT_FOUND',
        message: `Token ${symbol} not found`
      });
    }

    // Build update object
    const updates = {};

    if (typeof is_active === 'boolean') {
      updates.is_active = is_active;
    }

    if (quote_min_size !== undefined) {
      if (typeof quote_min_size !== 'number' || quote_min_size <= 0) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_MIN_SIZE',
          message: 'quote_min_size must be a positive number'
        });
      }
      updates.quote_min_size = quote_min_size;
    }

    if (quote_max_size !== undefined) {
      if (typeof quote_max_size !== 'number' || quote_max_size <= 0) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_MAX_SIZE',
          message: 'quote_max_size must be a positive number'
        });
      }
      updates.quote_max_size = quote_max_size;
    }

    // Validate min < max if both are provided or one is being updated
    const finalMinSize = updates.quote_min_size !== undefined ? updates.quote_min_size : parseFloat(token.quote_min_size);
    const finalMaxSize = updates.quote_max_size !== undefined ? updates.quote_max_size : parseFloat(token.quote_max_size);

    if (finalMinSize >= finalMaxSize) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_SIZE_RANGE',
        message: 'quote_min_size must be less than quote_max_size'
      });
    }

    // Check if there are any updates
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'NO_UPDATES',
        message: 'No valid fields to update'
      });
    }

    // Add updated_at timestamp
    updates.updated_at = new Date();

    // Update token
    const updatedToken = await dbService.updateById('tokens', token.id, updates);

    console.log('Token config updated:', {
      symbol,
      updates,
      adminId: req.admin.id
    });

    return res.status(200).json({
      success: true,
      data: updatedToken
    });
  } catch (error) {
    console.error('Update token config error:', error);
    return res.status(500).json({
      success: false,
      error: 'UPDATE_TOKEN_FAILED',
      message: 'Failed to update token configuration'
    });
  }
});

module.exports = router;
