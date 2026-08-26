const db = require('./db.service');
const kucoin = require('./kucoin.service');

/**
 * Polling Service
 *
 * Background service that runs every 10 seconds to check and update pending trade orders.
 * Queries the database for pending trades, checks their status on KuCoin, and updates
 * the database when orders are filled or cancelled.
 *
 * Usage:
 *   const polling = require('./services/polling.service');
 *   polling.startPolling();  // Start on server initialization
 *   polling.stopPolling();   // Stop on server shutdown
 */

let pollingInterval = null;

/**
 * Start the polling service
 * Runs immediately on startup, then every 10 seconds
 */
async function startPolling() {
  if (pollingInterval) {
    console.log('Polling service already running');
    return;
  }

  console.log('Starting polling service (10s interval)...');

  // Run immediately on startup
  await pollPendingOrders();

  // Then run every 10 seconds
  pollingInterval = setInterval(async () => {
    await pollPendingOrders();
  }, 10000);
}

/**
 * Stop the polling service
 * Used for graceful shutdown
 */
function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    console.log('Polling service stopped');
  }
}

/**
 * Main polling function
 * Queries all pending trades and updates their status based on KuCoin order status
 */
async function pollPendingOrders() {
  try {
    // Get all pending trades
    const pendingTrades = await db.queryMany(
      'SELECT * FROM trades WHERE status = $1',
      ['pending']
    );

    if (pendingTrades.length === 0) {
      return; // No pending orders to process
    }

    console.log(`Polling: Found ${pendingTrades.length} pending order(s)`);

    // Process each trade
    for (const trade of pendingTrades) {
      try {
        // Get user's KuCoin API keys
        const user = await db.queryOne(
          'SELECT kucoin_api_key, kucoin_api_secret, kucoin_api_passphrase FROM users WHERE id = $1',
          [trade.user_id]
        );

        if (!user) {
          console.log(`Polling: User ${trade.user_id} not found for trade ${trade.id}`);
          continue;
        }

        if (!user.kucoin_api_key || !user.kucoin_api_secret || !user.kucoin_api_passphrase) {
          console.log(`Polling: KuCoin API keys not found for user ${trade.user_id}, trade ${trade.id}`);
          continue;
        }

        const apiKeys = {
          apiKey: user.kucoin_api_key,
          apiSecret: user.kucoin_api_secret,
          apiPassphrase: user.kucoin_api_passphrase
        };

        // Check order status on KuCoin
        const orderStatus = await kucoin.getOrderStatus(trade.kucoin_order_id, apiKeys);

        // If 400 error, order likely filled instantly (HF market orders)
        if (orderStatus.code === '400000' || orderStatus.code?.startsWith('4')) {
          console.log(`Polling: Order ${trade.kucoin_order_id} not found in active orders - likely filled instantly (HF market order)`);

          // Try to find it in filled orders
          const token = await db.queryOne(
            'SELECT kucoin_symbol FROM tokens WHERE symbol = $1',
            [trade.token_symbol]
          );

          if (token) {
            const filledOrders = await kucoin.getFilledOrders(token.kucoin_symbol, apiKeys);

            if (filledOrders.code === '200000' && filledOrders.data?.items) {
              // Look for our order in the filled list
              const ourOrder = filledOrders.data.items.find(o => o.id === trade.kucoin_order_id);

              if (ourOrder) {
                // Found it! Mark as filled with actual data
                await db.query(
                  `UPDATE trades SET
                    status = $1,
                    filled_at = NOW()
                  WHERE id = $2`,
                  ['filled', trade.id]
                );

                const price = parseFloat(ourOrder.dealFunds) / parseFloat(ourOrder.dealSize);
                console.log(`Polling: Trade #${trade.id} filled (from filled orders) - ${trade.token_symbol} ${trade.side} ${trade.quantity} @ ${price.toFixed(2)} USDT`);
                continue;
              }
            }
          }

          // Couldn't find it in filled orders, but 400 error usually means it's already done
          // Mark as filled anyway (HF market orders fill instantly)
          await db.query(
            `UPDATE trades SET
              status = $1,
              filled_at = NOW()
            WHERE id = $2`,
            ['filled', trade.id]
          );
          console.log(`Polling: Trade #${trade.id} marked as filled (HF market order, instant fill assumed)`);
          continue;
        }

        if (orderStatus.code !== "200000") {
          console.log(`Polling: Failed to get status for order ${trade.kucoin_order_id} - ${orderStatus.msg || 'Unknown error'}`);
          continue;
        }

        const order = orderStatus.data;

        // Update trade based on status
        if (order.status === 'done' && parseFloat(order.dealSize) > 0) {
          // Order filled successfully - update with actual execution data
          await db.query(
            `UPDATE trades SET
              status = $1,
              filled_at = NOW()
            WHERE id = $2`,
            ['filled', trade.id]
          );

          const price = parseFloat(order.dealFunds) / parseFloat(order.dealSize);
          console.log(`Polling: Trade #${trade.id} filled - ${trade.token_symbol} ${trade.side} ${trade.quantity} @ ${price.toFixed(2)} USDT`);
        } else if (order.cancelExist || order.status === 'cancelled') {
          // Order cancelled
          await db.query(
            'UPDATE trades SET status = $1 WHERE id = $2',
            ['cancelled', trade.id]
          );

          console.log(`Polling: Trade #${trade.id} cancelled - ${trade.symbol} ${trade.side}`);
        } else if (order.status === 'active') {
          // Order still pending, no update needed
          // Silent - don't spam logs for active orders
        } else {
          // Unknown status - log for debugging
          console.log(`Polling: Trade #${trade.id} has unknown status: ${order.status}`);
        }
      } catch (error) {
        console.error(`Polling: Error processing trade ${trade.id}:`, error.message);
        // Continue processing other trades even if one fails
      }
    }
  } catch (error) {
    console.error('Polling: Error polling pending orders:', error);
  }
}

/**
 * Get INR to USDT conversion rate from admin_config
 * @returns {Promise<number>} Conversion rate (defaults to 83.5 if not found)
 */
async function getINRConversionRate() {
  try {
    const config = await db.queryOne(
      "SELECT value FROM admin_config WHERE key = 'inr_to_usdt_rate'"
    );
    return config ? parseFloat(config.value) : 83.5; // Default fallback
  } catch (error) {
    console.error('Polling: Error fetching INR conversion rate:', error.message);
    return 83.5; // Default fallback on error
  }
}

module.exports = {
  startPolling,
  stopPolling
};
