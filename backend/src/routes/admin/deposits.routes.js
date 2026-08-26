const express = require('express');
const router = express.Router();
const dbService = require('../../services/db.service');
const kucoin = require('../../services/kucoin.service');
const { verifyAdminJWT } = require('../../middleware/admin-auth');

/**
 * GET /api/admin/deposits/pending-approval
 * List all manual bank transfer deposits awaiting admin approval (status = 'pending_approval')
 *
 * Headers: Authorization: Bearer <admin_jwt_token>
 * Returns: { success, deposits: [...] }
 */
router.get('/pending-approval', verifyAdminJWT, async (req, res) => {
  try {
    console.log('Fetching manual deposits awaiting approval');

    const deposits = await dbService.queryMany(
      `SELECT
        d.id,
        d.user_id,
        d.amount_inr,
        d.estimated_usdt,
        d.payment_method,
        d.utr_number,
        d.cashfree_order_id,
        d.requested_at,
        u.full_name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        u.kucoin_sub_account_uid
       FROM deposits d
       JOIN users u ON d.user_id = u.id
       WHERE d.status = $1 AND d.payment_method = $2
       ORDER BY d.requested_at ASC
       LIMIT 100`,
      ['pending_approval', 'bank_transfer']
    );

    console.log(`Found ${deposits.length} manual deposits awaiting approval`);

    return res.status(200).json({
      success: true,
      deposits: deposits
    });
  } catch (error) {
    console.error('List pending approval deposits error:', error);
    return res.status(500).json({
      success: false,
      error: 'LIST_PENDING_APPROVAL_FAILED',
      message: 'Failed to list pending approval deposits'
    });
  }
});

/**
 * POST /api/admin/deposits/:id/approve
 * Approve a manual bank transfer deposit
 *
 * After verifying UTR in bank statement, admin approves the deposit which:
 * 1. Changes status from 'pending_approval' → 'paid'
 * 2. Admin can then transfer USDT using the existing /transfer endpoint
 *
 * Headers: Authorization: Bearer <admin_jwt_token>
 * Returns: { success, message, deposit: {...} }
 */
router.post('/:id/approve', verifyAdminJWT, async (req, res) => {
  try {
    const depositId = req.params.id;
    const adminId = req.admin.id;

    console.log('Approving manual deposit:', { depositId, adminId });

    // Get deposit details
    const deposit = await dbService.queryOne(
      `SELECT
        d.*,
        u.email as user_email,
        u.full_name as user_name
       FROM deposits d
       JOIN users u ON d.user_id = u.id
       WHERE d.id = $1`,
      [depositId]
    );

    if (!deposit) {
      return res.status(404).json({
        success: false,
        error: 'DEPOSIT_NOT_FOUND',
        message: 'Deposit not found'
      });
    }

    // Verify deposit is pending approval
    if (deposit.status !== 'pending_approval') {
      return res.status(400).json({
        success: false,
        error: 'INVALID_STATUS',
        message: `Cannot approve deposit with status: ${deposit.status}. Only 'pending_approval' deposits can be approved.`
      });
    }

    // Verify it's a manual bank transfer
    if (deposit.payment_method !== 'bank_transfer') {
      return res.status(400).json({
        success: false,
        error: 'INVALID_PAYMENT_METHOD',
        message: 'Only bank_transfer deposits can be approved through this endpoint'
      });
    }

    // Update status to 'paid'
    const updatedDeposit = await dbService.queryOne(
      `UPDATE deposits
       SET status = $1, paid_at = NOW()
       WHERE id = $2
       RETURNING *`,
      ['paid', depositId]
    );

    console.log('✅ Manual deposit approved:', {
      depositId,
      user: deposit.user_email,
      amount_inr: deposit.amount_inr,
      utr_number: deposit.utr_number
    });

    return res.status(200).json({
      success: true,
      message: 'Deposit approved successfully. Now transfer USDT using /transfer endpoint.',
      deposit: {
        id: updatedDeposit.id,
        status: updatedDeposit.status,
        amount_inr: updatedDeposit.amount_inr,
        estimated_usdt: updatedDeposit.estimated_usdt,
        utr_number: updatedDeposit.utr_number,
        paid_at: updatedDeposit.paid_at,
        user_email: deposit.user_email,
        user_name: deposit.user_name
      }
    });
  } catch (error) {
    console.error('❌ Approve deposit error:', error);
    return res.status(500).json({
      success: false,
      error: 'APPROVE_FAILED',
      message: error.message || 'Failed to approve deposit'
    });
  }
});

/**
 * POST /api/admin/deposits/:id/reject
 * Reject a manual bank transfer deposit
 *
 * Body: { reason: string }
 * Headers: Authorization: Bearer <admin_jwt_token>
 * Returns: { success, message, deposit: {...} }
 */
