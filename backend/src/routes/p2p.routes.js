const express = require('express');
const router = express.Router();
const dbService = require('../services/db.service');
const kucoin = require('../services/kucoin.service');
const { verifyFirebaseToken, requireAuth, requireKYC } = require('../middleware/auth');

// Minimum transfer amounts by currency (in base units)
const MIN_AMOUNTS = {
  BTC: 0.0001,
  ETH: 0.001,
  USDT: 1,
  USDC: 1,
  SOL: 0.01,
  ADA: 1,
  DEFAULT: 0.001
};

/**
 * GET /api/p2p/lookup
 * Look up a recipient by email or phone number
 *
 * Query params:
 *   type: 'email' | 'phone'
 *   value: the email or phone number
 *
 * Returns: { found, recipient: { id, name, email/phone preview } }
 * NOTE: Only returns users with approved KYC
 */
router.get('/lookup', verifyFirebaseToken, requireAuth, requireKYC, async (req, res) => {
  try {
    const { type, value } = req.query;
    const senderId = req.user.id;

    // Validate input
    if (!type || !value) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_PARAMS',
        message: 'Both type and value are required'
      });
    }

    if (!['email', 'phone'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_TYPE',
        message: 'Type must be "email" or "phone"'
      });
    }

    // Build query based on type
    const column = type === 'email' ? 'email' : 'phone';
    const searchValue = value.trim().toLowerCase();

    // Find user with matching email/phone AND approved KYC
    const recipient = await dbService.queryOne(
      `SELECT id, full_name, email, phone, kucoin_sub_account_uid, kyc_status
       FROM users
       WHERE LOWER(${column}) = $1
         AND kyc_status = 'approved'
         AND kucoin_sub_account_uid IS NOT NULL`,
      [searchValue]
    );

    if (!recipient) {
      return res.status(200).json({
        success: true,
        data: {
          found: false,
          message: 'No KYC-verified Sikka user found with this ' + type
        }
      });
    }

    // Prevent self-transfer
    if (recipient.id === senderId) {
      return res.status(400).json({
        success: false,
        error: 'SELF_TRANSFER',
        message: 'Cannot transfer to yourself'
      });
    }

    // Mask sensitive info for privacy
    const maskedEmail = recipient.email
      ? recipient.email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
      : null;
    const maskedPhone = recipient.phone
      ? recipient.phone.slice(0, 4) + '****' + recipient.phone.slice(-2)
      : null;

    return res.status(200).json({
      success: true,
      data: {
        found: true,
        recipient: {
          id: recipient.id,
          name: recipient.full_name || 'Sikka User',
          email: type === 'email' ? maskedEmail : null,
          phone: type === 'phone' ? maskedPhone : null,
          lookupType: type,
          lookupValue: searchValue
        }
      }
    });
  } catch (error) {
    console.error('P2P lookup error:', error);
    return res.status(500).json({
      success: false,
      error: 'LOOKUP_FAILED',
      message: 'Failed to look up recipient'
    });
  }
});

/**
 * POST /api/p2p/transfer
 * Initiate a P2P transfer to another Sikka user
 *
 * Body: {
 *   recipientId: UUID of recipient,
 *   currency: 'BTC' | 'ETH' | 'USDT' | etc.,
 *   amount: number,
 *   note: optional string
 * }
 */
