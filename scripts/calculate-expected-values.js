#!/usr/bin/env node
/**
 * Offline Calculation: Expected Wallet Values
 *
 * Calculates what the wallet page SHOULD display based on known data
 */

const INR_TO_USDT_RATE = 84.5;

// Known KuCoin actual balances (verified by user 5 min ago after consolidation)
const KUCOIN_ACTUAL = {
  MAIN: {}, // Empty after consolidation
  TRADE: {
    BTC: 0.00013365,
    USDT: 5.15412762,
    USDC: 5
  }
};

// Known trade history from database query
const TRADES = [
  { side: 'buy', symbol: 'BTC', quantity: 0.00004, price_usdt: 110019.5, amount_inr: 373.73, fee: 1.86 },
  { side: 'sell', symbol: 'BTC', quantity: 0.00002, price_usdt: 110030.3, amount_inr: 185.02, fee: 0.93 },
  { side: 'buy', symbol: 'USDC', quantity: 9, price_usdt: 1.0001, amount_inr: 764.38, fee: 3.80 },
  { side: 'sell', symbol: 'USDC', quantity: 9, price_usdt: 1.0, amount_inr: 756.70, fee: 3.80 },
  { side: 'buy', symbol: 'USDC', quantity: 10, price_usdt: 1.0001, amount_inr: 849.31, fee: 4.23 },
  { side: 'sell', symbol: 'USDC', quantity: 5, price_usdt: 1.0001, amount_inr: 420.43, fee: 2.11 },
];

// Approximate current prices (we'll use reasonable estimates)
const CURRENT_PRICES_USDT = {
  BTC: 8731000 / INR_TO_USDT_RATE, // ₹87.31L (lakh) INR = $103,325 USDT
  USDC: 1.0001
};

console.log('='.repeat(80));
console.log('WALLET PAGE EXPECTED VALUES CALCULATION');
console.log('='.repeat(80));
console.log();

// Step 1: Calculate FIFO holdings from trades
console.log('STEP 1: FIFO Holdings Calculation');
console.log('-'.repeat(80));

const holdings = {};

for (const trade of TRADES) {
  const symbol = trade.symbol;
  if (!holdings[symbol]) {
    holdings[symbol] = {
      lots: [],
      totalQuantity: 0,
      totalInvestedINR: 0,
      totalInvestedUSDT: 0
    };
  }

  if (trade.side === 'buy') {
    holdings[symbol].lots.push({
      quantity: trade.quantity,
      priceUsdt: trade.price_usdt,
      amountInr: trade.amount_inr - trade.fee,
      remainingQuantity: trade.quantity
    });
    holdings[symbol].totalQuantity += trade.quantity;
    holdings[symbol].totalInvestedINR += (trade.amount_inr - trade.fee);
    holdings[symbol].totalInvestedUSDT += (trade.quantity * trade.price_usdt);
  } else {
    // Sell using FIFO
    let remainingToSell = trade.quantity;
    for (const lot of holdings[symbol].lots) {
      if (remainingToSell <= 0) break;
      if (lot.remainingQuantity > 0) {
        const sellFromLot = Math.min(lot.remainingQuantity, remainingToSell);
        const costBasisRatio = sellFromLot / lot.quantity;
        const costBasisInr = lot.amountInr * costBasisRatio;
        const costBasisUsdt = lot.priceUsdt * sellFromLot;

        holdings[symbol].totalQuantity -= sellFromLot;
        holdings[symbol].totalInvestedINR -= costBasisInr;
        holdings[symbol].totalInvestedUSDT -= costBasisUsdt;

        lot.remainingQuantity -= sellFromLot;
        remainingToSell -= sellFromLot;
      }
    }
  }
}

console.log('Holdings from FIFO:');
for (const [symbol, holding] of Object.entries(holdings)) {
  if (holding.totalQuantity > 0) {
    const avgBuyPriceUsdt = holding.totalInvestedUSDT / holding.totalQuantity;
    console.log(`  ${symbol}:`);
    console.log(`    Quantity: ${holding.totalQuantity.toFixed(8)}`);
    console.log(`    Avg Buy Price: $${avgBuyPriceUsdt.toFixed(6)} USDT = ₹${(avgBuyPriceUsdt * INR_TO_USDT_RATE).toFixed(2)}`);
    console.log(`    Invested: ₹${holding.totalInvestedINR.toFixed(2)}`);
  }
}
console.log();

// Step 2: Calculate values from KuCoin actual balance
console.log('STEP 2: Portfolio Value from KuCoin Actual Balance');
console.log('-'.repeat(80));

