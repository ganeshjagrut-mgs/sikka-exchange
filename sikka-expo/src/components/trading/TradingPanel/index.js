import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, TextInput } from 'react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import { useStore } from '../../../store/useStore';
import { useBreakpoints } from '../../../hooks/useBreakpoints';
import { GlassContainer } from '../../ui';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react-native';
import { formatIndianCurrency } from '../../../utils/formatIndianCurrency';
import useMarketStore from '../../../store/marketStore';
import useWalletStore from '../../../store/walletStore';
import useTradingStore from '../../../store/tradingStore';
import useKYCStore from '../../../store/kycStore';
import { router } from 'expo-router';
import backendApi from '../../../services/backendApi';
import OrderSuccessModal from '../OrderSuccessModal';

const TradingPanel = () => {
  const { colors, typography } = useTheme();
  const { selectedCrypto } = useStore();
  const { isMobile, isTablet } = useBreakpoints();
  const { getTicker } = useMarketStore();
  const { balance, fetchBalance, getCurrencyBalance, getTotalUSDValue } = useWalletStore();
  const { buyOrder, sellOrder, loading } = useTradingStore();
  const { kycStatus } = useKYCStore();

  // Local state
  const [tradeType, setTradeType] = useState('buy');
  const [tradeAmount, setTradeAmount] = useState(''); // Now represents USD amount (not crypto)
  const [orderType] = useState('market'); // ALWAYS market orders (selector hidden)
  const [limitPrice, setLimitPrice] = useState('');
  const [sellAllMode, setSellAllMode] = useState(false); // Track when user wants to sell 100%

  // Fee estimation state (from backend)
  const [feeEstimate, setFeeEstimate] = useState(null);
  const [loadingFeeEstimate, setLoadingFeeEstimate] = useState(false);

  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);

  // Fetch balance on mount
  useEffect(() => {
    if (!balance) {
      fetchBalance();
    }
  }, []);

  // Get current crypto symbol from selectedCrypto or ticker
  const baseCurrency = selectedCrypto?.symbol || 'BTC';
  const baseSymbol = baseCurrency.includes('-') ? baseCurrency.split('-')[0] : baseCurrency;

  // Backend returns tickers with keys like "BTC", not "BTC-USDT"
  const ticker = getTicker(baseSymbol);

  // Debug ticker data in development
  useEffect(() => {
    if (__DEV__) {
      console.log('[TradingPanel] Base symbol:', baseSymbol);
      console.log('[TradingPanel] Ticker data:', ticker);
      console.log('[TradingPanel] Current price:', ticker?.price || 'No data');
    }
  }, [baseSymbol, ticker]);

  // Get balances from TRADE account
  // For BUY: Use available USDT balance (total - locked for withdrawals)
  // For SELL: Use crypto balance
  const usdtBalance = balance?.available?.usdt ?? getCurrencyBalance('USDT', 'trade');
  const cryptoBalance = getCurrencyBalance(baseSymbol, 'trade');

  // Available balance for trading (USDT ≈ USD for display)
  const availableBalance = tradeType === 'buy' ? usdtBalance : cryptoBalance;

  // Calculate totals and fees
  // Price is already in USDT from backend API - NO FALLBACK, must have real data
  // USDT ≈ USD for display purposes
  const priceInUSD = orderType === 'market' ? (ticker?.price || 0) : parseFloat(limitPrice) || 0;

  // Store price at time of amount entry to avoid constant recalculations
  const [lockedPrice, setLockedPrice] = useState(null);

  // Lock price when user enters an amount
  useEffect(() => {
    if (tradeAmount && parseFloat(tradeAmount) > 0 && priceInUSD > 0) {
      if (!lockedPrice) {
        setLockedPrice(priceInUSD);
      }
    } else {
      setLockedPrice(null);
    }
  }, [tradeAmount]);

  // Use locked price for calculations, fall back to live price
  const effectivePrice = lockedPrice || priceInUSD;

  // Fetch fee estimate from backend when amount changes
  useEffect(() => {
    const fetchFeeEstimate = async () => {
      // Only fetch if we have a valid amount and price
      const usdInput = parseFloat(tradeAmount);
      if (!tradeAmount || usdInput <= 0 || !baseSymbol || !effectivePrice || effectivePrice <= 0) {
        setFeeEstimate(null);
        return;
      }

      // Convert USD to crypto amount for backend API
      const cryptoQty = usdInput / effectivePrice;

      try {
        setLoadingFeeEstimate(true);
        const response = await backendApi.trading.estimateFees(
          baseSymbol,
          tradeType,
          cryptoQty // Send crypto quantity to backend
        );

        if (response.success) {
          setFeeEstimate(response.data);
        }
      } catch (error) {
        console.error('[TradingPanel] Error fetching fee estimate:', error);
        // Don't show error to user - just use fallback calculations
        setFeeEstimate(null);
      } finally {
        setLoadingFeeEstimate(false);
      }
    };

    // Debounce the API call to avoid too many requests
    const timeoutId = setTimeout(fetchFeeEstimate, 500);
    return () => clearTimeout(timeoutId);
  }, [tradeAmount, tradeType, baseSymbol, effectivePrice]);

  // User enters USD amount, we calculate crypto amount
  // Use effectivePrice (locked price) for stable calculations during order entry
  const usdAmount = parseFloat(tradeAmount) || 0; // User input is now in USD
  const cryptoAmount = effectivePrice > 0 ? usdAmount / effectivePrice : 0; // Calculate crypto from USD

  // For BUY: Calculate USDT needed (based on crypto amount)
  // For SELL: Calculate USDT received (based on crypto amount)
  // USDT ≈ USD, so effectivePrice already represents USD value
  const subtotal = cryptoAmount * effectivePrice; // USD/USDT value

  // Use backend fee estimate only - no fallback
  let fee = 0;
  let feePercentage = 0;
  let totalWithFees = subtotal;

  if (feeEstimate) {
    // Use backend fee data (in USD)
    fee = feeEstimate.platformFee || 0;
    feePercentage = subtotal > 0 ? (fee / subtotal) * 100 : 0;
    totalWithFees = tradeType === 'buy' ? subtotal + fee : subtotal - fee;
  }
  // No fallback - wait for backend response

  // Handle percentage buttons
  const handlePercentageClick = (percentage) => {
    // Reset locked price to get fresh price for new amount
    setLockedPrice(null);

    let maxUSDAmount = 0;

    if (tradeType === 'buy') {
      // availableBalance is in USDT (≈ USD)
      maxUSDAmount = availableBalance;
      setSellAllMode(false);
    } else {
      // For sell, use crypto balance and convert to USD value
      maxUSDAmount = availableBalance * priceInUSD;
      // Track when user wants to sell 100% to avoid floating-point precision issues
      setSellAllMode(percentage === '100%');
    }

    const calculatedUSDAmount = (maxUSDAmount * parseFloat(percentage) / 100);
    setTradeAmount(calculatedUSDAmount.toFixed(2)); // 2 decimals for USD
  };

  // Handle trade execution
  const handleTrade = async () => {
    // Block non-KYC users
    if (kycStatus?.status !== 'approved') {
      Alert.alert(
        'Complete KYC',
        'Verify your identity to start trading.',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Complete KYC', onPress: () => router.push('/(tabs)/kyc') }
        ]
      );
      return;
    }

    if (!tradeAmount || parseFloat(tradeAmount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid USD amount');
      return;
    }

    if (!priceInUSD || priceInUSD <= 0) {
      Alert.alert('Price Not Available', 'Unable to get current price. Please try again.');
      return;
    }

    if (cryptoAmount <= 0) {
      Alert.alert('Invalid Amount', 'Calculated crypto amount is too small');
      return;
    }

    // Check balance (availableBalance is in USDT for buy, crypto for sell)
    if (tradeType === 'buy' && totalWithFees > availableBalance) {
      const neededUSD = formatIndianCurrency(totalWithFees);
      const availableUSD = formatIndianCurrency(availableBalance);
      Alert.alert(
        'Insufficient Balance',
        `You need ${neededUSD} but only have ${availableUSD}.\n\nPlease add funds to your wallet.`,
        [
          { text: 'OK', style: 'cancel' },
        ]
      );
      return;
    }

    // For sell orders, use small epsilon for floating-point comparison to avoid false "insufficient balance"
    // When sellAllMode is true, we'll use exact availableBalance anyway
    if (tradeType === 'sell' && !sellAllMode && cryptoAmount > availableBalance * 1.0001) {
      Alert.alert(
        'Insufficient Balance',
        `You need ${cryptoAmount.toFixed(8)} ${baseSymbol} but only have ${availableBalance.toFixed(8)} ${baseSymbol}`
      );
      return;
    }

    try {
      // Use exact availableBalance when sellAllMode is true to avoid floating-point precision issues
      const actualCryptoAmount = (tradeType === 'sell' && sellAllMode) ? availableBalance : cryptoAmount;
      console.log(`🔄 Executing ${tradeType} order: ${actualCryptoAmount} ${baseSymbol} (USD: ${usdAmount})${sellAllMode ? ' [SELL ALL MODE]' : ''}`);

      let response;
      if (tradeType === 'buy') {
        response = await buyOrder(baseSymbol, cryptoAmount); // Send crypto amount to backend
      } else {
        response = await sellOrder(baseSymbol, actualCryptoAmount); // Use actual amount (exact balance for 100% sell)
      }

      console.log('✅ Trade executed:', response);

      // Clear form on success
      setTradeAmount('');
      setLimitPrice('');

      // Refresh balance (tradingStore already does this, but ensure it's done)
      await fetchBalance();

      // Show success modal
      setLastOrder({
        type: tradeType,
        amount: cryptoAmount.toFixed(8),
        symbol: baseSymbol,
        usdValue: usdAmount,
      });
      setShowSuccessModal(true);
    } catch (error) {
      console.error('❌ Trade failed:', error);
      Alert.alert(
        'Order Failed',
        error.message || 'Failed to execute trade. Please try again.',
        [
          { text: 'OK', style: 'cancel' },
        ]
      );
    }
  };

  return (
    <GlassContainer style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text, fontFamily: typography.fontFamily?.primary }]}>
          Trade {baseSymbol}
        </Text>
        <View style={styles.balanceContainer}>
          <Wallet size={16} color={colors.textSecondary} strokeWidth={1.5} />
          <Text style={[styles.balanceText, { color: colors.textSecondary, fontFamily: typography.fontFamily?.primary }]}>
            {tradeType === 'buy'
              ? `${formatIndianCurrency(usdtBalance)}`
              : `${availableBalance.toFixed(8)} ${baseSymbol}`}
          </Text>
        </View>
      </View>

      {/* Trade Type Toggle */}
      <View style={[styles.tradeTypeContainer, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          onPress={() => setTradeType('buy')}
          style={[
            styles.tradeTypeButton,
            tradeType === 'buy' && { backgroundColor: colors.cryptoGreen }
          ]}
        >
          <ArrowUpRight size={16} color={tradeType === 'buy' ? colors.white : colors.textSecondary} strokeWidth={2} />
          <Text style={[
            styles.tradeTypeText,
            { color: tradeType === 'buy' ? colors.white : colors.textSecondary, fontFamily: typography.fontFamily?.primary }
          ]}>
            Buy
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setTradeType('sell')}
          style={[
            styles.tradeTypeButton,
            tradeType === 'sell' && { backgroundColor: colors.error }
          ]}
        >
          <ArrowDownLeft size={16} color={tradeType === 'sell' ? colors.white : colors.textSecondary} strokeWidth={2} />
          <Text style={[
            styles.tradeTypeText,
            { color: tradeType === 'sell' ? colors.white : colors.textSecondary, fontFamily: typography.fontFamily?.primary }
          ]}>
            Sell
          </Text>
        </TouchableOpacity>
      </View>

      {/* Order Type Selection - HIDDEN (Always use market orders) */}
      {/* Order type forced to 'market' - selector removed per requirements */}

      {/* Amount Input */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.text, fontFamily: typography.fontFamily?.primary }]}>
          Amount (USD)
        </Text>
        <TextInput
          value={tradeAmount}
          onChangeText={(text) => {
            setTradeAmount(text);
            setSellAllMode(false); // Reset sell all mode when user manually types
          }}
          placeholder="0.00"
          keyboardType="numeric"
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
          placeholderTextColor={colors.textSecondary}
        />
        
        {/* Percentage Buttons */}
        <View style={styles.percentageContainer}>
          {['25%', '50%', '75%', '100%'].map((percentage) => (
            <TouchableOpacity
              key={percentage}
              onPress={() => handlePercentageClick(percentage)}
              style={[styles.percentageButton, { backgroundColor: colors.surface }]}
            >
              <Text style={[styles.percentageText, { color: colors.text, fontFamily: typography.fontFamily?.primary }]}>
                {percentage}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Order Summary */}
      <View style={[styles.orderSummary, { backgroundColor: colors.surface + '50' }]}>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary, fontFamily: typography.fontFamily?.primary }]}>
            Price (per {baseSymbol})
          </Text>
          <Text style={[styles.summaryValue, { color: colors.text, fontFamily: typography.fontFamily?.primary }]}>
            {formatIndianCurrency(priceInUSD)}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary, fontFamily: typography.fontFamily?.primary }]}>
            USD Amount
          </Text>
          <Text style={[styles.summaryValue, { color: colors.text, fontFamily: typography.fontFamily?.primary }]}>
            {formatIndianCurrency(usdAmount)}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary, fontFamily: typography.fontFamily?.primary }]}>
            {baseSymbol} Amount
          </Text>
          <Text style={[styles.summaryValue, { color: colors.text, fontFamily: typography.fontFamily?.primary }]}>
            {cryptoAmount.toFixed(8)} {baseSymbol}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary, fontFamily: typography.fontFamily?.primary }]}>
            Fee ({feePercentage.toFixed(2)}%)
          </Text>
          <Text style={[styles.summaryValue, { color: colors.text, fontFamily: typography.fontFamily?.primary }]}>
            {formatIndianCurrency(fee)}
          </Text>
        </View>

        <View style={[styles.summaryRow, styles.summaryDivider, { borderTopColor: colors.border }]}>
          <Text style={[styles.summaryLabel, styles.summaryTotal, { color: colors.text, fontFamily: typography.fontFamily?.primary }]}>
            {tradeType === 'buy' ? 'Total Cost' : 'Total Receive'}
          </Text>
          <Text style={[styles.summaryValue, styles.summaryTotal, { color: colors.text, fontFamily: typography.fontFamily?.primary }]}>
            {formatIndianCurrency(totalWithFees)}
          </Text>
        </View>
      </View>

      {/* Trade Button */}
      <TouchableOpacity
        onPress={handleTrade}
        disabled={!tradeAmount || parseFloat(tradeAmount) <= 0 || loading}
        style={[
          styles.tradeButton,
          {
            backgroundColor: tradeType === 'buy' ? colors.cryptoGreen : colors.error,
            opacity: (!tradeAmount || parseFloat(tradeAmount) <= 0 || loading) ? 0.6 : 1
          }
        ]}
      >
        <View style={styles.tradeButtonContent}>
          {tradeType === 'buy' ? (
            <TrendingUp size={20} color={colors.white} strokeWidth={2} />
          ) : (
            <TrendingDown size={20} color={colors.white} strokeWidth={2} />
          )}
          <Text style={[styles.tradeButtonText, { color: colors.white, fontFamily: typography.fontFamily?.primary }]}>
            {loading ? 'Placing Order...' : `${tradeType === 'buy' ? 'Buy' : 'Sell'} ${baseSymbol}`}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Market Info - Only show if we have real data */}
      {ticker?.lastUpdate && (
        <View style={[styles.marketInfo, { borderTopColor: colors.border }]}>
          <Text style={[styles.marketInfoTitle, { color: colors.text, fontFamily: typography.fontFamily?.primary }]}>
            Market Info
          </Text>

          <View style={styles.marketInfoRow}>
            <Text style={[styles.marketInfoLabel, { color: colors.textSecondary, fontFamily: typography.fontFamily?.primary }]}>
              Current Price
            </Text>
            <Text style={[styles.marketInfoValue, { color: colors.text, fontFamily: typography.fontFamily?.primary }]}>
              {formatIndianCurrency(ticker.price)}
            </Text>
          </View>

          <View style={styles.marketInfoRow}>
            <Text style={[styles.marketInfoLabel, { color: colors.textSecondary, fontFamily: typography.fontFamily?.primary }]}>
              Last Update
            </Text>
            <Text style={[styles.marketInfoValue, { color: colors.text, fontFamily: typography.fontFamily?.primary }]}>
              {new Date(ticker.lastUpdate).toLocaleTimeString()}
            </Text>
          </View>
        </View>
      )}

      {/* Success Modal */}
      <OrderSuccessModal
        visible={showSuccessModal}
        orderType={lastOrder?.type}
        amount={lastOrder?.amount}
        symbol={lastOrder?.symbol}
        usdValue={lastOrder?.usdValue}
        onClose={() => setShowSuccessModal(false)}
      />
    </GlassContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 20,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  
  // Trade Type Toggle
  tradeTypeContainer: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
  },
  tradeTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  tradeTypeText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Sections
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  
  // Order Type
  orderTypeContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
  },
  orderTypeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  orderTypeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Input
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 12,
  },
  
  // Percentage buttons
  percentageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  percentageButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  percentageText: {
    fontSize: 12,
    fontWeight: '500',
  },
  
  // Order Summary
  orderSummary: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryDivider: {
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 8,
    marginBottom: 0,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  summaryTotal: {
    fontSize: 16,
    fontWeight: '700',
  },
  
  // Trade Button
  tradeButton: {
    borderRadius: 16,
    marginBottom: 20,
    paddingVertical: 16,
  },
  tradeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tradeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  
  // Market Info
  marketInfo: {
    borderTopWidth: 1,
    paddingTop: 16,
  },
  marketInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  marketInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  marketInfoLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  marketInfoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default TradingPanel;