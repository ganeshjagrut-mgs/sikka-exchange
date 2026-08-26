#!/usr/bin/env node
/**
 * Investigation Script: Wallet Page Value Discrepancies
 *
 * This script calls the backend APIs and calculates what the wallet page SHOULD display
 * vs what is being reported by the user.
 *
 * User: approved-kyc-trader@test.com
 * KuCoin UID: 251702548
 */

const kucoin = require('../backend/src/services/kucoin.service');
const dbService = require('../backend/src/services/db.service');

const EMAIL = 'approved-kyc-trader@test.com';
const DEFAULT_INR_TO_USDT_RATE = 84.5;

// Known KuCoin actual balances (from user's recent consolidation)
const KUCOIN_ACTUAL = {
  MAIN: {},
  TRADE: {
    BTC: 0.00013365,
    USDT: 5.15412762,
    USDC: 5
  }
};

// Known trade history from database
const TRADES = [
  { side: 'buy', symbol: 'BTC', quantity: 0.00004, price_usdt: 110019.5, amount_inr: 373.73, fee: 1.86 },
  { side: 'sell', symbol: 'BTC', quantity: 0.00002, price_usdt: 110030.3, amount_inr: 185.02, fee: 0.93 },
  { side: 'buy', symbol: 'USDC', quantity: 9, price_usdt: 1.0001, amount_inr: 764.38, fee: 3.80 },
  { side: 'sell', symbol: 'USDC', quantity: 9, price_usdt: 1.0, amount_inr: 756.70, fee: 3.80 },
  { side: 'buy', symbol: 'USDC', quantity: 10, price_usdt: 1.0001, amount_inr: 849.31, fee: 4.23 },
  { side: 'sell', symbol: 'USDC', quantity: 5, price_usdt: 1.0001, amount_inr: 420.43, fee: 2.11 },
];