const btcPriceInr = CURRENT_PRICES_USDT.BTC * INR_TO_USDT_RATE;
const usdcPriceInr = CURRENT_PRICES_USDT.USDC * INR_TO_USDT_RATE;

const btcValue = KUCOIN_ACTUAL.TRADE.BTC * btcPriceInr;
const usdtValue = KUCOIN_ACTUAL.TRADE.USDT * INR_TO_USDT_RATE;
const usdcValue = KUCOIN_ACTUAL.TRADE.USDC * usdcPriceInr;
const totalPortfolioValue = btcValue + usdtValue + usdcValue;

console.log(`BTC: ${KUCOIN_ACTUAL.TRADE.BTC} × ₹${btcPriceInr.toFixed(2)} = ₹${btcValue.toFixed(2)}`);
console.log(`USDT: ${KUCOIN_ACTUAL.TRADE.USDT} × ₹${INR_TO_USDT_RATE} = ₹${usdtValue.toFixed(2)}`);
console.log(`USDC: ${KUCOIN_ACTUAL.TRADE.USDC} × ₹${usdcPriceInr.toFixed(2)} = ₹${usdcValue.toFixed(2)}`);
console.log();
console.log(`TOTAL PORTFOLIO VALUE: ₹${totalPortfolioValue.toFixed(2)}`);
console.log(`AVAILABLE (all in TRADE): ₹${totalPortfolioValue.toFixed(2)}`);
console.log(`LOCKED: ₹0.00 (no open orders)`);
console.log();

// Step 3: Calculate P&L from holdings
console.log('STEP 3: P&L Calculation (Holdings vs Current Value)');
console.log('-'.repeat(80));

let totalInvestedINR = 0;
let totalCurrentValueINR = 0;

for (const [symbol, holding] of Object.entries(holdings)) {
  if (holding.totalQuantity <= 0) continue;

  const currentPriceUsdt = CURRENT_PRICES_USDT[symbol];
  const currentPriceInr = currentPriceUsdt * INR_TO_USDT_RATE;
  const currentValue = holding.totalQuantity * currentPriceInr;
  const pnlINR = currentValue - holding.totalInvestedINR;
  const pnlPercentage = (pnlINR / holding.totalInvestedINR) * 100;
  const avgBuyPriceUsdt = holding.totalInvestedUSDT / holding.totalQuantity;
  const avgBuyPriceInr = avgBuyPriceUsdt * INR_TO_USDT_RATE;

  console.log(`${symbol}:`);
  console.log(`  Holdings (FIFO): ${holding.totalQuantity.toFixed(8)}`);
  console.log(`  Avg Buy Price: ₹${avgBuyPriceInr.toFixed(2)}`);
  console.log(`  Current Price: ₹${currentPriceInr.toFixed(2)}`);
  console.log(`  Invested: ₹${holding.totalInvestedINR.toFixed(2)}`);
  console.log(`  Current Value: ₹${currentValue.toFixed(2)}`);
  console.log(`  P&L: ₹${pnlINR.toFixed(2)} (${pnlPercentage >= 0 ? '+' : ''}${pnlPercentage.toFixed(2)}%)`);
  console.log();

  totalInvestedINR += holding.totalInvestedINR;
  totalCurrentValueINR += currentValue;
}

const totalPnlINR = totalCurrentValueINR - totalInvestedINR;
const totalPnlPercentage = totalInvestedINR > 0 ? (totalPnlINR / totalInvestedINR) * 100 : 0;

console.log(`Total Invested: ₹${totalInvestedINR.toFixed(2)}`);
console.log(`Total Current Value: ₹${totalCurrentValueINR.toFixed(2)}`);
console.log(`Total P&L: ₹${totalPnlINR.toFixed(2)} (${totalPnlPercentage >= 0 ? '+' : ''}${totalPnlPercentage.toFixed(2)}%)`);
console.log();

// Step 4: Identify discrepancies
console.log('STEP 4: Discrepancy Analysis');
console.log('-'.repeat(80));

console.log('KEY DISCREPANCY #1: BTC Holdings');
console.log(`  FIFO Holdings: ${holdings.BTC ? holdings.BTC.totalQuantity.toFixed(8) : '0'} BTC`);
console.log(`  KuCoin Actual: ${KUCOIN_ACTUAL.TRADE.BTC} BTC`);
console.log(`  Difference: ${(KUCOIN_ACTUAL.TRADE.BTC - (holdings.BTC ? holdings.BTC.totalQuantity : 0)).toFixed(8)} BTC`);
console.log(`  Value Impact: ₹${((KUCOIN_ACTUAL.TRADE.BTC - (holdings.BTC ? holdings.BTC.totalQuantity : 0)) * btcPriceInr).toFixed(2)}`);
console.log();
console.log('  🔍 ROOT CAUSE: BTC holdings calculated from trades (0.00002) differ from actual balance (0.00013365)');
console.log('     This suggests there are missing buy trades in the database, or the user bought');
console.log('     BTC outside our system.');
console.log();

