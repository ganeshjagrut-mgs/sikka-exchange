const express = require('express');
const router = express.Router();
const { verifyAdminJWT } = require('../../middleware/admin-auth');
const dbService = require('../../services/db.service');

/**
 * GET /api/admin/users
 * List all users with pagination
 *
 * Query params:
 *   - page: number (default: 1)
 *   - limit: number (default: 50)
 *
 * Headers: Authorization: Bearer <admin_jwt_token>
 * Returns: { success, data: { users, total, page, limit } }
 */
router.get('/', verifyAdminJWT, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    // Validate pagination params
    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_PAGINATION',
        message: 'Invalid pagination parameters (page >= 1, 1 <= limit <= 100)'
      });
    }

    // Get total count
    const countResult = await dbService.queryOne(
      'SELECT COUNT(*) as total FROM users'
    );
    const total = parseInt(countResult.total);

    // Get users with pagination
    const users = await dbService.queryMany(
      `SELECT
        id,
        firebase_uid,
        phone,
        email,
        full_name,
        kyc_status,
        created_at,
        updated_at as last_login_at
       FROM users
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return res.status(200).json({
      success: true,
      data: {
        users,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('List users error:', error);
    return res.status(500).json({
      success: false,
      error: 'LIST_USERS_FAILED',
      message: 'Failed to list users'
    });
  }
});

/**
 * GET /api/admin/users/:id
 * Get single user details with KYC data
 *
 * Headers: Authorization: Bearer <admin_jwt_token>
 * Returns: { success, data: { user, kyc } }
 */
router.get('/:id', verifyAdminJWT, async (req, res) => {
  try {
    const userId = req.params.id;

    // Get user details
    const user = await dbService.queryOne(
      `SELECT
        id,
        firebase_uid,
        email,
        phone,
        full_name,
        kucoin_sub_account_uid,
        kucoin_api_key,
        kyc_status,
        created_at,
        updated_at
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'User not found'
      });
    }

    // Get KYC details if exists
    const kyc = await dbService.queryOne(
      `SELECT
        id,
        full_name,
        date_of_birth,
        address,
        id_type,
        id_number,
        status,
        rejection_reason,
        submitted_at,
        reviewed_at,
        kucoin_kyc_id
       FROM kyc_submissions
       WHERE user_id = $1
       ORDER BY submitted_at DESC
       LIMIT 1`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      data: {
        user,
        kyc: kyc || null
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({
      success: false,
      error: 'GET_USER_FAILED',
      message: 'Failed to get user details'
    });
  }
});

/**
 * GET /api/admin/users/:id/transactions
 * Get user's transaction history (deposits, withdrawals, trades)
 *
 * Query params:
 *   - type: string (optional: 'deposits', 'withdrawals', 'trades', 'all')
 *   - limit: number (default: 100)
 *
 * Headers: Authorization: Bearer <admin_jwt_token>
 * Returns: { success, data: [...] }
 */
router.get('/:id/transactions', verifyAdminJWT, async (req, res) => {
  try {
    const userId = req.params.id;
    const type = req.query.type || 'all';
    const limit = parseInt(req.query.limit) || 100;

    // Validate limit
    if (limit < 1 || limit > 500) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_LIMIT',
        message: 'Limit must be between 1 and 500'
      });
    }

    // Verify user exists
    const user = await dbService.queryOne(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'User not found'
      });
    }

    let transactions = [];

    // Get deposits
    if (type === 'all' || type === 'deposits') {
      const deposits = await dbService.queryMany(
        `SELECT
          id,
          'deposit' as type,
          amount_inr as amount,
          estimated_usdt,
          actual_usdt,
          status,
          requested_at as created_at,
          paid_at,
          completed_at
         FROM deposits
         WHERE user_id = $1
         ORDER BY requested_at DESC
         LIMIT $2`,
        [userId, limit]
      );
      transactions = [...transactions, ...deposits];
    }

    // Get withdrawals
    if (type === 'all' || type === 'withdrawals') {
      const withdrawals = await dbService.queryMany(
        `SELECT
          id,
          'withdrawal' as type,
          amount_inr as amount,
          amount_usdt,
          status,
          requested_at as created_at,
          completed_at
         FROM withdrawals
         WHERE user_id = $1
         ORDER BY requested_at DESC
         LIMIT $2`,
        [userId, limit]
      );
      transactions = [...transactions, ...withdrawals];
    }

    // Get trades
    if (type === 'all' || type === 'trades') {
      const trades = await dbService.queryMany(
        `SELECT
          id,
          'trade' as type,
          token_symbol,
          side,
          amount_inr as amount,
          amount_usdt,
          quantity,
          price_usdt,
          platform_fee_inr,
          status,
          created_at,
          filled_at as completed_at
         FROM trades
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [userId, limit]
      );
      transactions = [...transactions, ...trades];
    }

    // Sort all transactions by created_at DESC
    transactions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Limit total results
    transactions = transactions.slice(0, limit);

    return res.status(200).json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Get user transactions error:', error);
    return res.status(500).json({
      success: false,
      error: 'GET_TRANSACTIONS_FAILED',
      message: 'Failed to get user transactions'
    });
  }
});

module.exports = router;