router.post('/:id/reject', verifyAdminJWT, async (req, res) => {
  try {
    const depositId = req.params.id;
    const { reason } = req.body;
    const adminId = req.admin.id;

    console.log('Rejecting manual deposit:', { depositId, reason, adminId });

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_REASON',
        message: 'Rejection reason is required'
      });
    }

    // Get deposit details
    const deposit = await dbService.queryOne(
      `SELECT
        d.*,
        u.email as user_email,
        u.full_name as user_name
       FROM deposits d
       JOIN users u ON d.user_id = u.id
       WHERE d.id = $1`,
      [depositId]
    );

    if (!deposit) {
      return res.status(404).json({
        success: false,
        error: 'DEPOSIT_NOT_FOUND',
        message: 'Deposit not found'
      });
    }

    // Verify deposit is pending approval
    if (deposit.status !== 'pending_approval') {
      return res.status(400).json({
        success: false,
        error: 'INVALID_STATUS',
        message: `Cannot reject deposit with status: ${deposit.status}. Only 'pending_approval' deposits can be rejected.`
      });
    }

    // Update status to 'rejected'
    const updatedDeposit = await dbService.queryOne(
      `UPDATE deposits
       SET status = $1, admin_rejection_reason = $2
       WHERE id = $3
       RETURNING *`,
      ['rejected', reason.trim(), depositId]
    );

    console.log('✅ Manual deposit rejected:', {
      depositId,
      user: deposit.user_email,
      amount_inr: deposit.amount_inr,
      reason: reason.trim()
    });

    return res.status(200).json({
      success: true,
      message: 'Deposit rejected successfully',
      deposit: {
        id: updatedDeposit.id,
        status: updatedDeposit.status,
        amount_inr: updatedDeposit.amount_inr,
        admin_rejection_reason: updatedDeposit.admin_rejection_reason,
        user_email: deposit.user_email,
        user_name: deposit.user_name
      }
    });
  } catch (error) {
    console.error('❌ Reject deposit error:', error);
    return res.status(500).json({
      success: false,
      error: 'REJECT_FAILED',
      message: error.message || 'Failed to reject deposit'
    });
  }
});

/**
 * GET /api/admin/deposits/pending
 * List all deposits awaiting USDT transfer (status = 'paid')
 *
 * These deposits have been paid by users via Cashfree but USDT has not yet been transferred
 * to their KuCoin sub-accounts. Admin needs to review and transfer USDT manually.
 *
 * Headers: Authorization: Bearer <admin_jwt_token>
 * Returns: { success, deposits: [...] }
 */
router.get('/pending', verifyAdminJWT, async (req, res) => {
  try {
    console.log('Fetching pending deposits for admin review');

    const deposits = await dbService.queryMany(
      `SELECT
        d.id,
        d.user_id,
        d.amount_inr,
        d.estimated_usdt,
        d.payment_method,
        d.utr_number,
        d.cashfree_order_id,
        d.cashfree_payment_id,
        d.requested_at,
        d.paid_at,
        u.full_name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        u.kucoin_sub_account_uid
       FROM deposits d
       JOIN users u ON d.user_id = u.id
       WHERE d.status = $1
       ORDER BY d.paid_at ASC
       LIMIT 100`,
      ['paid']
    );

    console.log(`Found ${deposits.length} pending deposits awaiting USDT transfer`);

    return res.status(200).json({
      success: true,
      deposits: deposits
    });
  } catch (error) {
    console.error('List pending deposits error:', error);
    return res.status(500).json({
      success: false,
      error: 'LIST_PENDING_FAILED',
      message: 'Failed to list pending deposits'
    });
  }
});

/**
 * POST /api/admin/deposits/:id/transfer
 * Transfer USDT to user's sub-account after payment confirmed
 *
 * This route completes the deposit flow:
 * 1. User paid INR via Cashfree (status = 'paid')
 * 2. Admin verifies payment and clicks "Transfer USDT"
 * 3. System transfers USDT: Broker Main → Sub-account Main → Sub-account Trade
 * 4. User can now trade with the USDT in their Trade account
 *
 * Body: {
 *   amount_usdt: number,  // Can adjust from estimated_usdt if needed
 *   admin_notes?: string  // Optional admin notes
 * }
 * Headers: Authorization: Bearer <admin_jwt_token>
 * Returns: { success, message, deposit: {...} }
 */