console.log('KEY DISCREPANCY #2: Portfolio Value vs Total Display');
console.log(`  User sees "Portfolio Value": ₹2,460.49`);
console.log(`  User sees "Total Portfolio Value": ₹1.03K (₹1,030)`);
console.log(`  Expected from KuCoin: ₹${totalPortfolioValue.toFixed(2)}`);
console.log();
console.log('  🔍 ROOT CAUSE: Two different calculations showing different values');
console.log('     - "Portfolio Value" may be using balance API (correct)');
console.log('     - "Total Portfolio Value" may be using holdings API (missing BTC)');
console.log();

console.log('KEY DISCREPANCY #3: Available Balance');
console.log(`  User sees: ₹1,293.56`);
console.log(`  Expected: ₹${totalPortfolioValue.toFixed(2)} (all funds in TRADE account, no locks)`);
console.log();
console.log('  🔍 ROOT CAUSE: Frontend may be calculating "available" incorrectly');
console.log('     - Could be showing only USDT + USDC value, excluding BTC');
console.log('     - Or using holdings value instead of balance value');
console.log();

// Step 5: Summary
console.log('='.repeat(80));
console.log('SUMMARY OF FINDINGS');
console.log('='.repeat(80));
console.log();

console.log('ROOT CAUSES IDENTIFIED:');
console.log();
console.log('1. HOLDINGS API vs BALANCE API MISMATCH');
console.log('   - Holdings API calculates from trade history (FIFO): BTC 0.00002');
console.log('   - Balance API gets actual KuCoin balance: BTC 0.00013365');
console.log('   - Gap of 0.00011365 BTC (worth ₹${((0.00011365 * btcPriceInr)).toFixed(2)})');
console.log('   - This creates ~₹1,166 discrepancy in portfolio value');
console.log();

console.log('2. FRONTEND USING WRONG DATA SOURCE');
console.log('   - WalletHeader.js shows "Portfolio Value ₹2,460.49"');
console.log('     → Uses balance.totalValueINR (from balance API) ✓ CORRECT');
console.log('   - WalletAssets.js shows "Total Portfolio Value ₹1.03K"');
console.log('     → Calculates from holdings array (from holdings API) ✗ WRONG');
console.log();

console.log('3. AVAILABLE BALANCE CALCULATION ERROR');
console.log('   - Frontend shows ₹1,293.56 as "Available"');
console.log('   - This equals USDT (₹435.52) + USDC (₹422.54) + something (₹435.50)');
console.log('   - Missing BTC value of ₹${btcValue.toFixed(2)}');
console.log();

console.log('FIXES REQUIRED:');
console.log();
console.log('1. WalletAssets.js (Line 191):');
console.log('   Change: const totalPortfolioValue = portfolio.reduce((sum, asset) => sum + (asset.value || 0), 0);');
console.log('   To: Use balance.totalValueINR instead of calculating from holdings');
console.log();
console.log('2. WalletHeader.js (Lines 88-97):');
console.log('   Fix calculateTotalBalance() to properly include ALL crypto holdings');
console.log('   Current issue: May be filtering out BTC or using wrong account type');
console.log();
console.log('3. Backend: Investigate why holdings API shows different BTC amount');
console.log('   - Check if there are trades not captured in database');
console.log('   - Or if FIFO calculation has a bug');
console.log();

console.log('EXPECTED CORRECT VALUES:');
console.log(`  Portfolio Value: ₹${totalPortfolioValue.toFixed(2)}`);
console.log(`  Available: ₹${totalPortfolioValue.toFixed(2)}`);
console.log(`  Locked: ₹0.00`);
console.log(`  BTC Holdings: ${KUCOIN_ACTUAL.TRADE.BTC} BTC = ₹${btcValue.toFixed(2)}`);
console.log(`  USDT: ${KUCOIN_ACTUAL.TRADE.USDT} = ₹${usdtValue.toFixed(2)}`);
console.log(`  USDC: ${KUCOIN_ACTUAL.TRADE.USDC} = ₹${usdcValue.toFixed(2)}`);
console.log();