router.post('/transfer', verifyFirebaseToken, requireAuth, requireKYC, async (req, res) => {
  try {
    const { recipientId, currency, amount, note } = req.body;
    const sender = req.user;

    // === Validation ===

    // Required fields
    if (!recipientId || !currency || !amount) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_FIELDS',
        message: 'recipientId, currency, and amount are required'
      });
    }

    // Validate amount
    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_AMOUNT',
        message: 'Amount must be a positive number'
      });
    }

    // Check minimum amount
    const minAmount = MIN_AMOUNTS[currency.toUpperCase()] || MIN_AMOUNTS.DEFAULT;
    if (transferAmount < minAmount) {
      return res.status(400).json({
        success: false,
        error: 'BELOW_MINIMUM',
        message: `Minimum transfer amount for ${currency} is ${minAmount}`
      });
    }

    // Prevent self-transfer
    if (recipientId === sender.id) {
      return res.status(400).json({
        success: false,
        error: 'SELF_TRANSFER',
        message: 'Cannot transfer to yourself'
      });
    }

    // Get recipient details (including API keys for final transfer step)
    const recipient = await dbService.queryOne(
      `SELECT id, full_name, email, phone, kucoin_sub_account_uid, kyc_status,
              kucoin_api_key, kucoin_api_secret, kucoin_api_passphrase
       FROM users WHERE id = $1`,
      [recipientId]
    );

    if (!recipient) {
      return res.status(404).json({
        success: false,
        error: 'RECIPIENT_NOT_FOUND',
        message: 'Recipient not found'
      });
    }

    // Verify recipient has approved KYC and API keys
    if (recipient.kyc_status !== 'approved' || !recipient.kucoin_sub_account_uid) {
      return res.status(400).json({
        success: false,
        error: 'RECIPIENT_NOT_VERIFIED',
        message: 'Recipient has not completed KYC verification'
      });
    }

    // Verify recipient has KuCoin API keys (needed for final transfer step)
    if (!recipient.kucoin_api_key || !recipient.kucoin_api_secret || !recipient.kucoin_api_passphrase) {
      return res.status(400).json({
        success: false,
        error: 'RECIPIENT_NOT_SETUP',
        message: 'Recipient account is not fully set up'
      });
    }

    // Prepare recipient's API keys for final transfer step
    const recipientApiKeys = {
      apiKey: recipient.kucoin_api_key,
      apiSecret: recipient.kucoin_api_secret,
      apiPassphrase: recipient.kucoin_api_passphrase
    };

    // Verify sender has KuCoin API keys
    if (!sender.kucoin_api_key || !sender.kucoin_api_secret || !sender.kucoin_api_passphrase) {
      return res.status(400).json({
        success: false,
        error: 'SENDER_NOT_SETUP',
        message: 'Your account is not fully set up. Please contact support.'
      });
    }

    // Prepare sender's API keys
    const senderApiKeys = {
      apiKey: sender.kucoin_api_key,
      apiSecret: sender.kucoin_api_secret,
      apiPassphrase: sender.kucoin_api_passphrase
    };

    // Check sender's balance for this currency
    const balanceResponse = await kucoin.getBalance(
      currency.toUpperCase(),
      'trade',
      senderApiKeys
    );

    if (balanceResponse.code !== '200000') {
      return res.status(500).json({
        success: false,
        error: 'BALANCE_CHECK_FAILED',
        message: 'Failed to check your balance'
      });
    }

    const availableBalance = balanceResponse.data && balanceResponse.data.length > 0
      ? parseFloat(balanceResponse.data[0].available)
      : 0;

    if (availableBalance < transferAmount) {
      return res.status(400).json({
        success: false,
        error: 'INSUFFICIENT_BALANCE',
        message: `Insufficient ${currency} balance. Available: ${availableBalance.toFixed(8)}, Required: ${transferAmount}`
      });
    }

    // Generate unique client order ID
    const clientOid = `sikka_p2p_${sender.id.substring(0, 8)}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Determine recipient lookup info for logging
    const recipientLookupType = 'uid';
    const recipientLookupValue = recipient.email || recipient.phone || recipient.id;

    // === Execute Transfer ===

    // Use database transaction for atomicity
    const transfer = await dbService.transaction(async (client) => {
      // Create transfer record first (processing status)
      const insertResult = await client.query(
        `INSERT INTO p2p_transfers (
          sender_id, sender_kucoin_uid,
          recipient_id, recipient_kucoin_uid,
          recipient_lookup_type, recipient_lookup_value,
          currency, amount,
          kucoin_client_oid,
          status, note
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          sender.id, sender.kucoin_sub_account_uid,
          recipient.id, recipient.kucoin_sub_account_uid,
          recipientLookupType, recipientLookupValue,
          currency.toUpperCase(), transferAmount,
          clientOid,
          'processing', note || null
        ]
      );

      const transferRecord = insertResult.rows[0];

      // =====================================================================
      // 4-STEP BROKER TRANSFER (sub-accounts lack withdrawal permissions)
      // =====================================================================
      // Step 1: Sender TRADE → Sender MAIN (using sender's keys)
      // Step 2: Sender MAIN → Broker MAIN (using broker keys, direction IN)
      // Step 3: Broker MAIN → Recipient MAIN (using broker keys, direction OUT)
      // Step 4: Recipient MAIN → Recipient TRADE (using recipient's keys)
      // =====================================================================

      const currencyUpper = currency.toUpperCase();
      const amountStr = transferAmount.toString();
      const transferSteps = [];

      try {
        // STEP 1: Sender TRADE → Sender MAIN
        console.log(`[P2P Step 1] Sender TRADE → MAIN: ${amountStr} ${currencyUpper}`);
        const step1 = await kucoin.transferInnerAccount(
          transferAmount,
          'trade',
          'main',
          currencyUpper,
          senderApiKeys,
          `${clientOid}_step1`
        );

        if (step1.code !== '200000') {
          throw new Error(`Step 1 failed: ${step1.msg || 'Sender TRADE→MAIN transfer failed'}`);
        }
        transferSteps.push({ step: 1, orderId: step1.data?.orderId });
        console.log(`[P2P Step 1] Success: orderId=${step1.data?.orderId}`);

        // STEP 2: Sender MAIN → Broker MAIN
        console.log(`[P2P Step 2] Sender MAIN → Broker: ${amountStr} ${currencyUpper}`);
        const step2 = await kucoin.transferBrokerToSub(
          transferAmount,
          sender.kucoin_sub_account_uid,
          'IN',        // Direction: IN = sub-account to broker
          currencyUpper,
          'MAIN',      // Broker account type
          'MAIN',      // Sub-account type
          `${clientOid}_step2`
        );

        if (step2.code !== '200000') {
          throw new Error(`Step 2 failed: ${step2.msg || 'Sender MAIN→Broker transfer failed'}`);
        }
        transferSteps.push({ step: 2, orderId: step2.data?.orderId });
        console.log(`[P2P Step 2] Success: orderId=${step2.data?.orderId}`);

        // STEP 3: Broker MAIN → Recipient MAIN
        console.log(`[P2P Step 3] Broker → Recipient MAIN: ${amountStr} ${currencyUpper}`);
        const step3 = await kucoin.transferBrokerToSub(
          transferAmount,
          recipient.kucoin_sub_account_uid,
          'OUT',       // Direction: OUT = broker to sub-account
          currencyUpper,
          'MAIN',      // Broker account type
          'MAIN',      // Sub-account type
          `${clientOid}_step3`
        );

        if (step3.code !== '200000') {
          throw new Error(`Step 3 failed: ${step3.msg || 'Broker→Recipient transfer failed'}`);
        }
        transferSteps.push({ step: 3, orderId: step3.data?.orderId });
        console.log(`[P2P Step 3] Success: orderId=${step3.data?.orderId}`);

        // STEP 4: Recipient MAIN → Recipient TRADE
        console.log(`[P2P Step 4] Recipient MAIN → TRADE: ${amountStr} ${currencyUpper}`);
        const step4 = await kucoin.transferInnerAccount(
          transferAmount,
          'main',
          'trade',
          currencyUpper,
          recipientApiKeys,
          `${clientOid}_step4`
        );

        if (step4.code !== '200000') {
          throw new Error(`Step 4 failed: ${step4.msg || 'Recipient MAIN→TRADE transfer failed'}`);
        }
        transferSteps.push({ step: 4, orderId: step4.data?.orderId });
        console.log(`[P2P Step 4] Success: orderId=${step4.data?.orderId}`);

      } catch (stepError) {
        // Update transfer to failed status with step info
        await client.query(
          `UPDATE p2p_transfers
           SET status = 'failed', error_message = $1
           WHERE id = $2`,
          [stepError.message, transferRecord.id]
        );
        throw stepError;
      }

      // All steps succeeded - update transfer as completed
      const allOrderIds = transferSteps.map(s => s.orderId).join(',');
      await client.query(
        `UPDATE p2p_transfers
         SET status = 'completed',
             kucoin_withdrawal_id = $1,
             completed_at = NOW()
         WHERE id = $2`,
        [allOrderIds, transferRecord.id]
      );

      return {
        ...transferRecord,
        status: 'completed',
        kucoin_withdrawal_id: allOrderIds,
        completed_at: new Date()
      };
    });

    console.log('P2P Transfer completed:', {
      transferId: transfer.id,
      senderId: sender.id,
      recipientId: recipient.id,
      currency: currency.toUpperCase(),
      amount: transferAmount,
      kucoinOrderIds: transfer.kucoin_withdrawal_id
    });

    return res.status(201).json({
      success: true,
      message: 'Transfer completed successfully',
      data: {
        id: transfer.id,
        currency: transfer.currency,
        amount: parseFloat(transfer.amount).toFixed(8),
        recipientName: recipient.full_name || 'Sikka User',
        status: transfer.status,
        fee: 0, // Internal transfers are free
        created_at: transfer.created_at,
        completed_at: transfer.completed_at
      }
    });

  } catch (error) {
    console.error('P2P transfer error:', error);
    return res.status(500).json({
      success: false,
      error: 'TRANSFER_FAILED',
      message: error.message || 'Failed to complete transfer'
    });
  }
});

