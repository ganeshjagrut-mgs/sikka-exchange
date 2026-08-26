const express = require('express');
const router = express.Router();

/**
 * GET /checkout
 * HTML page with Cashfree JS SDK for payment
 * Handles both mock mode and real Cashfree checkout
 *
 * Query params:
 * - session (required): Cashfree payment session ID or mock session ID (starts with "mock_")
 * - order_id (required): Deposit order ID
 * - amount (required): Payment amount in INR
 */
router.get('/checkout', async (req, res) => {
  try {
    const { session, order_id, amount } = req.query;

    // Validate required query params
    if (!session || !order_id || !amount) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Error - Invalid Request</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 20px;
            }
            .container {
              background: white;
              border-radius: 12px;
              padding: 40px;
              max-width: 400px;
              width: 100%;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
              text-align: center;
            }
            h1 {
              color: #e74c3c;
              margin-bottom: 20px;
              font-size: 24px;
            }
            p {
              color: #555;
              line-height: 1.6;
              margin-bottom: 10px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Invalid Request</h1>
            <p>Missing required parameters: session, order_id, and amount</p>
            <p>Please return to the app and try again.</p>
          </div>
        </body>
        </html>
      `);
    }

    // Detect mock mode
    const isMockMode = session.startsWith('mock_');

    // Return HTML page with Cashfree JS SDK
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Checkout</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
          }
          .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            max-width: 400px;
            width: 100%;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            text-align: center;
          }
          .loading-spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 24px;
          }
          p {
            color: #666;
            line-height: 1.6;
          }
          .amount {
            font-size: 32px;
            font-weight: bold;
            color: #667eea;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="loading-spinner"></div>
          <h1>Initializing payment...</h1>
          <p class="amount">₹${amount}</p>
          <p>Order ID: ${order_id}</p>
          ${isMockMode ? '<p style="color: #e67e22; font-weight: bold;">Mock Mode - Auto-redirecting</p>' : ''}
        </div>

        ${!isMockMode ? '<script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>' : ''}
        <script>
          const session = "${session}";
          const orderId = "${order_id}";
          const amount = "${amount}";
          const isMockMode = ${isMockMode};

          // Mock mode: Auto-redirect to success after 2 seconds
          if (isMockMode) {
            console.log("Mock mode detected, auto-redirecting to success page...");
            setTimeout(() => {
              window.location.href = '/api/payment/return?order_id=' + orderId + '&order_status=SUCCESS&order_amount=' + amount;
            }, 2000);
          }
          // Real mode: Initialize Cashfree checkout
          else {
            console.log("Initializing Cashfree checkout...");

            // Initialize Cashfree SDK
            const cashfree = new Cashfree({ mode: "sandbox" }); // Use "production" for live

            // Start checkout
            cashfree.checkout({
              paymentSessionId: session,
              redirectTarget: "_self",
              returnUrl: window.location.origin + '/api/payment/return?order_id=' + orderId
            }).then(() => {
              console.log("Checkout initialized successfully");
            }).catch((error) => {
              console.error("Checkout initialization failed:", error);
              alert("Payment initialization failed. Please try again.");
            });
          }
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Checkout page error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
          }
          .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            max-width: 400px;
            width: 100%;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            text-align: center;
          }
          h1 {
            color: #e74c3c;
            margin-bottom: 20px;
            font-size: 24px;
          }
          p {
            color: #555;
            line-height: 1.6;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Something went wrong</h1>
          <p>An error occurred while loading the payment page.</p>
          <p>Please return to the app and try again.</p>
        </div>
      </body>
      </html>
    `);
  }
});

/**
 * GET /api/payment/return
 * Success/failure page after payment completion
 * User is redirected here by Cashfree after payment
 *
 * Query params:
 * - order_id (required): Deposit order ID
 * - order_status (optional): SUCCESS or FAILED
 * - order_amount (optional): Payment amount
 */