router.post('/:id/transfer', verifyAdminJWT, async (req, res) => {
  try {
    const depositId = req.params.id;
    const { amount_usdt, admin_notes } = req.body;
    const adminId = req.admin.id;

    console.log('Processing deposit transfer:', {
      depositId,
      amount_usdt,
      adminId
    });

    // Validate amount
    if (!amount_usdt || amount_usdt <= 0) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_AMOUNT',
        message: 'amount_usdt must be greater than 0'
      });
    }

    // Get deposit and user details
    const deposit = await dbService.queryOne(
      `SELECT
        d.*,
        u.kucoin_sub_account_uid,
        u.kucoin_api_key,
        u.kucoin_api_secret,
        u.kucoin_api_passphrase,
        u.full_name as user_name,
        u.email as user_email
       FROM deposits d
       JOIN users u ON d.user_id = u.id
       WHERE d.id = $1`,
      [depositId]
    );

    if (!deposit) {
      return res.status(404).json({
        success: false,
        error: 'DEPOSIT_NOT_FOUND',
        message: 'Deposit not found'
      });
    }

    // Verify deposit status is 'paid'
    if (deposit.status !== 'paid') {
      return res.status(400).json({
        success: false,
        error: 'INVALID_STATUS',
        message: `Cannot transfer USDT for deposit with status: ${deposit.status}. Only 'paid' deposits can be processed.`
      });
    }

    // Verify user has KuCoin account set up
    if (!deposit.kucoin_sub_account_uid || !deposit.kucoin_api_key || !deposit.kucoin_api_secret || !deposit.kucoin_api_passphrase) {
      return res.status(400).json({
        success: false,
        error: 'KUCOIN_NOT_SETUP',
        message: 'User does not have KuCoin sub-account set up. Complete onboarding first.'
      });
    }

    console.log('Starting USDT transfer for deposit:', {
      depositId,
      user: deposit.user_email,
      kucoin_sub_account_uid: deposit.kucoin_sub_account_uid,
      amount_usdt
    });

    // Execute transfer in transaction to ensure atomicity
    const updatedDeposit = await dbService.transaction(async (client) => {
      // Prepare sub-account API keys
      const apiKeys = {
        apiKey: deposit.kucoin_api_key,
        apiSecret: deposit.kucoin_api_secret,
        apiPassphrase: deposit.kucoin_api_passphrase
      };

      // ====================================================================
      // STEP 1: Transfer USDT from Broker Main → Sub-account Main
      // ====================================================================
      console.log('Step 1: Transferring USDT from Broker Main to Sub-account Main:', {
        amount: amount_usdt,
        uid: deposit.kucoin_sub_account_uid,
        direction: 'OUT'
      });

      const brokerToSubTransfer = await kucoin.transferBrokerToSub(
        parseFloat(amount_usdt),
        deposit.kucoin_sub_account_uid,
        'OUT',       // direction: OUT = broker → sub
        'USDT',      // currency
        'MAIN',      // broker account type (accountType)
        'MAIN'       // sub-account type (specialAccountType)
      );

      if (brokerToSubTransfer.code !== '200000') {
        throw new Error(`Broker to sub-account transfer failed: ${brokerToSubTransfer.msg || 'Unknown error'}`);
      }

      console.log('✅ Step 1 complete. Broker → Sub-account Main transfer orderId:', brokerToSubTransfer.data.orderId);

      // ====================================================================
      // STEP 2: Transfer USDT from Sub-account Main → Sub-account Trade
      // ====================================================================
      console.log('Step 2: Transferring USDT from Sub-account Main to Trade account:', {
        amount: amount_usdt,
        uid: deposit.kucoin_sub_account_uid
      });

      const innerTransfer = await kucoin.transferInnerAccount(
        parseFloat(amount_usdt),
        'main',     // from
        'trade',    // to
        'USDT',     // currency
        apiKeys
      );

      if (innerTransfer.code !== '200000') {
        throw new Error(`Inner account transfer failed: ${innerTransfer.msg || 'Unknown error'}`);
      }

      console.log('✅ Step 2 complete. Main → Trade transfer orderId:', innerTransfer.data.orderId);

      // ====================================================================
      // STEP 3: Update database - mark deposit as completed
      // ====================================================================
      console.log('Step 3: Updating deposit status to completed');

      const result = await client.query(
        `UPDATE deposits
         SET status = $1,
             actual_usdt = $2,
             completed_at = NOW(),
             kucoin_transfer_id = $3
         WHERE id = $4
         RETURNING *`,
        [
          'completed',
          amount_usdt,
          brokerToSubTransfer.data.orderId,  // Store KuCoin transfer order ID
          depositId
        ]
      );

      console.log('✅ Step 3 complete. Deposit marked as completed');

      return result.rows[0];
    });

    console.log('✅ Deposit transfer completed successfully:', {
      depositId,
      user: deposit.user_email,
      amount_inr: deposit.amount_inr,
      actual_usdt: updatedDeposit.actual_usdt,
      completed_at: updatedDeposit.completed_at
    });

    return res.status(200).json({
      success: true,
      message: 'USDT transferred successfully',
      deposit: {
        id: updatedDeposit.id,
        status: updatedDeposit.status,
        actual_usdt: updatedDeposit.actual_usdt,
        completed_at: updatedDeposit.completed_at,
        user_email: deposit.user_email,
        user_name: deposit.user_name
      }
    });
  } catch (error) {
    console.error('❌ Transfer USDT error:', error);
    return res.status(500).json({
      success: false,
      error: 'TRANSFER_FAILED',
      message: error.message || 'Failed to transfer USDT to user account'
    });
  }
});

module.exports = router;
