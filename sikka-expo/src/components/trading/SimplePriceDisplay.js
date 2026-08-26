import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useStore } from '../../store/useStore';
import useMarketStore from '../../store/marketStore';
import GlassContainer from '../ui/GlassContainer';

const SimplePriceDisplay = ({ enlarged = false }) => {
  const { colors, typography } = useTheme();
  const { selectedCrypto } = useStore();
  const { getTicker } = useMarketStore();

  // Backend returns tickers with keys like "BTC", not "BTC-USDT"
  const symbol = selectedCrypto?.symbol || 'BTC';
  const baseSymbol = symbol.includes('-') ? symbol.split('-')[0] : symbol;
  const ticker = getTicker(baseSymbol);

  if (!ticker) {
    return (
      <GlassContainer style={styles.container}>
        <Text style={{ color: colors.textSecondary }}>Loading price data...</Text>
      </GlassContainer>
    );
  }

  // Format price in USD (ticker.price is in USDT ≈ USD)
  const formatPrice = (price) => {
    if (!price) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(price);
  };

  return (
    <GlassContainer style={styles.container}>
      {/* Crypto Name */}
      <Text style={[
        styles.cryptoName,
        { color: colors.text, fontSize: enlarged ? 20 : 16 }
      ]}>
        {ticker.symbol}
      </Text>

      {/* Current Price */}
      <Text style={[
        styles.currentPrice,
        { color: colors.text, fontSize: enlarged ? 40 : 32 }
      ]}>
        {formatPrice(ticker.price)}
      </Text>

      {/* Last Update */}
      <Text style={[
        styles.lastUpdate,
        { color: colors.textSecondary, fontSize: enlarged ? 14 : 12 }
      ]}>
        Last updated: {ticker.lastUpdate ? new Date(ticker.lastUpdate).toLocaleTimeString() : 'N/A'}
      </Text>
    </GlassContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    marginVertical: 8,
  },
  cryptoName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  currentPrice: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  lastUpdate: {
    fontSize: 12,
    fontWeight: '400',
  },
});

export default SimplePriceDisplay;
