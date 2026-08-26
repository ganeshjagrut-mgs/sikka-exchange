const express = require('express');
const router = express.Router();
const dbService = require('../../services/db.service');
const kucoin = require('../../services/kucoin.service');
const { verifyAdminJWT } = require('../../middleware/admin-auth');

/**
 * POST /api/admin/transfers/manual
 * Manually transfer USDT from broker to user sub-account
 *
 * This is a general-purpose tool for:
 * - Funding test users
 * - Adding bonus credits
 * - Manual balance adjustments
 *
 * Note: For user→broker transfers, use the withdrawal approval flow instead.
 *
 * Body: {
 *   user_id: string,           // UUID of user
 *   amount_usdt: number,        // Amount to transfer
 *   to_trade: boolean,          // If true, auto-transfer to TRADE account (default: true)
 *   notes: string              // Admin notes for audit trail
 * }
 */
router.post('/manual', verifyAdminJWT, async (req, res) => {
  try {
    const { user_id, amount_usdt, to_trade = true, notes } = req.body;
    const adminId = req.admin.id;

    console.log('Manual transfer requested:', { user_id, amount_usdt, to_trade, adminId });

    // Validate inputs
    if (!user_id || !amount_usdt) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_FIELDS',
        message: 'user_id and amount_usdt are required'
      });
    }

    if (amount_usdt <= 0) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_AMOUNT',
        message: 'amount_usdt must be greater than 0'
      });
    }

    // Get user details
    const user = await dbService.queryOne(
      `SELECT id, email, full_name, kucoin_sub_account_uid,
              kucoin_api_key, kucoin_api_secret, kucoin_api_passphrase
       FROM users WHERE id = $1`,
      [user_id]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'User not found'
      });
    }

    if (!user.kucoin_sub_account_uid) {
      return res.status(400).json({
        success: false,
        error: 'NO_SUBACCOUNT',
        message: 'User does not have a KuCoin sub-account'
      });
    }

    const results = [];

    // Transfer: Broker → User
    console.log(`Transferring ${amount_usdt} USDT from broker to user ${user.email}`);

    // Step 1: Broker MAIN → Sub MAIN
    const transfer1 = await kucoin.transferBrokerToSub(
      amount_usdt,
      user.kucoin_sub_account_uid,
      'OUT',
      'USDT'
    );

    results.push({
      step: 'broker_to_sub_main',
      status: transfer1.code === '200000' ? 'success' : 'failed',
      orderId: transfer1.data?.orderId,
      response: transfer1
    });

    if (transfer1.code !== '200000') {
      throw new Error(`Broker transfer failed: ${transfer1.msg}`);
    }

    // Step 2: Sub MAIN → Sub TRADE (if requested, default: true)
    if (to_trade) {
      console.log(`Moving ${amount_usdt} USDT from sub MAIN to TRADE`);

      const apiKeys = {
        apiKey: user.kucoin_api_key,
        apiSecret: user.kucoin_api_secret,
        apiPassphrase: user.kucoin_api_passphrase
      };

      const transfer2 = await kucoin.transferInnerAccount(
        amount_usdt,
        'main',
        'trade',
        'USDT',
        apiKeys
      );

      results.push({
        step: 'sub_main_to_trade',
        status: transfer2.code === '200000' ? 'success' : 'failed',
        orderId: transfer2.data?.orderId,
        response: transfer2
      });

      if (transfer2.code !== '200000') {
        console.warn(`Sub MAIN→TRADE failed: ${transfer2.msg} (funds still in MAIN)`);
      }
    }

    // Log to database for audit trail
    await dbService.query(
      `INSERT INTO admin_transfer_logs
       (admin_id, user_id, amount_usdt, direction, to_trade, notes, results, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [adminId, user_id, amount_usdt, 'OUT', to_trade, notes || null, JSON.stringify(results)]
    ).catch(err => {
      console.warn('Failed to log transfer (non-critical):', err.message);
    });

    return res.status(200).json({
      success: true,
      message: `Successfully funded ${amount_usdt} USDT to user ${user.email}`,
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name
      },
      transfers: results,
      finalLocation: to_trade ? 'Sub-account TRADE' : 'Sub-account MAIN'
    });

  } catch (error) {
    console.error('Manual transfer error:', error);
    return res.status(500).json({
      success: false,
      error: 'TRANSFER_FAILED',
      message: error.message || 'Failed to complete manual transfer'
    });
  }
});

/**
 * GET /api/admin/transfers/history
 * Get history of manual transfers for audit
 */
router.get('/history', verifyAdminJWT, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    const transfers = await dbService.queryMany(
      `SELECT
        tl.id,
        tl.admin_id,
        tl.user_id,
        tl.amount_usdt,
        tl.direction,
        tl.to_trade,
        tl.notes,
        tl.created_at,
        u.email as user_email,
        u.full_name as user_name,
        a.username as admin_username
       FROM admin_transfer_logs tl
       JOIN users u ON tl.user_id = u.id
       JOIN admin_users a ON tl.admin_id = a.id
       ORDER BY tl.created_at DESC
       LIMIT $1`,
      [limit]
    ).catch(() => []);

    return res.status(200).json({
      success: true,
      transfers
    });
  } catch (error) {
    console.error('Get transfer history error:', error);
    return res.status(500).json({
      success: false,
      error: 'FETCH_FAILED',
      message: 'Failed to fetch transfer history'
    });
  }
});

module.exports = router;
