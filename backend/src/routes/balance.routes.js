const express = require('express');
const router = express.Router();
const dbService = require('../services/db.service');
const kucoin = require('../services/kucoin.service');
const { verifyFirebaseToken, requireAuth, requireKYC } = require('../middleware/auth');

/**
 * GET /api/balance
 * Get user's current balances from KuCoin (MAIN and TRADE accounts)
 *
 * Headers: Authorization: Bearer <firebase_token>
 * Returns: { main: { balances, totalValueUSD }, trade: { balances, totalValueUSD } }
 */
router.get('/', verifyFirebaseToken, requireAuth, requireKYC, async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user has KuCoin API keys
    if (!req.user.kucoin_api_key || !req.user.kucoin_api_secret || !req.user.kucoin_api_passphrase) {
      return res.status(400).json({
        success: false,
        error: 'KYC not completed or API keys not created'
      });
    }

    // Prepare API keys object
    const apiKeys = {
      apiKey: req.user.kucoin_api_key,
      apiSecret: req.user.kucoin_api_secret,
      apiPassphrase: req.user.kucoin_api_passphrase
    };

    // Get all active tokens from database (dynamic list)
    const activeTokens = await dbService.findMany('tokens', { is_active: true });
    // Build currencies list, ensuring no duplicates (USDT/USDC may already be in activeTokens)
    const tokenSymbols = activeTokens.map(t => t.symbol);
    const baseCurrencies = [];
    // Only add USDT/USDC if not already in tokenSymbols to avoid double-counting
    if (!tokenSymbols.includes('USDT')) baseCurrencies.push('USDT');
    if (!tokenSymbols.includes('USDC')) baseCurrencies.push('USDC');
    const currencies = [...baseCurrencies, ...tokenSymbols];

    // Helper function to process account balances
    const processAccountBalances = async (accountType) => {
      try {
        const allAccountsResponse = await kucoin.getAllAccounts(accountType, apiKeys);

        const balances = [];
        let totalValueUSD = 0;
        let cryptoValueUSD = 0; // Portfolio Value: Crypto assets only (excludes USDT, USDC)

        if (allAccountsResponse.code === '200000' && allAccountsResponse.data && allAccountsResponse.data.length > 0) {
          // Group accounts by currency
          const accountsByCurrency = {};

          for (const account of allAccountsResponse.data) {
            const currency = account.currency;
            if (!accountsByCurrency[currency]) {
              accountsByCurrency[currency] = [];
            }
            accountsByCurrency[currency].push(account);
          }

          // Process each currency that we care about
          for (const currency of currencies) {
            const currencyAccounts = accountsByCurrency[currency] || [];

            if (currencyAccounts.length > 0) {
              let totalBalance = 0;
              let totalAvailable = 0;
              let totalHolds = 0;

              for (const account of currencyAccounts) {
                totalBalance += parseFloat(account.balance || 0);
                totalAvailable += parseFloat(account.available || 0);
                totalHolds += parseFloat(account.holds || 0);
              }

              // Only include currencies with non-zero total balance
              if (totalBalance > 0) {
                // Calculate value in USD (USDT = USD for display purposes)
                let valueInUSD = 0;
                let priceUSD = 0;
                let isCryptoAsset = false; // Track if this is a crypto asset (not stablecoin)

                if (currency === 'USDT' || currency === 'USDC') {
                  // Stablecoins: 1:1 with USD (NOT included in crypto portfolio)
                  valueInUSD = totalBalance;
                  priceUSD = 1;
                  isCryptoAsset = false;
                } else {
                  // Crypto assets (BTC, ETH, ADA, SOL, etc.) - INCLUDE in portfolio
                  const symbol = `${currency}-USDT`;
                  const priceResponse = await kucoin.getMarketPrice(symbol);

                  if (priceResponse.code === '200000' && priceResponse.data) {
                    priceUSD = parseFloat(priceResponse.data.last);
                    valueInUSD = totalBalance * priceUSD;
                    isCryptoAsset = true; // This is a crypto asset
                  }
                }

                // Push balance with price and value included
                balances.push({
                  currency,
                  balance: totalBalance.toFixed(8),
                  available: totalAvailable.toFixed(8),
                  holds: totalHolds.toFixed(8),
                  priceUSD: parseFloat(priceUSD.toFixed(6)),
                  valueUSD: parseFloat(valueInUSD.toFixed(2))
                });

                totalValueUSD += valueInUSD;

                // Add to crypto portfolio value if this is a crypto asset (excludes USDT, USDC)
                if (isCryptoAsset) {
                  cryptoValueUSD += valueInUSD;
                }
              }
            }
          }
        }

        return {
          balances,
          totalValueUSD: parseFloat(totalValueUSD.toFixed(2)),
          cryptoValueUSD: parseFloat(cryptoValueUSD.toFixed(2)) // Portfolio value: crypto only
        };
      } catch (error) {
        console.error(`Error fetching ${accountType} account balances:`, error);
        // Return empty balances on error instead of failing completely
        return {
          balances: [],
          totalValueUSD: 0,
          cryptoValueUSD: 0
        };
      }
    };

    // Fetch both MAIN and TRADE account balances
    const [mainAccount, tradeAccount] = await Promise.all([
      processAccountBalances('main'),
      processAccountBalances('trade')
    ]);

    // Get user's locked balance for pending withdrawals
    const userLocked = await dbService.queryOne(
      'SELECT locked_balance_usdt FROM users WHERE id = $1',
      [userId]
    );
    const lockedBalanceUsdt = parseFloat(userLocked?.locked_balance_usdt || 0);

    // Find USDT balance from trade account
    // Use .available (not .balance) to account for KuCoin order holds
    const usdtBalance = tradeAccount.balances.find(b => b.currency === 'USDT');
    const usdtAvailable = usdtBalance ? parseFloat(usdtBalance.available) : 0;

    // Calculate available USDT for withdrawals (KuCoin available - our withdrawal locks)
    const availableUsdt = Math.max(0, usdtAvailable - lockedBalanceUsdt);

    // Portfolio Value: Crypto assets ONLY (BTC, ETH, ADA, SOL, etc.)
    // Completely EXCLUDES USDT and USDC
    // Sum crypto from BOTH MAIN and TRADE accounts
    const portfolioValueUSD = mainAccount.cryptoValueUSD + tradeAccount.cryptoValueUSD;

    return res.status(200).json({
      success: true,
      data: {
        main: mainAccount,
        trade: tradeAccount,
        // Total value from trade account (includes all assets + USDT)
        totalValueUSD: tradeAccount.totalValueUSD,
        // Portfolio Value: Crypto assets ONLY (excludes USDT completely)
        portfolioValueUSD: parseFloat(portfolioValueUSD.toFixed(2)),
        balances: tradeAccount.balances,
        // Locked balance information for withdrawals (in USDT/USD)
        locked: {
          usdt: parseFloat(lockedBalanceUsdt.toFixed(8)),
          usd: parseFloat(lockedBalanceUsdt.toFixed(2))
        },
        // Available balance for withdrawals (after subtracting locked amounts)
        available: {
          usdt: parseFloat(availableUsdt.toFixed(8)),
          usd: parseFloat(availableUsdt.toFixed(2))
        }
      }
    });
  } catch (error) {
    console.error('Balance fetch error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/balance/holdings
 * Calculate holdings from filled trades in database with enhanced P&L calculation
 *
 * Headers: Authorization: Bearer <firebase_token>
 * Returns: { holdings, totalInvestedUSD, totalCurrentValueUSD, totalPnlUSD, totalPnlPercentage }
 */
router.get('/holdings', verifyFirebaseToken, requireAuth, requireKYC, async (req, res) => {
  try {
    const userId = req.user.id;

    // Query all filled trades with detailed information
    const tradesQuery = `
      SELECT
        token_symbol,
        side,
        quantity,
        price_usdt,
        amount_inr,
        usdt_inr_rate,
        platform_fee_inr,
        created_at
      FROM trades
      WHERE user_id = $1
        AND status = 'filled'
        AND (side = 'buy' OR side = 'sell')
      ORDER BY created_at ASC
    `;
    const allTrades = await dbService.queryMany(tradesQuery, [userId]);

    // Group trades by symbol and calculate holdings using FIFO method
    const holdingsMap = {};

    for (const trade of allTrades) {
      const symbol = trade.token_symbol;

      if (!holdingsMap[symbol]) {
        holdingsMap[symbol] = {
          lots: [], // FIFO lots for accurate cost basis
          totalQuantity: 0,
          totalInvestedUSD: 0
        };
      }

      const quantity = parseFloat(trade.quantity);
      const priceUsdt = parseFloat(trade.price_usdt);
      // Calculate USD value from quantity * price (USDT = USD)
      const amountUsd = quantity * priceUsdt;

      if (trade.side === 'buy') {
        // Add to holdings using FIFO
        holdingsMap[symbol].lots.push({
          quantity,
          priceUsdt,
          amountUsd, // Net invested in USD
          remainingQuantity: quantity,
          date: trade.created_at
        });

        holdingsMap[symbol].totalQuantity += quantity;
        holdingsMap[symbol].totalInvestedUSD += amountUsd;
      } else {
        // Sell from holdings using FIFO
        let remainingToSell = quantity;
        const lots = holdingsMap[symbol].lots;

        // Process lots in FIFO order
        for (let i = 0; i < lots.length && remainingToSell > 0; i++) {
          const lot = lots[i];
          if (lot.remainingQuantity > 0) {
            const sellFromLot = Math.min(lot.remainingQuantity, remainingToSell);

            // Calculate cost basis for this portion
            const costBasisRatio = sellFromLot / lot.quantity;
            const costBasisUsd = lot.amountUsd * costBasisRatio;

            // Reduce holdings
            holdingsMap[symbol].totalQuantity -= sellFromLot;
            holdingsMap[symbol].totalInvestedUSD -= costBasisUsd;

            lot.remainingQuantity -= sellFromLot;
            remainingToSell -= sellFromLot;
          }
        }
      }
    }

    // Calculate current values and P&L
    const holdings = [];
    let totalInvestedUSD = 0;
    let totalCurrentValueUSD = 0;

    for (const [symbol, holding] of Object.entries(holdingsMap)) {
      // Skip if no remaining quantity
      if (holding.totalQuantity <= 0) continue;

      // Get current price from KuCoin
      let currentPriceUsdt = 0;
      try {
        const tradingPair = `${symbol}-USDT`;
        const priceResponse = await kucoin.getMarketPrice(tradingPair);

        if (priceResponse.code === '200000' && priceResponse.data) {
          currentPriceUsdt = parseFloat(priceResponse.data.last);
        }
      } catch (error) {
        console.error(`Error fetching price for ${symbol}:`, error);
        // Use weighted average buy price as fallback
        currentPriceUsdt = holding.totalQuantity > 0 ? holding.totalInvestedUSD / holding.totalQuantity : 0;
      }

      // Calculate current value (USDT = USD)
      const currentValueUSD = holding.totalQuantity * currentPriceUsdt;

      // Calculate P&L
      const pnlUSD = currentValueUSD - holding.totalInvestedUSD;
      const pnlPercentage = holding.totalInvestedUSD > 0 ? (pnlUSD / holding.totalInvestedUSD) * 100 : 0;

      // Calculate average buy price
      const avgBuyPrice = holding.totalQuantity > 0 ? holding.totalInvestedUSD / holding.totalQuantity : 0;

      holdings.push({
        symbol: symbol,
        quantity: holding.totalQuantity.toFixed(8),
        avgBuyPrice: avgBuyPrice.toFixed(6),
        currentPrice: currentPriceUsdt.toFixed(6),
        investedUSD: parseFloat(holding.totalInvestedUSD.toFixed(2)),
        currentValueUSD: parseFloat(currentValueUSD.toFixed(2)),
        pnlUSD: parseFloat(pnlUSD.toFixed(2)),
        pnlPercentage: parseFloat(pnlPercentage.toFixed(2))
      });

      totalInvestedUSD += holding.totalInvestedUSD;
      totalCurrentValueUSD += currentValueUSD;
    }

    const totalPnlUSD = totalCurrentValueUSD - totalInvestedUSD;
    const totalPnlPercentage = totalInvestedUSD > 0 ? (totalPnlUSD / totalInvestedUSD) * 100 : 0;

    return res.status(200).json({
      success: true,
      data: {
        holdings,
        totalInvestedUSD: parseFloat(totalInvestedUSD.toFixed(2)),
        totalCurrentValueUSD: parseFloat(totalCurrentValueUSD.toFixed(2)),
        totalPnlUSD: parseFloat(totalPnlUSD.toFixed(2)),
        totalPnlPercentage: parseFloat(totalPnlPercentage.toFixed(2))
      }
    });
  } catch (error) {
    console.error('Holdings calculation error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
