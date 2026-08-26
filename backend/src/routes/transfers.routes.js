const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../middleware/auth');
const db = require('../config/database');
const kucoin = require('../services/kucoin.service');

/**
 * POST /api/transfers/inner-account
 * Transfer funds between MAIN and TRADE accounts within user's KuCoin sub-account
 *
 * Body:
 * {
 *   "currency": "USDT",
 *   "amount": 100.50,
 *   "from_type": "main",  // or "trade"
 *   "to_type": "trade"    // or "main"
 * }
 */
router.post('/inner-account', verifyFirebaseToken, async (req, res) => {
  const userId = req.user.id;
  const { currency, amount, from_type, to_type } = req.body;

  try {
    // Validation
    if (!currency || !amount || !from_type || !to_type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: currency, amount, from_type, to_type'
      });
    }

    // Validate amount
    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount. Must be a positive number.'
      });
    }

    // Validate account types
    const validTypes = ['main', 'trade'];
    if (!validTypes.includes(from_type.toLowerCase()) || !validTypes.includes(to_type.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid account type. Must be "main" or "trade".'
      });
    }

    // Prevent same-account transfers
    if (from_type.toLowerCase() === to_type.toLowerCase()) {
      return res.status(400).json({
        success: false,
        error: 'Cannot transfer to the same account type.'
      });
    }

    // Get user's KuCoin credentials from database
    const userResult = await db.query(
      'SELECT kucoin_api_key, kucoin_api_secret, kucoin_api_passphrase, kyc_status FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = userResult.rows[0];

    // Check KYC status (transfers might require KYC approval)
    // TODO: Decide if transfers require KYC approval
    // For now, allow transfers even without KYC (for deposit → trade flow)

    // Check if user has KuCoin credentials
    if (!user.kucoin_api_key || !user.kucoin_api_secret || !user.kucoin_api_passphrase) {
      return res.status(400).json({
        success: false,
        error: 'KuCoin account not set up. Please complete KYC first.'
      });
    }

    const apiKeys = {
      apiKey: user.kucoin_api_key,
      apiSecret: user.kucoin_api_secret,
      apiPassphrase: user.kucoin_api_passphrase
    };

    // Generate unique client order ID for idempotency
    const clientOid = `transfer_${userId.substring(0, 8)}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    // Execute transfer via KuCoin service
    const result = await kucoin.transferInnerAccount(
      transferAmount,
      from_type.toLowerCase(),
      to_type.toLowerCase(),
      currency.toUpperCase(),
      apiKeys,
      clientOid
    );

    // Check KuCoin response
    if (result.code !== '200000') {
      return res.status(400).json({
        success: false,
        error: `KuCoin transfer failed: ${result.msg}`,
        kucoin_code: result.code
      });
    }

    // Success response
    res.status(200).json({
      success: true,
      message: 'Transfer completed successfully',
      data: {
        transfer_id: result.data?.orderId || clientOid,
        currency: currency.toUpperCase(),
        amount: transferAmount,
        from: from_type.toLowerCase(),
        to: to_type.toLowerCase(),
        client_order_id: clientOid,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Internal transfer error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute internal transfer',
      details: error.message
    });
  }
});

/**
 * GET /api/transfers/history
 * Get transfer history
 *
 * Note: Internal transfers (MAIN <-> TRADE) are executed via KuCoin API
 * but not currently logged in our database. This endpoint returns an empty
 * array for now. To track history, we would need to:
 * 1. Create an internal_transfers table
 * 2. Log each transfer after successful KuCoin API call
 * 3. Query that table here
 */
router.get('/history', verifyFirebaseToken, async (req, res) => {
  try {
    // For now, return empty array since we don't log internal transfers
    // Users can check their balance/holdings to see current state
    res.status(200).json({
      success: true,
      data: [],
      message: 'Transfer history not currently tracked. Check balance for current account state.'
    });
  } catch (error) {
    console.error('Transfer history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve transfer history'
    });
  }
});

module.exports = router;
