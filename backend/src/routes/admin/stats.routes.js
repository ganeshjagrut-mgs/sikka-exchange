const express = require('express');
const router = express.Router();
const { verifyAdminJWT } = require('../../middleware/admin-auth');
const dbService = require('../../services/db.service');
const kucoin = require('../../services/kucoin.service');

/**
 * GET /api/admin/stats/overview
 * Get dashboard overview statistics
 *
 * Returns:
 *   - totalUsers
 *   - pendingKYC
 *   - approvedKYC
 *   - totalDepositsUSD (sum of deposits - now in USD)
 *   - totalWithdrawalsUSD (sum of withdrawals - now in USD)
 *   - pendingWithdrawals (count where status = 'pending')
 *   - totalTrades
 *   - platformRevenueUSD
 *   - brokerBalance
 *
 * Headers: Authorization: Bearer <admin_jwt_token>
 * Returns: { success, data: {...} }
 */
router.get('/overview', verifyAdminJWT, async (req, res) => {
  try {
    // Get all stats in parallel for better performance
    const [
      totalUsersResult,
      pendingKYCResult,
      approvedKYCResult,
      totalDepositsResult,
      totalWithdrawalsResult,
      pendingWithdrawalsResult,
      totalTradesResult,
      platformRevenueResult,
      brokerMainBalance,
      brokerTradeBalance
    ] = await Promise.all([
      // Total users
      dbService.queryOne('SELECT COUNT(*) as count FROM users'),

      // Pending KYC
      dbService.queryOne(`SELECT COUNT(*) as count FROM users WHERE kyc_status = 'pending'`),

      // Approved KYC
      dbService.queryOne(`SELECT COUNT(*) as count FROM users WHERE kyc_status = 'approved'`),

      // Total deposits (sum of paid deposits - now stored in USD)
      dbService.queryOne(`SELECT COALESCE(SUM(estimated_usdt), 0) as total FROM deposits WHERE status = 'paid'`),

      // Total withdrawals (sum of completed withdrawals - now in USD)
      dbService.queryOne(`SELECT COALESCE(SUM(amount_usdt), 0) as total FROM withdrawals WHERE status = 'completed'`),

      // Pending withdrawals (count)
      dbService.queryOne(`SELECT COUNT(*) as count FROM withdrawals WHERE status = 'pending'`),

      // Total trades (count)
      dbService.queryOne('SELECT COUNT(*) as count FROM trades'),

      // Platform revenue (sum of fees from filled trades - using amount_usdt)
      dbService.queryOne(`SELECT COALESCE(SUM(amount_usdt * 0.001), 0) as total FROM trades WHERE status = 'filled'`),

      // Broker MAIN balance from KuCoin
      kucoin.getBalance('USDT', 'main', null).catch(err => {
        console.error('Failed to get broker MAIN balance:', err.message);
        return { code: '500000', data: [] };
      }),

      // Broker TRADE balance from KuCoin
      kucoin.getBalance('USDT', 'trade', null).catch(err => {
        console.error('Failed to get broker TRADE balance:', err.message);
        return { code: '500000', data: [] };
      })
    ]);

    // Calculate total broker balance from MAIN + TRADE accounts
    let brokerBalanceUSD = 0;
    let brokerMainUSD = 0;
    let brokerTradeUSD = 0;

    if (brokerMainBalance.code === '200000' && brokerMainBalance.data) {
      brokerMainBalance.data.forEach(acc => {
        brokerMainUSD += parseFloat(acc.balance || 0);
      });
      brokerBalanceUSD += brokerMainUSD;
    }

    if (brokerTradeBalance.code === '200000' && brokerTradeBalance.data) {
      brokerTradeBalance.data.forEach(acc => {
        brokerTradeUSD += parseFloat(acc.balance || 0);
      });
      brokerBalanceUSD += brokerTradeUSD;
    }

    const stats = {
      totalUsers: parseInt(totalUsersResult.count) || 0,
      pendingKYC: parseInt(pendingKYCResult.count) || 0,
      approvedKYC: parseInt(approvedKYCResult.count) || 0,
      totalDepositsUSD: parseFloat(totalDepositsResult.total) || 0,
      totalWithdrawalsUSD: parseFloat(totalWithdrawalsResult.total) || 0,
      pendingWithdrawals: parseInt(pendingWithdrawalsResult.count) || 0,
      totalTrades: parseInt(totalTradesResult.count) || 0,
      platformRevenueUSD: parseFloat(platformRevenueResult.total) || 0,
      brokerBalance: {
        usd: parseFloat(brokerBalanceUSD.toFixed(2)),
        usdt: parseFloat(brokerBalanceUSD.toFixed(2)),  // Alias for backward compatibility
        main: parseFloat(brokerMainUSD.toFixed(2)),
        trade: parseFloat(brokerTradeUSD.toFixed(2))
      }
    };

    console.log('Admin stats overview retrieved:', {
      adminId: req.admin.id,
      timestamp: new Date().toISOString(),
      brokerBalanceUSD: stats.brokerBalance.usd
    });

    return res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get stats overview error:', error);
    return res.status(500).json({
      success: false,
      error: 'GET_STATS_FAILED',
      message: 'Failed to get statistics overview'
    });
  }
});

module.exports = router;
