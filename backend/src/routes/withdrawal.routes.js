const express = require('express');
const router = express.Router();
const dbService = require('../services/db.service');
const kucoin = require('../services/kucoin.service');
const { verifyFirebaseToken, requireAuth, requireKYC } = require('../middleware/auth');

/**
 * POST /api/withdrawals/request
 * Request a new withdrawal
 *
 * Body: {
 *   amount: number (USDT/USD),
 *   bank_account_id?: number (optional - uses default if not provided)
 * }
 * Headers: Authorization: Bearer <firebase_token>
 * Returns: { success, data: {...} }
 */
router.post('/request', verifyFirebaseToken, requireAuth, requireKYC, async (req, res) => {
  try {
    // Accept either 'amount' (new) or 'amount_inr' (legacy) for backward compatibility
    const { amount, amount_inr, bank_account_id } = req.body;
    const amountUsdt = amount || amount_inr; // Use 'amount' first, fallback to 'amount_inr'
    const userId = req.user.id;

    // Validate amount (now in USD/USDT)
    if (!amountUsdt || typeof amountUsdt !== 'number' || amountUsdt <= 0) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_AMOUNT',
        message: 'Amount must be a positive number'
      });
    }

    // Find bank account (use provided ID or default)
    let bankAccount;
    if (bank_account_id) {
      // Use provided bank account
      bankAccount = await dbService.queryOne(
        'SELECT * FROM bank_accounts WHERE id = $1 AND user_id = $2',
        [bank_account_id, userId]
      );

      if (!bankAccount) {
        return res.status(404).json({
          success: false,
          error: 'BANK_ACCOUNT_NOT_FOUND',
          message: 'Bank account not found'
        });
      }
    } else {
      // Use default bank account
      bankAccount = await dbService.queryOne(
        'SELECT * FROM bank_accounts WHERE user_id = $1 AND is_default = true',
        [userId]
      );

      if (!bankAccount) {
        return res.status(404).json({
          success: false,
          error: 'NO_DEFAULT_BANK_ACCOUNT',
          message: 'No bank account found. Please add a bank account first.'
        });
      }
    }

    // Get user's KuCoin API keys
    const apiKeys = {
      apiKey: req.user.kucoin_api_key,
      apiSecret: req.user.kucoin_api_secret,
      apiPassphrase: req.user.kucoin_api_passphrase
    };

    // Check USDT balance in trade account
    const balanceResponse = await kucoin.getBalance('USDT', 'trade', apiKeys);

    if (balanceResponse.code !== '200000') {
      return res.status(500).json({
        success: false,
        error: 'BALANCE_CHECK_FAILED',
        message: 'Failed to check USDT balance'
      });
    }

    const kucoinBalance = parseFloat(balanceResponse.data[0].available);

    // Use database transaction to atomically lock funds and create withdrawal
    const withdrawal = await dbService.transaction(async (client) => {
      // Get user's current locked balance
      const userResult = await client.query(
        'SELECT locked_balance_usdt FROM users WHERE id = $1 FOR UPDATE',
        [userId]
      );

      const currentLockedBalance = parseFloat(userResult.rows[0]?.locked_balance_usdt || 0);
      const newLockedBalance = currentLockedBalance + amountUsdt;

      // Calculate available balance (KuCoin balance - locked balance)
      const availableBalance = kucoinBalance - currentLockedBalance;

      if (availableBalance < amountUsdt) {
        throw new Error(
          `INSUFFICIENT_BALANCE: Available: ${availableBalance.toFixed(8)} USDT (${kucoinBalance.toFixed(8)} in KuCoin - ${currentLockedBalance.toFixed(8)} locked), Required: ${amountUsdt} USDT`
        );
      }

      // Lock the funds by updating locked_balance_usdt
      await client.query(
        'UPDATE users SET locked_balance_usdt = $1 WHERE id = $2',
        [newLockedBalance, userId]
      );

      // Create withdrawal record
      // amount_inr column now stores USD value for consistency
      const withdrawalResult = await client.query(
        `INSERT INTO withdrawals (user_id, bank_account_id, amount_inr, amount_usdt, usdt_inr_rate, status, requested_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [userId, bankAccount.id, amountUsdt, amountUsdt, 1, 'pending', new Date()]
      );

      return withdrawalResult.rows[0];
    });

    console.log('Withdrawal requested:', {
      withdrawalId: withdrawal.id,
      userId,
      amountUSD: amountUsdt,
      bankAccountId: bankAccount.id
    });

    return res.status(201).json({
      success: true,
      data: {
        id: withdrawal.id,
        amountUSD: withdrawal.amount_usdt,
        amount_usdt: withdrawal.amount_usdt,  // Keep for backward compatibility
        status: withdrawal.status,
        bank_account: {
          id: bankAccount.id,
          account_holder_name: bankAccount.account_holder_name,
          account_number: bankAccount.account_number,
          ifsc_code: bankAccount.ifsc_code,
          bank_name: bankAccount.bank_name
        },
        requested_at: withdrawal.requested_at
      }
    });
  } catch (error) {
    console.error('Withdrawal request error:', error);

    // Handle insufficient balance error from transaction
    if (error.message && error.message.startsWith('INSUFFICIENT_BALANCE:')) {
      return res.status(400).json({
        success: false,
        error: 'INSUFFICIENT_BALANCE',
        message: error.message.replace('INSUFFICIENT_BALANCE: ', '')
      });
    }

    return res.status(500).json({
      success: false,
      error: 'WITHDRAWAL_REQUEST_FAILED',
      message: 'Failed to request withdrawal'
    });
  }
});

/**
 * GET /api/withdrawals/history
 * Get withdrawal history for current user
 *
 * Headers: Authorization: Bearer <firebase_token>
 * Returns: { success, data: [...] }
 */
router.get('/history', verifyFirebaseToken, requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const withdrawals = await dbService.queryMany(
      `SELECT w.*,
              ba.account_holder_name, ba.account_number, ba.ifsc_code, ba.bank_name
       FROM withdrawals w
       LEFT JOIN bank_accounts ba ON w.bank_account_id = ba.id
       WHERE w.user_id = $1
       ORDER BY w.requested_at DESC
       LIMIT 50`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      data: withdrawals
    });
  } catch (error) {
    console.error('Withdrawal history error:', error);
    return res.status(500).json({
      success: false,
      error: 'WITHDRAWAL_HISTORY_FAILED',
      message: 'Failed to fetch withdrawal history'
    });
  }
});

/**
 * GET /api/withdrawals/:id
 * Get a specific withdrawal
 *
 * Headers: Authorization: Bearer <firebase_token>
 * Returns: { success, data: {...} }
 */
router.get('/:id', verifyFirebaseToken, requireAuth, async (req, res) => {
  try {
    const withdrawalId = req.params.id;
    const userId = req.user.id;

    const withdrawal = await dbService.queryOne(
      `SELECT w.*,
              ba.account_holder_name, ba.account_number, ba.ifsc_code, ba.bank_name
       FROM withdrawals w
       LEFT JOIN bank_accounts ba ON w.bank_account_id = ba.id
       WHERE w.id = $1 AND w.user_id = $2`,
      [withdrawalId, userId]
    );

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        error: 'WITHDRAWAL_NOT_FOUND',
        message: 'Withdrawal not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: withdrawal
    });
  } catch (error) {
    console.error('Get withdrawal error:', error);
    return res.status(500).json({
      success: false,
      error: 'GET_WITHDRAWAL_FAILED',
      message: 'Failed to get withdrawal'
    });
  }
});

module.exports = router;
