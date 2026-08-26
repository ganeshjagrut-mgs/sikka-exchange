const express = require('express');
const router = express.Router();
const dbService = require('../services/db.service');
const cashfreeService = require('../services/cashfree.service');

/**
 * POST /api/webhooks/cashfree
 * Handle Cashfree payment webhooks
 *
 * IMPORTANT: This route uses raw body parser (configured in server.js)
 * for signature verification. Always return 200 OK to prevent retries.
 *
 * Headers:
 *  - x-webhook-signature: HMAC-SHA256 signature
 *  - x-webhook-timestamp: Timestamp used for signature
 *
 * Body: Cashfree webhook payload (raw JSON)
 */
router.post('/cashfree', async (req, res) => {
  console.log('\n🔔 Cashfree webhook received');

  try {
    // Extract signature and timestamp from headers
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];

    // Get raw body as string for signature verification
    // (req.body will be a Buffer due to express.raw middleware)
    const rawBody = req.body.toString('utf8');

    // Step 1: Verify webhook signature
    if (!signature || !timestamp) {
      console.error('❌ Webhook missing signature or timestamp');
      await logWebhookError(null, null, rawBody, signature, 'missing_signature', 'Missing signature or timestamp');
      return res.status(200).json({ success: true, message: 'Missing signature' });
    }

    const isValidSignature = cashfreeService.verifyWebhookSignature(rawBody, signature, timestamp);
    if (!isValidSignature) {
      console.error('❌ Webhook signature verification failed');
      await logWebhookError(null, null, rawBody, signature, 'invalid_signature', 'Signature verification failed');
      return res.status(200).json({ success: true, message: 'Invalid signature' });
    }

    console.log('✅ Webhook signature verified');

    // Step 2: Parse JSON payload
    let payload;
    try {
      payload = JSON.parse(rawBody);
      console.log('📦 Raw webhook payload:', JSON.stringify(payload, null, 2));
    } catch (parseError) {
      console.error('❌ Webhook payload parse error:', parseError);
      await logWebhookError(null, null, rawBody, signature, 'invalid_json', 'Failed to parse JSON payload');
      return res.status(200).json({ success: true, message: 'Invalid JSON' });
    }

    // Extract webhook data
    // Handle both mock format (data.order_id) and real Cashfree format (data.order.order_id)
    const order_id = payload.data?.order?.order_id || payload.data?.order_id;
    // Real Cashfree sends payment_status in data.payment.payment_status (SUCCESS, FAILED, etc.)
    // We need to convert payment_status to order_status format for consistency
    const payment_status = payload.data?.payment?.payment_status; // Real Cashfree: SUCCESS
    const order_status = payment_status === 'SUCCESS' ? 'PAID' : (payload.data?.order?.order_status || payload.data?.order_status);
    const payment_id = payload.data?.payment?.cf_payment_id || payload.data?.payment_id;

    if (!order_id) {
      console.error('❌ Webhook missing order_id');
      await logWebhookError(null, null, rawBody, signature, 'missing_order_id', 'Missing order_id in payload');
      return res.status(200).json({ success: true, message: 'Missing order_id' });
    }

    console.log('📦 Webhook data:', { order_id, payment_id, order_status });

    // Step 3: Check idempotency (prevent duplicate processing)
    const existingWebhook = await dbService.queryOne(
      `SELECT id, status FROM webhook_logs
       WHERE order_id = $1 AND payment_id = $2 AND status = 'processed'`,
      [order_id, payment_id || 'none']
    );

    if (existingWebhook) {
      console.log('⚠️ Duplicate webhook received (idempotency check), webhook already processed');
      await logWebhook(order_id, payment_id, payload, signature, 'duplicate');
      return res.status(200).json({ success: true, message: 'Duplicate webhook' });
    }

    // Step 4: Log webhook as received
    const webhookLog = await logWebhook(order_id, payment_id, payload, signature, 'received');
    const webhookLogId = webhookLog.id;

    // Step 5: Check if payment is successful
    if (order_status !== 'PAID') {
      console.log(`⚠️ Payment not successful: ${order_status}`);
      await updateWebhookStatus(webhookLogId, 'payment_not_paid', `Payment status: ${order_status}`);
      return res.status(200).json({ success: true, message: 'Payment not successful' });
    }

    // Step 6: Double-verify payment status with Cashfree API
    // (only in production mode, skip in mock mode)
    const enablePaymentMock = process.env.ENABLE_PAYMENT_MOCK === 'true';
    if (!enablePaymentMock) {
      try {
        const paymentVerification = await cashfreeService.verifyPaymentStatus(order_id);
        if (paymentVerification.order_status !== 'PAID') {
          console.error('❌ Payment verification failed - status mismatch');
          await updateWebhookStatus(
            webhookLogId,
            'verification_failed',
            `Cashfree API returned status: ${paymentVerification.order_status}`
          );
          return res.status(200).json({ success: true, message: 'Verification failed' });
        }
        console.log('✅ Payment verified with Cashfree API');
      } catch (verifyError) {
        console.error('❌ Payment verification API error:', verifyError);
        await updateWebhookStatus(
          webhookLogId,
          'verification_failed',
          `Verification API error: ${verifyError.message}`
        );
        return res.status(200).json({ success: true, message: 'Verification API error' });
      }
    }

    // Step 7: Find deposit in database
    const deposit = await dbService.findOne('deposits', { cashfree_order_id: order_id });

    if (!deposit) {
      console.error('❌ Deposit not found for order_id:', order_id);
      await updateWebhookStatus(webhookLogId, 'deposit_not_found', `No deposit found for order_id: ${order_id}`);
      return res.status(200).json({ success: true, message: 'Deposit not found' });
    }

    console.log('📝 Deposit found:', { depositId: deposit.id, userId: deposit.user_id, status: deposit.status });

    // Step 8: Check if deposit already completed (idempotency)
    if (deposit.status === 'completed' || deposit.status === 'paid') {
      console.log('⚠️ Deposit already completed (idempotency check)');
      await updateWebhookStatus(webhookLogId, 'already_completed', 'Deposit already marked as completed');
      return res.status(200).json({ success: true, message: 'Already completed' });
    }

    // Step 9: Update deposit status to 'paid'
    await dbService.updateById('deposits', deposit.id, {
      status: 'paid',
      cashfree_payment_id: payment_id,
      paid_at: new Date()
    });

    console.log('✅ Deposit updated to paid status');

    // Step 10: Credit user wallet (Phase 6 will handle actual USDT transfer)
    // For now, just mark as paid. Actual wallet crediting will be implemented later.
    // When Phase 6 is implemented, this is where we would:
    // - Transfer USDT from broker wallet to user sub-account
    // - Update deposit status to 'completed'
    // - Update actual_usdt and completed_at fields

    // Step 11: Update webhook log to 'processed'
    await updateWebhookStatus(webhookLogId, 'processed', null);

    console.log('✅ Webhook processed successfully\n');

    return res.status(200).json({
      success: true,
      message: 'Webhook processed successfully'
    });
  } catch (error) {
    // Critical: Always return 200 OK even on errors to prevent retries
    console.error('❌ Webhook processing error:', error);

    try {
      // Try to log the error
      await dbService.insert('webhook_logs', {
        webhook_type: 'cashfree_payment',
        order_id: null,
        payment_id: null,
        payload: { error: error.message },
        signature: req.headers['x-webhook-signature'],
        status: 'error',
        error_message: error.message,
        created_at: new Date()
      });
    } catch (logError) {
      console.error('❌ Failed to log webhook error:', logError);
    }

    return res.status(200).json({
      success: true,
      message: 'Webhook error logged'
    });
  }
});

/**
 * Helper: Log webhook to database
 */
async function logWebhook(orderId, paymentId, payload, signature, status) {
  return await dbService.insert('webhook_logs', {
    webhook_type: 'cashfree_payment',
    order_id: orderId,
    payment_id: paymentId || null,
    payload: payload, // Will be stored as JSONB
    signature: signature,
    status: status,
    created_at: new Date()
  });
}

/**
 * Helper: Log webhook error to database
 */
async function logWebhookError(orderId, paymentId, rawBody, signature, status, errorMessage) {
  try {
    let payload = null;
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      payload = { raw: rawBody };
    }

    await dbService.insert('webhook_logs', {
      webhook_type: 'cashfree_payment',
      order_id: orderId,
      payment_id: paymentId,
      payload: payload,
      signature: signature,
      status: status,
      error_message: errorMessage,
      created_at: new Date()
    });
  } catch (error) {
    console.error('Failed to log webhook error:', error);
  }
}

/**
 * Helper: Update webhook log status
 */
async function updateWebhookStatus(webhookLogId, status, errorMessage = null) {
  await dbService.updateById('webhook_logs', webhookLogId, {
    status: status,
    error_message: errorMessage
  });
}

module.exports = router;