router.get('/api/payment/return', async (req, res) => {
  try {
    const { order_id, order_status, order_amount } = req.query;

    // Validate order_id
    if (!order_id) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Error - Invalid Request</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 20px;
            }
            .container {
              background: white;
              border-radius: 12px;
              padding: 40px;
              max-width: 400px;
              width: 100%;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
              text-align: center;
            }
            h1 {
              color: #e74c3c;
              margin-bottom: 20px;
              font-size: 24px;
            }
            p {
              color: #555;
              line-height: 1.6;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Invalid Request</h1>
            <p>Missing order ID parameter.</p>
            <p>Please return to the app and try again.</p>
          </div>
        </body>
        </html>
      `);
    }

    // Determine page content based on order_status
    let statusHTML = '';
    let backgroundColor = '#667eea'; // Default gradient

    if (order_status === 'SUCCESS') {
      // Success page
      statusHTML = `
        <div class="icon success-icon">✓</div>
        <h1 style="color: #27ae60;">Payment Successful!</h1>
        <p class="order-id">Order ID: ${order_id}</p>
        ${order_amount ? `<p class="amount">Amount: ₹${order_amount}</p>` : ''}
        <p class="message">Your wallet will be credited shortly.</p>
        <p class="message">You can now return to the app.</p>
      `;
      backgroundColor = '#27ae60';
    } else if (order_status === 'FAILED') {
      // Failure page
      statusHTML = `
        <div class="icon failure-icon">✗</div>
        <h1 style="color: #e74c3c;">Payment Failed</h1>
        <p class="order-id">Order ID: ${order_id}</p>
        <p class="message">Please try again or contact support if the issue persists.</p>
        <p class="message">Return to the app to retry.</p>
      `;
      backgroundColor = '#e74c3c';
    } else {
      // Processing/Unknown status - Simple message instead of polling
      statusHTML = `
        <div class="icon" style="background: #667eea; font-size: 40px;">✓</div>
        <h1 style="color: #667eea;">Payment Submitted</h1>
        <p class="order-id">Order ID: ${order_id}</p>
        <p class="message" style="font-size: 18px; font-weight: 600; margin-top: 20px;">Please go back to your app</p>
        <p class="message">Your payment status will be updated shortly.</p>
        <p class="message" style="margin-top: 20px; color: #999;">You can close this window now.</p>
      `;
      backgroundColor = '#667eea';
    }

    // Return HTML page
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment ${order_status || 'Processing'}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, ${backgroundColor} 0%, #764ba2 100%);
            padding: 20px;
          }
          .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            max-width: 400px;
            width: 100%;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            text-align: center;
          }
          .icon {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 48px;
            font-weight: bold;
            margin: 0 auto 20px;
            color: white;
          }
          .success-icon {
            background: #27ae60;
          }
          .failure-icon {
            background: #e74c3c;
          }
          .loading-spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            width: 60px;
            height: 60px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          h1 {
            margin-bottom: 20px;
            font-size: 28px;
          }
          .order-id {
            color: #666;
            font-family: monospace;
            font-size: 14px;
            margin: 10px 0;
            padding: 10px;
            background: #f5f5f5;
            border-radius: 6px;
          }
          .amount {
            font-size: 32px;
            font-weight: bold;
            color: #667eea;
            margin: 20px 0;
          }
          .message {
            color: #555;
            line-height: 1.6;
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <div class="container" id="status-container">
          ${statusHTML}
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Payment return page error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
          }
          .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            max-width: 400px;
            width: 100%;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            text-align: center;
          }
          h1 {
            color: #e74c3c;
            margin-bottom: 20px;
            font-size: 24px;
          }
          p {
            color: #555;
            line-height: 1.6;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Something went wrong</h1>
          <p>An error occurred while processing your payment result.</p>
          <p>Please return to the app and check your transaction history.</p>
        </div>
      </body>
      </html>
    `);
  }
});

module.exports = router;
