const express = require('express');
const router = express.Router();
const dbService = require('../../services/db.service');
const kucoin = require('../../services/kucoin.service');
const { verifyAdminJWT } = require('../../middleware/admin-auth');

/**
 * GET /api/admin/withdrawals/pending
 * List all pending withdrawals
 *
 * Headers: Authorization: Bearer <admin_jwt_token>
 * Returns: { success, data: [...] }
 */
router.get('/pending', verifyAdminJWT, async (req, res) => {
  try {
    const withdrawals = await dbService.queryMany(
      `SELECT w.*,
              u.id as user_id, u.email as user_email, u.phone as user_phone, u.full_name as user_name,
              ba.id as bank_account_id, ba.account_holder_name, ba.account_number, ba.ifsc_code, ba.bank_name
       FROM withdrawals w
       JOIN users u ON w.user_id = u.id
       LEFT JOIN bank_accounts ba ON w.bank_account_id = ba.id
       WHERE w.status = $1
       ORDER BY w.requested_at ASC
       LIMIT 50`,
      ['pending']
    );

    return res.status(200).json({
      success: true,
      data: withdrawals
    });
  } catch (error) {
    console.error('List pending withdrawals error:', error);
    return res.status(500).json({
      success: false,
      error: 'LIST_PENDING_FAILED',
      message: 'Failed to list pending withdrawals'
    });
  }
});

/**
 * POST /api/admin/withdrawals/:id/complete
 * Complete a withdrawal (transfer USDT from user sub-account to broker)
 *
 * Flow: User TRADE -> User MAIN -> Broker MAIN
 * Admin manually sends INR to user's bank account separately.
 *
 * Body: {
 *   admin_notes?: string
 * }
 * Headers: Authorization: Bearer <admin_jwt_token>
 * Returns: { success, data: {...} }
 */
router.post('/:id/complete', verifyAdminJWT, async (req, res) => {
  try {
    const withdrawalId = req.params.id;
    const { admin_notes } = req.body;
    const adminId = req.admin.id;

    // Get withdrawal details with user info
    const withdrawal = await dbService.queryOne(
      `SELECT w.*,
              u.kucoin_api_key, u.kucoin_api_secret, u.kucoin_api_passphrase, u.kucoin_sub_account_uid,
              u.email as user_email, u.full_name as user_name,
              ba.account_holder_name, ba.account_number, ba.ifsc_code, ba.bank_name
       FROM withdrawals w
       JOIN users u ON w.user_id = u.id
       LEFT JOIN bank_accounts ba ON w.bank_account_id = ba.id
       WHERE w.id = $1`,
      [withdrawalId]
    );

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        error: 'WITHDRAWAL_NOT_FOUND',
        message: 'Withdrawal not found'
      });
    }

    // Check status is pending
    if (withdrawal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'INVALID_STATUS',
        message: `Cannot complete withdrawal with status: ${withdrawal.status}`
      });
    }

    // Use transaction to ensure atomicity
    const updatedWithdrawal = await dbService.transaction(async (client) => {
      // Get user's API keys
      const apiKeys = {
        apiKey: withdrawal.kucoin_api_key,
        apiSecret: withdrawal.kucoin_api_secret,
        apiPassphrase: withdrawal.kucoin_api_passphrase
      };

      // Step 1: Transfer USDT from sub-account TRADE to MAIN
      console.log('Transferring USDT from TRADE to MAIN:', {
        amount: withdrawal.amount_usdt,
        withdrawalId
      });

      const innerTransfer = await kucoin.transferInnerAccount(
        parseFloat(withdrawal.amount_usdt),
        'trade',
        'main',
        'USDT',
        apiKeys
      );

      if (innerTransfer.code !== '200000') {
        throw new Error(`Inner transfer failed: ${innerTransfer.msg || 'Unknown error'}`);
      }

      // Step 2: Transfer USDT from sub-account MAIN to broker MAIN
      console.log('Transferring USDT from sub-account to broker:', {
        amount: withdrawal.amount_usdt,
        subAccountUid: withdrawal.kucoin_sub_account_uid,
        withdrawalId
      });

      const brokerTransfer = await kucoin.transferBrokerToSub(
        parseFloat(withdrawal.amount_usdt),
        withdrawal.kucoin_sub_account_uid,
        'IN',    // Direction: IN = sub-account to broker
        'USDT',  // Currency
        'MAIN',  // Broker account type
        'MAIN'   // Sub-account type
      );

      if (brokerTransfer.code !== '200000') {
        throw new Error(`Broker transfer failed: ${brokerTransfer.msg || 'Unknown error'}`);
      }

      console.log('USDT transfer completed:', {
        kucoinOrderId: brokerTransfer.data?.orderId,
        amount: withdrawal.amount_usdt
      });

      // Step 3: Unlock funds (reduce locked_balance_usdt)
      console.log('Unlocking funds:', {
        userId: withdrawal.user_id,
        amount: withdrawal.amount_usdt
      });

      await client.query(
        'UPDATE users SET locked_balance_usdt = GREATEST(0, locked_balance_usdt - $1) WHERE id = $2',
        [parseFloat(withdrawal.amount_usdt), withdrawal.user_id]
      );

      // Step 4: Update withdrawal as completed
      const result = await client.query(
        `UPDATE withdrawals
         SET status = $1,
             kucoin_transfer_id = $2,
             completed_at = NOW(),
             admin_notes = $3
         WHERE id = $4
         RETURNING *`,
        [
          'completed',
          brokerTransfer.data?.orderId || null,
          admin_notes || null,
          withdrawalId
        ]
      );

      return result.rows[0];
    });

    console.log('Withdrawal completed:', {
      withdrawalId,
      amount_inr: updatedWithdrawal.amount_inr,
      amount_usdt: updatedWithdrawal.amount_usdt,
      kucoin_transfer_id: updatedWithdrawal.kucoin_transfer_id,
      adminId
    });

    return res.status(200).json({
      success: true,
      data: {
        id: updatedWithdrawal.id,
        status: updatedWithdrawal.status,
        amount_usdt: updatedWithdrawal.amount_usdt,
        amount_inr: updatedWithdrawal.amount_inr,
        kucoin_transfer_id: updatedWithdrawal.kucoin_transfer_id,
        completed_at: updatedWithdrawal.completed_at
      }
    });
  } catch (error) {
    console.error('Complete withdrawal error:', error);
    return res.status(500).json({
      success: false,
      error: 'COMPLETE_WITHDRAWAL_FAILED',
      message: error.message || 'Failed to complete withdrawal'
    });
  }
});