/**
 * GET /api/p2p/history
 * Get P2P transfer history (sent and received)
 *
 * Query params:
 *   direction: 'sent' | 'received' | 'all' (default: 'all')
 *   currency: filter by currency (optional)
 *   limit: number (default: 50, max: 100)
 *   offset: number (default: 0)
 */
router.get('/history', verifyFirebaseToken, requireAuth, requireKYC, async (req, res) => {
  try {
    const userId = req.user.id;
    const direction = req.query.direction || 'all';
    const currency = req.query.currency?.toUpperCase();
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;

    // Build query based on direction
    let whereClause = '';
    const params = [userId];
    let paramIndex = 2;

    if (direction === 'sent') {
      whereClause = 'WHERE t.sender_id = $1';
    } else if (direction === 'received') {
      whereClause = 'WHERE t.recipient_id = $1';
    } else {
      whereClause = 'WHERE (t.sender_id = $1 OR t.recipient_id = $1)';
    }

    // Add currency filter if provided
    if (currency) {
      whereClause += ` AND t.currency = $${paramIndex}`;
      params.push(currency);
      paramIndex++;
    }

    // Add status filter (exclude cancelled)
    whereClause += ` AND t.status != 'cancelled'`;

    // Add pagination
    params.push(limit, offset);

    const transfers = await dbService.queryMany(
      `SELECT
        t.id,
        t.currency,
        t.amount,
        t.status,
        t.note,
        t.created_at,
        t.completed_at,
        t.sender_id,
        t.recipient_id,
        sender.full_name as sender_name,
        sender.email as sender_email,
        recipient.full_name as recipient_name,
        recipient.email as recipient_email,
        CASE WHEN t.sender_id = $1 THEN 'sent' ELSE 'received' END as direction
       FROM p2p_transfers t
       JOIN users sender ON t.sender_id = sender.id
       JOIN users recipient ON t.recipient_id = recipient.id
       ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    // Get total count for pagination
    const countParams = [userId];
    let countWhere = '';
    if (direction === 'sent') {
      countWhere = 'WHERE sender_id = $1';
    } else if (direction === 'received') {
      countWhere = 'WHERE recipient_id = $1';
    } else {
      countWhere = 'WHERE (sender_id = $1 OR recipient_id = $1)';
    }
    if (currency) {
      countWhere += ` AND currency = $2`;
      countParams.push(currency);
    }
    countWhere += ` AND status != 'cancelled'`;

    const countResult = await dbService.queryOne(
      `SELECT COUNT(*) as total FROM p2p_transfers ${countWhere}`,
      countParams
    );

    // Format response
    const formattedTransfers = transfers.map(t => ({
      id: t.id,
      direction: t.direction,
      currency: t.currency,
      amount: parseFloat(t.amount).toFixed(8),
      status: t.status,
      note: t.note,
      counterparty: {
        name: (t.direction === 'sent' ? t.recipient_name : t.sender_name) || 'Sikka User',
        email: t.direction === 'sent'
          ? t.recipient_email?.replace(/(.{2})(.*)(@.*)/, '$1***$3')
          : t.sender_email?.replace(/(.{2})(.*)(@.*)/, '$1***$3')
      },
      fee: 0, // Always free
      created_at: t.created_at,
      completed_at: t.completed_at
    }));

    return res.status(200).json({
      success: true,
      data: {
        transfers: formattedTransfers,
        pagination: {
          limit,
          offset,
          total: parseInt(countResult?.total || 0)
        }
      }
    });

  } catch (error) {
    console.error('P2P history error:', error);
    return res.status(500).json({
      success: false,
      error: 'HISTORY_FAILED',
      message: 'Failed to fetch transfer history'
    });
  }
});

/**
 * GET /api/p2p/transfer/:id
 * Get details of a specific P2P transfer
 */
router.get('/transfer/:id', verifyFirebaseToken, requireAuth, requireKYC, async (req, res) => {
  try {
    const transferId = req.params.id;
    const userId = req.user.id;

    const transfer = await dbService.queryOne(
      `SELECT
        t.*,
        sender.full_name as sender_name,
        sender.email as sender_email,
        recipient.full_name as recipient_name,
        recipient.email as recipient_email
       FROM p2p_transfers t
       JOIN users sender ON t.sender_id = sender.id
       JOIN users recipient ON t.recipient_id = recipient.id
       WHERE t.id = $1 AND (t.sender_id = $2 OR t.recipient_id = $2)`,
      [transferId, userId]
    );

    if (!transfer) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Transfer not found'
      });
    }

    const direction = transfer.sender_id === userId ? 'sent' : 'received';

    return res.status(200).json({
      success: true,
      data: {
        id: transfer.id,
        direction,
        currency: transfer.currency,
        amount: parseFloat(transfer.amount).toFixed(8),
        status: transfer.status,
        note: transfer.note,
        fee: 0,
        sender: {
          name: transfer.sender_name,
          email: transfer.sender_email?.replace(/(.{2})(.*)(@.*)/, '$1***$3')
        },
        recipient: {
          name: transfer.recipient_name,
          email: transfer.recipient_email?.replace(/(.{2})(.*)(@.*)/, '$1***$3')
        },
        kucoin_withdrawal_id: transfer.kucoin_withdrawal_id,
        error_message: transfer.error_message,
        created_at: transfer.created_at,
        completed_at: transfer.completed_at
      }
    });

  } catch (error) {
    console.error('P2P transfer detail error:', error);
    return res.status(500).json({
      success: false,
      error: 'DETAIL_FAILED',
      message: 'Failed to fetch transfer details'
    });
  }
});

module.exports = router;