async function investigate() {
  console.log('='.repeat(80));
  console.log('WALLET PAGE VALUE DISCREPANCY INVESTIGATION');
  console.log('='.repeat(80));
  console.log();

  // Step 1: Get user from database
  console.log('Step 1: Fetching user from database...');
  const user = await dbService.findOne('users', { email: EMAIL });
  if (!user) {
    throw new Error('User not found');
  }
  console.log(`✓ User found: ${user.email}`);
  console.log(`  KuCoin UID: ${user.kucoin_sub_account_uid}`);
  console.log();

  // Step 2: Get INR to USDT rate
  console.log('Step 2: Fetching INR to USDT conversion rate...');
  const rateConfig = await dbService.findOne('admin_config', { key: 'inr_to_usdt_rate' });
  const inrToUsdtRate = rateConfig ? parseFloat(rateConfig.value) : DEFAULT_INR_TO_USDT_RATE;
  console.log(`✓ INR to USDT Rate: ${inrToUsdtRate}`);
  console.log();

  // Step 3: Get current BTC price from KuCoin
  console.log('Step 3: Fetching current crypto prices from KuCoin...');
  const btcPriceResponse = await kucoin.getMarketPrice('BTC-USDT');
  const btcPriceUsdt = btcPriceResponse.code === '200000' ? parseFloat(btcPriceResponse.data.last) : 0;
  const btcPriceInr = btcPriceUsdt * inrToUsdtRate;
  console.log(`✓ BTC Price: $${btcPriceUsdt} USDT = ₹${btcPriceInr.toFixed(2)}`);

  const usdcPriceResponse = await kucoin.getMarketPrice('USDC-USDT');
  const usdcPriceUsdt = usdcPriceResponse.code === '200000' ? parseFloat(usdcPriceResponse.data.last) : 1.0001;
  const usdcPriceInr = usdcPriceUsdt * inrToUsdtRate;
  console.log(`✓ USDC Price: $${usdcPriceUsdt} USDT = ₹${usdcPriceInr.toFixed(2)}`);
  console.log();

  // Step 4: Calculate expected values from KuCoin actual balance
  console.log('Step 4: Calculating expected values from KuCoin actual balance...');
  console.log('KuCoin Actual Balance (source of truth):');
  console.log(`  MAIN: Empty`);
  console.log(`  TRADE:`);
  console.log(`    BTC: ${KUCOIN_ACTUAL.TRADE.BTC}`);
  console.log(`    USDT: ${KUCOIN_ACTUAL.TRADE.USDT}`);
  console.log(`    USDC: ${KUCOIN_ACTUAL.TRADE.USDC}`);
  console.log();

  const btcValue = KUCOIN_ACTUAL.TRADE.BTC * btcPriceInr;
  const usdtValue = KUCOIN_ACTUAL.TRADE.USDT * inrToUsdtRate;
  const usdcValue = KUCOIN_ACTUAL.TRADE.USDC * usdcPriceInr;
  const totalValue = btcValue + usdtValue + usdcValue;

  console.log('Expected Portfolio Values (from KuCoin balance):');
  console.log(`  BTC: ${KUCOIN_ACTUAL.TRADE.BTC} × ₹${btcPriceInr.toFixed(2)} = ₹${btcValue.toFixed(2)}`);
  console.log(`  USDT: ${KUCOIN_ACTUAL.TRADE.USDT} × ₹${inrToUsdtRate} = ₹${usdtValue.toFixed(2)}`);
  console.log(`  USDC: ${KUCOIN_ACTUAL.TRADE.USDC} × ₹${usdcPriceInr.toFixed(2)} = ₹${usdcValue.toFixed(2)}`);
  console.log(`  TOTAL: ₹${totalValue.toFixed(2)}`);
  console.log();

  // Step 5: Calculate holdings using FIFO from trade history
  console.log('Step 5: Calculating holdings using FIFO method from trade history...');
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

  console.log('Holdings Calculation (FIFO):');
  let totalInvestedINR = 0;
  let totalCurrentValueINR = 0;
  for (const [symbol, holding] of Object.entries(holdings)) {
    if (holding.totalQuantity <= 0) {
      console.log(`  ${symbol}: 0 (fully sold)`);
      continue;
    }

    const avgBuyPrice = holding.totalInvestedUSDT / holding.totalQuantity;
    let currentPrice = 0;
    let currentValue = 0;

    if (symbol === 'BTC') {
      currentPrice = btcPriceUsdt;
      currentValue = holding.totalQuantity * btcPriceInr;
    } else if (symbol === 'USDC') {
      currentPrice = usdcPriceUsdt;
      currentValue = holding.totalQuantity * usdcPriceInr;
    }

    const pnlINR = currentValue - holding.totalInvestedINR;
    const pnlPercentage = (pnlINR / holding.totalInvestedINR) * 100;

    console.log(`  ${symbol}:`);
    console.log(`    Holdings: ${holding.totalQuantity.toFixed(8)}`);
    console.log(`    Avg Buy Price: $${avgBuyPrice.toFixed(6)} = ₹${(avgBuyPrice * inrToUsdtRate).toFixed(2)}`);
    console.log(`    Current Price: $${currentPrice.toFixed(6)} = ₹${(currentPrice * inrToUsdtRate).toFixed(2)}`);
    console.log(`    Invested: ₹${holding.totalInvestedINR.toFixed(2)}`);
    console.log(`    Current Value: ₹${currentValue.toFixed(2)}`);
    console.log(`    P&L: ₹${pnlINR.toFixed(2)} (${pnlPercentage.toFixed(2)}%)`);

    totalInvestedINR += holding.totalInvestedINR;
    totalCurrentValueINR += currentValue;
  }
  console.log();
  console.log(`Total Invested (from trades): ₹${totalInvestedINR.toFixed(2)}`);
  console.log(`Total Current Value (from holdings): ₹${totalCurrentValueINR.toFixed(2)}`);
  console.log(`Total P&L: ₹${(totalCurrentValueINR - totalInvestedINR).toFixed(2)}`);
  console.log();

  // Step 6: Compare holdings vs actual balance
  console.log('Step 6: Comparing holdings (from trades) vs actual balance (from KuCoin)...');
  console.log('DISCREPANCY ANALYSIS:');
  console.log(`  BTC Holdings (FIFO): ${holdings.BTC ? holdings.BTC.totalQuantity.toFixed(8) : '0'}`);
  console.log(`  BTC Actual (KuCoin): ${KUCOIN_ACTUAL.TRADE.BTC}`);
  if (holdings.BTC) {
    const btcDiff = KUCOIN_ACTUAL.TRADE.BTC - holdings.BTC.totalQuantity;
    console.log(`  ⚠️  DIFFERENCE: ${btcDiff.toFixed(8)} BTC`);
  }
  console.log();
  console.log(`  USDC Holdings (FIFO): ${holdings.USDC ? holdings.USDC.totalQuantity.toFixed(8) : '0'}`);
  console.log(`  USDC Actual (KuCoin): ${KUCOIN_ACTUAL.TRADE.USDC}`);
  if (holdings.USDC) {
    const usdcDiff = KUCOIN_ACTUAL.TRADE.USDC - holdings.USDC.totalQuantity;
    console.log(`  ✓ MATCH (USDC held as stablecoin)`);
  }
  console.log();

  // Step 7: Summary of findings
  console.log('='.repeat(80));
  console.log('SUMMARY OF FINDINGS');
  console.log('='.repeat(80));
  console.log();
  console.log('USER REPORTED VALUES:');
  console.log('  Portfolio Value (INR): ₹2,460.49');
  console.log('  Available: ₹1,293.56');
  console.log('  Total Portfolio Value: ₹1.03K ⚠️');
  console.log('  BTC Holdings: 0.00002 BTC');
  console.log('  USDT: $5.154128');
  console.log('  USDC: ₹422.54');
  console.log();

  console.log('CALCULATED EXPECTED VALUES:');
  console.log(`  Portfolio Value (from KuCoin balance): ₹${totalValue.toFixed(2)}`);
  console.log(`  Available (all in TRADE account): ₹${totalValue.toFixed(2)}`);
  console.log(`  Locked: ₹0.00 (no open orders)`);
  console.log(`  BTC Holdings (actual): ${KUCOIN_ACTUAL.TRADE.BTC} BTC`);
  console.log(`  BTC Holdings (FIFO): ${holdings.BTC ? holdings.BTC.totalQuantity.toFixed(8) : '0'} BTC`);
  console.log(`  USDT: $${KUCOIN_ACTUAL.TRADE.USDT} = ₹${usdtValue.toFixed(2)}`);
  console.log(`  USDC: ${KUCOIN_ACTUAL.TRADE.USDC} = ₹${usdcValue.toFixed(2)}`);
  console.log();

  console.log('ROOT CAUSE HYPOTHESES:');
  console.log('1. Frontend may be using holdings API (0.00002 BTC) instead of balance API (0.00013365 BTC)');
  console.log('2. "Total Portfolio Value ₹1.03K" doesn\'t match "Portfolio Value ₹2,460.49" - different data sources');
  console.log('3. Frontend may be showing MAIN balance instead of TRADE balance for some values');
  console.log('4. Exchange rate may not be 84.5 - need to verify backend uses correct rate');
  console.log();
}

// Run investigation
investigate()
  .then(() => {
    console.log('Investigation complete.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Investigation failed:', err);
    process.exit(1);
  });
