const axios = require('axios');
const crypto = require('crypto');
const cashfreeConfig = require('../config/cashfree');

/**
 * Cashfree payment service
 */
const cashfreeService = {
  /**
   * Create a payment order in Cashfree
   * @param {number} amount - Order amount in INR
   * @param {string} orderId - Unique order ID
   * @param {string} customerId - Customer ID (user ID)
   * @param {string} customerPhone - Customer phone number
   * @param {string} customerEmail - Customer email address
   * @returns {Promise<Object>} Payment order details (payment_session_id, order_id, payment_link)
   */
  async createPaymentOrder(amount, orderId, customerId, customerPhone, customerEmail) {
    try {
      // Prepare request payload
      const payload = {
        order_id: orderId,
        order_amount: amount,
        order_currency: 'INR',
        customer_details: {
          customer_id: customerId,
          customer_phone: customerPhone,
          customer_email: customerEmail,
        },
        order_meta: {
          return_url: cashfreeConfig.returnUrl,
          notify_url: cashfreeConfig.webhookUrl,
        },
      };

      // Make API request to Cashfree
      const response = await axios.post(
        `${cashfreeConfig.baseUrl}/orders`,
        payload,
        {
          headers: {
            'x-api-version': cashfreeConfig.apiVersion,
            'x-client-id': cashfreeConfig.appId,
            'x-client-secret': cashfreeConfig.secretKey,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Cashfree payment order created:', {
        orderId: response.data.order_id,
        paymentSessionId: response.data.payment_session_id,
      });

      // Return relevant payment details
      return {
        payment_session_id: response.data.payment_session_id,
        order_id: response.data.order_id,
        payment_link: response.data.payment_link,
      };
    } catch (error) {
      console.error('Cashfree create payment order error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw error;
    }
  },

  /**
   * Verify Cashfree webhook signature
   * @param {string} rawBody - Raw request body as string
   * @param {string} signature - Signature from x-webhook-signature header
   * @param {string} timestamp - Timestamp from x-webhook-timestamp header
   * @returns {boolean} True if signature is valid, false otherwise
   */
  verifyWebhookSignature(rawBody, signature, timestamp) {
    try {
      // Verify HMAC-SHA256 signature
      // Cashfree signature format: HMAC-SHA256(timestamp + rawBody)

      // TEMPORARY: Skip signature verification if webhook secret is the placeholder
      if (cashfreeConfig.webhookSecret === 'cashfree_webhook_dev_secret_change_in_prod') {
        console.log('⚠️ WARNING: Using placeholder webhook secret - skipping signature verification for testing');
        console.log('⚠️ Please configure real webhook secret in Cashfree dashboard and update .env');
        return true;
      }

      const signatureData = timestamp + rawBody;

      const computedSignature = crypto
        .createHmac('sha256', cashfreeConfig.webhookSecret)
        .update(signatureData)
        .digest('base64');

      const isValid = computedSignature === signature;

      console.log('Cashfree webhook signature verification:', {
        isValid,
        timestamp,
        providedSignature: signature.substring(0, 20) + '...',
        computedSignature: computedSignature.substring(0, 20) + '...'
      });

      return isValid;
    } catch (error) {
      console.error('Cashfree webhook signature verification error:', error);
      return false;
    }
  },

  /**
   * Verify payment status with Cashfree API (double-check after webhook)
   * @param {string} orderId - Order ID to verify
   * @returns {Promise<Object>} Payment details from Cashfree
   */
  async verifyPaymentStatus(orderId) {
    try {
      // Make API request to Cashfree to get order details
      const response = await axios.get(
        `${cashfreeConfig.baseUrl}/orders/${orderId}`,
        {
          headers: {
            'x-api-version': cashfreeConfig.apiVersion,
            'x-client-id': cashfreeConfig.appId,
            'x-client-secret': cashfreeConfig.secretKey,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Cashfree payment status verified:', {
        orderId: response.data.order_id,
        orderStatus: response.data.order_status,
        orderAmount: response.data.order_amount,
      });

      // Return payment details
      return {
        order_id: response.data.order_id,
        order_status: response.data.order_status,
        order_amount: response.data.order_amount,
        payment_time: response.data.payment_time,
        payment_details: response.data.payment_details,
      };
    } catch (error) {
      console.error('Cashfree verify payment status error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw error;
    }
  },

  /**
   * Generate checkout URL for web SDK hosted checkout
   * @param {string} sessionId - Payment session ID from Cashfree
   * @param {string} orderId - Order ID
   * @param {number} amount - Amount in INR
   * @returns {string} Full checkout URL
   */
  generateCheckoutUrl(sessionId, orderId, amount) {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
    const checkoutUrl = `${backendUrl}/checkout?session=${sessionId}&order_id=${orderId}&amount=${amount}`;

    console.log('Generated checkout URL:', {
      orderId,
      amount,
      url: checkoutUrl,
    });

    return checkoutUrl;
  },

  /**
   * Get authorization token for Payout API
   * @returns {Promise<string>} Bearer token for subsequent API calls
   */
  async getAuthToken() {
    try {
      const response = await axios.post(
        `${cashfreeConfig.payoutBaseUrl}/authorize`,
        {},
        {
          headers: cashfreeConfig.getPayoutHeaders(),
        }
      );

      console.log('Cashfree payout auth token obtained:', {
        status: response.data.status,
        subCode: response.data.subCode,
      });

      // Note: Cashfree v1 authorize endpoint validates credentials but doesn't return a token
      // The X-Client-Id and X-Client-Secret are used directly in subsequent requests
      // We return a success indicator rather than a token
      if (response.data.status === 'SUCCESS' && response.data.subCode === '200') {
        return 'AUTHORIZED';
      }

      throw new Error(`Auth failed: ${response.data.message || 'Unknown error'}`);
    } catch (error) {
      console.error('Cashfree payout auth error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw error;
    }
  },

  /**
   * Initiate payout to user's bank account using Direct Transfer API
   * @param {string} transferId - Unique transfer ID (use withdrawal.id)
   * @param {number} amount - Amount in INR
   * @param {Object} bankAccount - { account_holder_name, account_number, ifsc_code, bank_name }
   * @param {string} email - User email
   * @param {string} phone - User phone (10 digits)
   * @param {string} remarks - Transfer remarks
   * @returns {Promise<Object>} { status, referenceId, utr, transferId }
   */
  async initiatePayout(transferId, amount, bankAccount, email, phone, remarks = 'Withdrawal from Sikka Exchange') {
    try {
      // Validate inputs
      if (!transferId || !amount || !bankAccount || !email || !phone) {
        throw new Error('Missing required parameters for payout');
      }

      if (amount < 1) {
        throw new Error('Amount must be at least INR 1.00');
      }

      // Format phone number (remove country code if present)
      let formattedPhone = phone.replace(/\D/g, ''); // Remove non-digits
      if (formattedPhone.startsWith('91') && formattedPhone.length === 12) {
        formattedPhone = formattedPhone.substring(2); // Remove +91
      }

      // Prepare request payload for Direct Transfer API
      const payload = {
        amount: parseFloat(amount.toFixed(2)), // Ensure 2 decimal places
        transferId: transferId,
        transferMode: 'banktransfer', // Default mode for bank transfers
        remarks: remarks,
        beneDetails: {
          name: bankAccount.account_holder_name,
          email: email,
          phone: formattedPhone,
          bankAccount: bankAccount.account_number,
          ifsc: bankAccount.ifsc_code,
          address1: 'India', // Required field
        }
      };

      console.log('Initiating Cashfree payout:', {
        transferId,
        amount,
        bankAccount: `${bankAccount.account_number} (${bankAccount.ifsc_code})`,
        email,
        phone: formattedPhone,
      });

      // Make API request to Cashfree Direct Transfer endpoint
      const response = await axios.post(
        `${cashfreeConfig.payoutBaseUrl}/directTransfer`,
        payload,
        {
          headers: {
            ...cashfreeConfig.getPayoutHeaders(),
            'Authorization': `Bearer ${cashfreeConfig.appId}:${cashfreeConfig.secretKey}`, // Some versions require this
          },
        }
      );

      console.log('Cashfree payout initiated:', {
        status: response.data.status,
        subCode: response.data.subCode,
        message: response.data.message,
        referenceId: response.data.data?.referenceId,
        utr: response.data.data?.utr,
      });

      // Return payout details
      return {
        status: response.data.status, // SUCCESS, PENDING, ERROR
        subCode: response.data.subCode,
        message: response.data.message,
        referenceId: response.data.data?.referenceId || null,
        utr: response.data.data?.utr || null,
        transferId: transferId,
        acknowledged: response.data.data?.acknowledged || 0,
      };
    } catch (error) {
      console.error('Cashfree payout initiation error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        transferId,
      });

      // Return error details in a structured format
      return {
        status: 'ERROR',
        subCode: error.response?.data?.subCode || '500',
        message: error.response?.data?.message || error.message,
        referenceId: null,
        utr: null,
        transferId: transferId,
        error: error.response?.data || error.message,
      };
    }
  },

  /**
   * Get payout status from Cashfree
   * @param {string} transferId - Transfer ID
   * @returns {Promise<Object>} { status, utr, referenceId, processedOn, addedOn, amount }
   */
  async getPayoutStatus(transferId) {
    try {
      if (!transferId) {
        throw new Error('transferId is required');
      }

      console.log('Fetching Cashfree payout status for transferId:', transferId);

      // Make API request to get transfer status
      const response = await axios.get(
        `${cashfreeConfig.payoutBaseUrl.replace('/v1', '/v1.2')}/getTransferStatus`,
        {
          params: {
            transferId: transferId,
          },
          headers: {
            ...cashfreeConfig.getPayoutHeaders(),
            'Authorization': `Bearer ${cashfreeConfig.appId}:${cashfreeConfig.secretKey}`,
          },
        }
      );

      console.log('Cashfree payout status retrieved:', {
        status: response.data.status,
        subCode: response.data.subCode,
        transferStatus: response.data.data?.transfer?.status,
        utr: response.data.data?.transfer?.utr,
      });

      const transfer = response.data.data?.transfer || {};

      // Return transfer details
      return {
        status: response.data.status, // API call status
        subCode: response.data.subCode,
        message: response.data.message,
        transfer: {
          transferId: transfer.transferId || transferId,
          status: transfer.status, // SUCCESS, PENDING, FAILED, REJECTED, REVERSED
          amount: transfer.amount,
          utr: transfer.utr || null,
          referenceId: transfer.referenceId || null,
          beneId: transfer.beneId || null,
          addedOn: transfer.addedOn || null,
          processedOn: transfer.processedOn || null,
          acknowledged: transfer.acknowledged || 0,
          reason: transfer.reason || null, // Failure reason if failed
        }
      };
    } catch (error) {
      console.error('Cashfree get payout status error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        transferId,
      });

      return {
        status: 'ERROR',
        subCode: error.response?.data?.subCode || '500',
        message: error.response?.data?.message || error.message,
        transfer: {
          transferId: transferId,
          status: 'UNKNOWN',
          error: error.response?.data || error.message,
        }
      };
    }
  },
};

module.exports = cashfreeService;
