import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import useMarketStore from '../../src/store/marketStore';
import { convertAndFormat } from '../../src/utils/formatIndianCurrency';
import CryptoIcon from '../../src/components/ui/CryptoIcon';
import TradingViewChart from '../../src/components/trading/TradingViewChart';

export default function CryptoDetailScreen() {
  const params = useLocalSearchParams();
  const { symbol } = params; // e.g., "BTC-USDT"
  const { getTicker, subscribe, unsubscribe, exchangeRate } = useMarketStore();

  const [ticker, setTicker] = useState(null);

  // Extract crypto symbol (BTC from BTC-USDT)
  // Backend returns tickers with keys like "BTC", not "BTC-USDT"
  const cryptoSymbol = symbol ? symbol.split('-')[0] : '';
  const isPositive = ticker?.change24h >= 0;

  // Subscribe to ticker updates
  useEffect(() => {
    if (!cryptoSymbol) return;

    console.log('📈 Detail screen: Subscribing to', cryptoSymbol);

    // Get initial ticker (use base symbol like "BTC")
    const initialTicker = getTicker(cryptoSymbol);
    if (initialTicker) {
      setTicker(initialTicker);
    }

    // Subscribe to updates (use full symbol for WebSocket)
    subscribe(symbol);

    // Update ticker periodically (use base symbol for lookup)
    const interval = setInterval(() => {
      const updatedTicker = getTicker(cryptoSymbol);
      if (updatedTicker) {
        setTicker(updatedTicker);
      }
    }, 5000); // Update every 5 seconds (TradingView handles real-time chart updates)

    return () => {
      console.log('📈 Detail screen: Unsubscribing from', symbol);
      unsubscribe(symbol);
      clearInterval(interval);
    };
  }, [cryptoSymbol, symbol]);

  // Loading state
  if (!ticker) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#54c255" />
          <Text style={styles.loadingText}>Loading {cryptoSymbol}...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <CryptoIcon symbol={cryptoSymbol} size={48} style={styles.cryptoIcon} />
            <View>
              <Text style={styles.headerTitle}>{cryptoSymbol}</Text>
              <Text style={styles.headerSubtitle}>{symbol}</Text>
            </View>
          </View>
        </View>

        {/* Price Section */}
        <View style={styles.priceSection}>
          <Text style={styles.currentPrice}>
            {convertAndFormat(ticker.price, exchangeRate)}
          </Text>
          <View style={[styles.changeContainer, {
            backgroundColor: isPositive ? 'rgba(84, 194, 85, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          }]}>
            {isPositive ? (
              <TrendingUp size={16} color="#54c255" />
            ) : (
              <TrendingDown size={16} color="#ef4444" />
            )}
            <Text style={[styles.changeText, {
              color: isPositive ? '#54c255' : '#ef4444'
            }]}>
              {ticker.change24h > 0 ? '+' : ''}{ticker.change24h?.toFixed(2)}% (24h)
            </Text>
          </View>
        </View>

        {/* TradingView Price Chart */}
        <View style={styles.chartContainer}>
          <Text style={styles.sectionTitle}>Live Price Chart</Text>
          <TradingViewChart symbol={symbol} height={280} />
        </View>

        {/* Market Stats */}
        <BlurView intensity={80} tint="dark" style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Market Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Best Bid</Text>
              <Text style={styles.statValue}>
                {convertAndFormat(ticker.bestBid, exchangeRate)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Best Ask</Text>
              <Text style={styles.statValue}>
                {convertAndFormat(ticker.bestAsk, exchangeRate)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Spread</Text>
              <Text style={styles.statValue}>
                {ticker.spread?.toFixed(2)}%
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Last Update</Text>
              <Text style={styles.statValue}>
                {ticker.lastUpdate ? new Date(ticker.lastUpdate).toLocaleTimeString() : 'N/A'}
              </Text>
            </View>
          </View>
        </BlurView>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={[styles.actionButton, styles.buyButton]} disabled>
            <Text style={styles.actionButtonText}>Buy {cryptoSymbol}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.sellButton]} disabled>
            <Text style={styles.actionButtonText}>Sell {cryptoSymbol}</Text>
          </TouchableOpacity>
        </View>

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          Trading is currently disabled. Buy/Sell functionality will be available in Phase 5.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181a2a',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cryptoIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cryptoIconText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 2,
  },
  priceSection: {
    marginBottom: 24,
  },
  currentPrice: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 6,
  },
  changeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  chartContainer: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsContainer: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
  },
  statLabel: {
    color: '#6b7280',
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.5,
  },
  buyButton: {
    backgroundColor: '#54c255',
  },
  sellButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disclaimer: {
    color: '#6b7280',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
