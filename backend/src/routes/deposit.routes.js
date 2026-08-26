const express = require('express');
const router = express.Router();
const dbService = require('../services/db.service');
const cashfreeService = require('../services/cashfree.service');
const { verifyFirebaseToken, requireAuth } = require('../middleware/auth');

/**
 * POST /api/deposits/initiate
 * Initiate a new deposit (USDT amount)
 *
 * Body: { amount: number (USDT/USD) }
 * Headers: Authorization: Bearer <firebase_token>
 * Returns: { depositId, orderId, paymentSessionId, checkoutUrl, amount }
 */
router.post('/initiate', verifyFirebaseToken, requireAuth, async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user.id;

    // Validate amount is present (now in USD/USDT)
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_AMOUNT',
        message: 'Amount must be a positive number'
      });
    }

    // Get min/max deposit limits from admin_config (now in USD)
    const minDepositConfig = await dbService.findOne('admin_config', { key: 'min_deposit' });
    const maxDepositConfig = await dbService.findOne('admin_config', { key: 'max_deposit' });

    const minDeposit = minDepositConfig ? parseFloat(minDepositConfig.value) : 10;  // $10 min
    const maxDeposit = maxDepositConfig ? parseFloat(maxDepositConfig.value) : 10000;  // $10000 max

    // Validate amount within limits
    if (amount < minDeposit) {
      return res.status(400).json({
        success: false,
        error: 'AMOUNT_TOO_LOW',
        message: `Minimum deposit amount is $${minDeposit}`
      });
    }

    if (amount > maxDeposit) {
      return res.status(400).json({
        success: false,
        error: 'AMOUNT_TOO_HIGH',
        message: `Maximum deposit amount is $${maxDeposit}`
      });
    }

    // Generate unique order ID
    const orderId = `DEP_${userId}_${Date.now()}`;

    // Insert deposit record with status 'pending'
    // amount_inr column now stores USD value for consistency
    const deposit = await dbService.insert('deposits', {
      user_id: userId,
      amount_inr: amount,  // Now storing USD value
      estimated_usdt: amount,  // Direct USDT amount
      usdt_inr_rate: 1,  // No conversion needed
      status: 'pending',
      cashfree_order_id: orderId,
      requested_at: new Date()
    });

    // Check if mock mode is enabled
    const enablePaymentMock = process.env.ENABLE_PAYMENT_MOCK === 'true';

    let paymentSessionId;
    if (enablePaymentMock) {
      // Mock mode - create mock session
      paymentSessionId = cashfreeService.createMockSession(orderId);
    } else {
      // Real mode - call Cashfree API
      const paymentOrder = await cashfreeService.createPaymentOrder(
        amount,
        orderId,
        userId,
        req.user.phone || '9999999999',
        req.user.email || `user_${userId}@sikka.com`
      );
      paymentSessionId = paymentOrder.payment_session_id;
    }

    // Generate checkout URL
    const checkoutUrl = cashfreeService.generateCheckoutUrl(paymentSessionId, orderId, amount);

    console.log('Deposit initiated:', {
      depositId: deposit.id,
      orderId,
      amountUSD: amount,
      userId,
      mockMode: enablePaymentMock
    });

    return res.status(201).json({
      success: true,
      data: {
        depositId: deposit.id,
        orderId: orderId,
        paymentSessionId: paymentSessionId,
        checkoutUrl: checkoutUrl,
        amountUSD: amount
      }
    });
  } catch (error) {
    console.error('Deposit initiate error:', error);
    return res.status(500).json({
      success: false,
      error: 'DEPOSIT_INITIATE_FAILED',
      message: 'Failed to initiate deposit'
    });
  }
});

/**
 * POST /api/deposits/manual
 * Create a manual bank/wire transfer deposit
 *
 * Body: { amount: number (USDT/USD), reference_number: string }
 * Headers: Authorization: Bearer <firebase_token>
 * Returns: { depositId, orderId, amountUSD, bankDetails }
 */
