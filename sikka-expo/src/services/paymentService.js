/**
 * Payment Service - Cashfree Integration
 *
 * Handles payment processing with platform-specific implementations:
 * - Native SDK for iOS/Android (requires development build)
 * - Web fallback for browser-based testing
 */

import { Platform } from 'react-native';

// Conditionally import native SDK modules
// These imports will be stripped out by Metro for web platform
let CFPaymentGatewayService, CFEnvironment, CFSession;

try {
  if (Platform.OS !== 'web') {
    // Only require on native platforms
    const SDK = require('react-native-cashfree-pg-sdk');
    const Contract = require('cashfree-pg-api-contract');

    CFPaymentGatewayService = SDK.CFPaymentGatewayService;
    CFEnvironment = Contract.CFEnvironment;
    CFSession = Contract.CFSession;
  }
} catch (error) {
  // Silently handle missing native modules
  console.warn('[PaymentService] Native SDK not available');
}

class PaymentService {
  constructor() {
    this.isNativeSDKAvailable = Platform.OS !== 'web' && CFPaymentGatewayService;

    console.log(`[PaymentService] Initialized for ${Platform.OS}`);
    console.log(`[PaymentService] Native SDK available: ${this.isNativeSDKAvailable}`);
  }

  /**
   * Initialize payment and open checkout
   *
   * @param {Object} paymentDetails - Payment details from backend
   * @param {string} paymentDetails.orderId - Cashfree order ID
   * @param {string} paymentDetails.paymentSessionId - Cashfree payment session ID
   * @param {string} paymentDetails.paymentUrl - Web payment URL (fallback)
   * @param {number} paymentDetails.amount - Payment amount
   * @returns {Promise<Object>} Payment result
   */
  async initiatePayment(paymentDetails) {
    const { orderId, paymentSessionId, paymentUrl, amount } = paymentDetails;

    console.log(`[PaymentService] Initiating payment for ₹${amount}`);
    console.log(`[PaymentService] Order ID: ${orderId}`);
    console.log(`[PaymentService] Session ID: ${paymentSessionId}`);

    // Use native SDK if available (iOS/Android with development build)
    if (this.isNativeSDKAvailable && paymentSessionId) {
      return await this._initiateNativePayment(orderId, paymentSessionId);
    }

    // Fallback to web payment (browser redirect)
    console.log('[PaymentService] Using web fallback (browser redirect)');
    return {
      method: 'web',
      paymentUrl: paymentUrl,
      requiresManualRedirect: true,
      message: 'Please complete payment in the browser window'
    };
  }

  /**
   * Native SDK payment flow (iOS/Android)
   * @private
   */
  async _initiateNativePayment(orderId, paymentSessionId) {
    try {
      console.log('[PaymentService] Starting native SDK payment');

      // Create CF Session
      const environment = __DEV__ ? CFEnvironment.SANDBOX : CFEnvironment.PRODUCTION;
      const session = new CFSession(paymentSessionId, orderId, environment);

      console.log(`[PaymentService] CF Session created (${__DEV__ ? 'SANDBOX' : 'PRODUCTION'})`);

      // Set up payment callback
      const callbackPromise = new Promise((resolve, reject) => {
        const callback = {
          onVerify: async (verifyOrderId) => {
            console.log('[PaymentService] Payment completed, verifying:', verifyOrderId);

            // Payment completed, needs verification from backend
            resolve({
              success: true,
              orderId: verifyOrderId,
              status: 'COMPLETED',
              message: 'Payment completed successfully',
              requiresVerification: true
            });
          },

          onError: (error, errorOrderId) => {
            console.error('[PaymentService] Payment error:', error?.getMessage?.() || error, errorOrderId);

            reject({
              success: false,
              orderId: errorOrderId,
              status: 'FAILED',
              error: error?.getMessage?.() || 'Payment failed',
              message: 'Payment was not completed'
            });
          }
        };

        // Set callback before initiating payment
        CFPaymentGatewayService.setCallback(callback);
      });

      // Initiate payment using native SDK
      // This opens the Cashfree native payment UI
      CFPaymentGatewayService.doWebPayment(session);

      console.log('[PaymentService] Native payment UI launched');

      // Wait for callback
      const result = await callbackPromise;

      // Clean up callback
      this._removeCallback();

      return result;

    } catch (error) {
      console.error('[PaymentService] Native payment error:', error);

      // Clean up callback on error
      this._removeCallback();

      throw {
        success: false,
        status: 'ERROR',
        error: error.message || 'Failed to initialize payment',
        message: 'Payment initialization failed'
      };
    }
  }

  /**
   * Remove payment callback (cleanup)
   * @private
   */
  _removeCallback() {
    if (this.isNativeSDKAvailable) {
      try {
        CFPaymentGatewayService.removeCallback();
        console.log('[PaymentService] Callback removed');
      } catch (error) {
        console.warn('[PaymentService] Error removing callback:', error);
      }
    }
  }

  /**
   * Get payment capabilities for current platform
   * @returns {Object} Platform capabilities
   */
  getCapabilities() {
    return {
      platform: Platform.OS,
      nativeSDK: this.isNativeSDKAvailable,
      webFallback: true,
      requiresDevelopmentBuild: Platform.OS !== 'web' && !this.isNativeSDKAvailable
    };
  }
}

// Export singleton instance
const paymentService = new PaymentService();
export default paymentService;