/**
 * POST /api/admin/withdrawals/:id/fail
 * Mark a withdrawal as failed (unlocks funds back to user)
 *
 * Body: {
 *   failed_reason: string (required),
 *   admin_notes?: string
 * }
 * Headers: Authorization: Bearer <admin_jwt_token>
 * Returns: { success, data: {...} }
 */
router.post('/:id/fail', verifyAdminJWT, async (req, res) => {
  try {
    const withdrawalId = req.params.id;
    const { failed_reason, admin_notes } = req.body;
    const adminId = req.admin.id;

    // Validate required fields
    if (!failed_reason) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_REASON',
        message: 'failed_reason is required'
      });
    }

    // Get withdrawal details
    const withdrawal = await dbService.queryOne(
      'SELECT * FROM withdrawals WHERE id = $1',
      [withdrawalId]
    );

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        error: 'WITHDRAWAL_NOT_FOUND',
        message: 'Withdrawal not found'
      });
    }

    // Check status is pending
    if (withdrawal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'INVALID_STATUS',
        message: `Cannot fail withdrawal with status: ${withdrawal.status}`
      });
    }

    // Use transaction to atomically unlock funds and fail withdrawal
    const updatedWithdrawal = await dbService.transaction(async (client) => {
      // Unlock the funds
      console.log('Unlocking funds for failed withdrawal:', {
        userId: withdrawal.user_id,
        amount: withdrawal.amount_usdt
      });

      await client.query(
        'UPDATE users SET locked_balance_usdt = GREATEST(0, locked_balance_usdt - $1) WHERE id = $2',
        [parseFloat(withdrawal.amount_usdt), withdrawal.user_id]
      );

      // Update withdrawal status
      const result = await client.query(
        `UPDATE withdrawals
         SET status = $1,
             failed_reason = $2,
             admin_notes = $3,
             completed_at = NOW()
         WHERE id = $4
         RETURNING *`,
        ['failed', failed_reason, admin_notes || null, withdrawalId]
      );

      return result.rows[0];
    });

    console.log('Withdrawal marked as failed:', {
      withdrawalId,
      failed_reason,
      adminId
    });

    return res.status(200).json({
      success: true,
      data: {
        id: updatedWithdrawal.id,
        status: updatedWithdrawal.status,
        failed_reason: updatedWithdrawal.failed_reason
      }
    });
  } catch (error) {
    console.error('Fail withdrawal error:', error);
    return res.status(500).json({
      success: false,
      error: 'FAIL_WITHDRAWAL_FAILED',
      message: 'Failed to mark withdrawal as failed'
    });
  }
});

module.exports = router;