router.post('/manual', verifyFirebaseToken, requireAuth, async (req, res) => {
  try {
    const { amount, utr_number, reference_number } = req.body;
    const userId = req.user.id;

    // Accept either utr_number or reference_number for backward compatibility
    const refNumber = reference_number || utr_number;

    // Validate amount (now in USD/USDT)
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_AMOUNT',
        message: 'Amount must be a positive number'
      });
    }

    // Validate reference number
    if (!refNumber || typeof refNumber !== 'string' || refNumber.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_REFERENCE',
        message: 'Reference/Transaction number is required'
      });
    }

    // Get min/max deposit limits (now in USD)
    const minDepositConfig = await dbService.findOne('admin_config', { key: 'min_deposit' });
    const maxDepositConfig = await dbService.findOne('admin_config', { key: 'max_deposit' });

    const minDeposit = minDepositConfig ? parseFloat(minDepositConfig.value) : 10;  // $10 min
    const maxDeposit = maxDepositConfig ? parseFloat(maxDepositConfig.value) : 10000;  // $10000 max

    // Validate amount within limits
    if (amount < minDeposit) {
      return res.status(400).json({
        success: false,
        error: 'AMOUNT_TOO_LOW',
        message: `Minimum deposit amount is $${minDeposit}`
      });
    }

    if (amount > maxDeposit) {
      return res.status(400).json({
        success: false,
        error: 'AMOUNT_TOO_HIGH',
        message: `Maximum deposit amount is $${maxDeposit}`
      });
    }

    // Generate unique order ID
    const orderId = `MANUAL_${userId}_${Date.now()}`;

    // Insert deposit record with status 'pending_approval' and payment_method 'bank_transfer'
    // amount_inr column now stores USD value for consistency
    const deposit = await dbService.insert('deposits', {
      user_id: userId,
      amount_inr: amount,  // Now storing USD value
      estimated_usdt: amount,  // Direct USDT amount
      usdt_inr_rate: 1,  // No conversion needed
      status: 'pending_approval',
      payment_method: 'bank_transfer',
      utr_number: refNumber.trim(),
      cashfree_order_id: orderId, // Using this field for unique order ID
      requested_at: new Date()
    });

    console.log('Manual deposit created:', {
      depositId: deposit.id,
      orderId,
      amountUSD: amount,
      reference_number: refNumber.trim(),
      userId
    });

    // Return bank account details for user reference
    const bankDetails = {
      accountName: 'CRYPEXCH TECHNOLOGIES PRIVATE LIMITED',
      accountNumber: '99998855894319',
      ifscCode: 'HDFC0004692',
      accountType: 'Current'
    };

    return res.status(201).json({
      success: true,
      data: {
        depositId: deposit.id,
        orderId: orderId,
        amountUSD: amount,
        reference_number: refNumber.trim(),
        status: 'pending_approval',
        bankDetails: bankDetails,
        message: 'Deposit submitted for admin approval'
      }
    });
  } catch (error) {
    console.error('Manual deposit error:', error);
    return res.status(500).json({
      success: false,
      error: 'MANUAL_DEPOSIT_FAILED',
      message: 'Failed to create manual deposit'
    });
  }
});

/**
 * GET /api/deposits/history
 * Get deposit history for current user
 *
 * Headers: Authorization: Bearer <firebase_token>
 * Returns: Array of deposits
 */
router.get('/history', verifyFirebaseToken, requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Query deposits for user, ordered by most recent first
    const deposits = await dbService.queryMany(
      `SELECT
        id,
        amount_inr,
        estimated_usdt,
        actual_usdt,
        usdt_inr_rate,
        status,
        payment_method,
        utr_number,
        cashfree_order_id,
        cashfree_payment_id,
        requested_at,
        paid_at,
        completed_at,
        admin_rejection_reason
      FROM deposits
      WHERE user_id = $1
      ORDER BY requested_at DESC`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      data: deposits
    });
  } catch (error) {
    console.error('Deposit history error:', error);
    return res.status(500).json({
      success: false,
      error: 'DEPOSIT_HISTORY_FAILED',
      message: 'Failed to fetch deposit history'
    });
  }
});

/**
 * GET /api/deposits/status?order_id=XXX
 * Check deposit status by Cashfree order ID (public endpoint for payment return page polling)
 *
 * Query: order_id (Cashfree order ID)
 * Returns: { status, amount_inr, cashfree_order_id, paid_at }
 */
router.get('/status', async (req, res) => {
  try {
    const { order_id } = req.query;

    if (!order_id) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_ORDER_ID',
        message: 'Missing order_id parameter'
      });
    }

    // Query deposit by cashfree_order_id (no auth required for polling)
    const deposit = await dbService.findOne('deposits', {
      cashfree_order_id: order_id
    });

    if (!deposit) {
      return res.status(404).json({
        success: false,
        error: 'DEPOSIT_NOT_FOUND',
        message: 'Deposit not found'
      });
    }

    return res.status(200).json({
      success: true,
      status: deposit.status,
      amount_inr: deposit.amount_inr,
      cashfree_order_id: deposit.cashfree_order_id,
      paid_at: deposit.paid_at
    });
  } catch (error) {
    console.error('Deposit status check error:', error);
    return res.status(500).json({
      success: false,
      error: 'STATUS_CHECK_FAILED',
      message: 'Failed to check deposit status'
    });
  }
});

/**
 * GET /api/deposits/:id
 * Get a specific deposit by ID
 *
 * Headers: Authorization: Bearer <firebase_token>
 * Returns: Single deposit
 */
router.get('/:id', verifyFirebaseToken, requireAuth, async (req, res) => {
  try {
    const depositId = req.params.id;
    const userId = req.user.id;

    // Query deposit with security check (must belong to user)
    const deposit = await dbService.queryOne(
      `SELECT
        id,
        amount_inr,
        estimated_usdt,
        actual_usdt,
        usdt_inr_rate,
        status,
        payment_method,
        utr_number,
        cashfree_order_id,
        cashfree_payment_id,
        requested_at,
        paid_at,
        completed_at,
        admin_rejection_reason
      FROM deposits
      WHERE id = $1 AND user_id = $2`,
      [depositId, userId]
    );

    if (!deposit) {
      return res.status(404).json({
        success: false,
        error: 'DEPOSIT_NOT_FOUND',
        message: 'Deposit not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: deposit
    });
  } catch (error) {
    console.error('Deposit get error:', error);
    return res.status(500).json({
      success: false,
      error: 'DEPOSIT_GET_FAILED',
      message: 'Failed to fetch deposit'
    });
  }
});

module.exports = router;
