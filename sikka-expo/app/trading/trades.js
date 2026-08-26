import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/theme/ThemeProvider';
import { GlassContainer } from '../../src/components/ui';
import useTradingStore from '../../src/store/tradingStore';
import useMarketStore from '../../src/store/marketStore';
import { convertAndFormat } from '../../src/utils/formatIndianCurrency';
import { ArrowLeft, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react-native';

export default function TradeHistoryScreen() {
  const router = useRouter();
  const { colors, typography } = useTheme();
  const { trades, fetchTrades, loading } = useTradingStore();
  const { exchangeRate } = useMarketStore();
  const [refreshing, setRefreshing] = useState(false);
  const [filterSymbol, setFilterSymbol] = useState('all'); // all, BTC-USDT, ETH-USDT, etc.

  useEffect(() => {
    fetchTrades({ limit: 100 });
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchTrades({ limit: 100 });
    } finally {
      setRefreshing(false);
    }
  };

  // Get unique symbols from trades
  const uniqueSymbols = ['all', ...new Set(trades.filter(t => t.token_symbol).map(trade => trade.token_symbol))];

  // Filter trades by symbol
  const filteredTrades = trades.filter(trade => {
    if (filterSymbol === 'all') return true;
    return trade.token_symbol === filterSymbol;
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text, fontFamily: typography.fontFamily?.primary }]}>
          Trade History
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Filter Tabs */}
      {uniqueSymbols.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.filterContainer, { backgroundColor: colors.surface }]}
          contentContainerStyle={styles.filterContent}
        >
          {uniqueSymbols.map((symbol) => (
            <TouchableOpacity
              key={symbol}
              onPress={() => setFilterSymbol(symbol)}
              style={[
                styles.filterTab,
                filterSymbol === symbol && { backgroundColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  {
                    color: filterSymbol === symbol ? colors.white : colors.textSecondary,
                    fontFamily: typography.fontFamily?.primary,
                  },
                ]}
              >
                {symbol === 'all' ? 'All' : symbol}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Trades List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading trades...</Text>
          </View>
        ) : filteredTrades.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary, fontFamily: typography.fontFamily?.primary }]}>
              {filterSymbol === 'all' ? 'No trades yet' : `No trades for ${filterSymbol}`}
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary, fontFamily: typography.fontFamily?.primary }]}>
              Executed trades will appear here
            </Text>
          </View>
        ) : (
          filteredTrades.map((trade) => (
            <TradeCard
              key={trade.id}
              trade={trade}
              colors={colors}
              typography={typography}
              exchangeRate={exchangeRate}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Trade Card Component
function TradeCard({ trade, colors, typography, exchangeRate }) {
  // Use token_symbol directly (e.g., 'BTC', 'ETH')
  const baseCurrency = trade.token_symbol || 'UNKNOWN';

  // Use actual backend fields - NO FALLBACKS, only show if data exists
  const priceUSDT = trade.price_usdt ? parseFloat(trade.price_usdt) : null;
  const quantity = trade.quantity ? parseFloat(trade.quantity) : null;
  const amountINR = trade.amount_inr ? parseFloat(trade.amount_inr) : null;

  // Don't render card if essential data is missing
  if (!priceUSDT || !quantity || !amountINR) {
    return null;
  }

  return (
    <GlassContainer style={[styles.tradeCard, { borderLeftColor: trade.side === 'buy' ? colors.success : colors.error, borderLeftWidth: 4 }]}>
      {/* Header Row */}
      <View style={styles.tradeHeader}>
        <View style={styles.tradeHeaderLeft}>
          {trade.side === 'buy' ? (
            <TrendingUp size={20} color={colors.success} strokeWidth={2} />
          ) : (
            <TrendingDown size={20} color={colors.error} strokeWidth={2} />
          )}
          <Text
            style={[
              styles.tradeSymbol,
              {
                color: trade.side === 'buy' ? colors.success : colors.error,
                fontFamily: typography.fontFamily?.primary,
              },
            ]}
          >
            {trade.side.toUpperCase()} {trade.token_symbol || 'UNKNOWN'}
          </Text>
        </View>

        <View style={[styles.executedBadge, { backgroundColor: colors.success + '20' }]}>
          <CheckCircle size={14} color={colors.success} strokeWidth={2} />
          <Text style={[styles.executedText, { color: colors.success, fontFamily: typography.fontFamily?.primary }]}>
            Executed
          </Text>
        </View>
      </View>

      {/* Trade Details */}
      <View style={styles.tradeDetails}>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary, fontFamily: typography.fontFamily?.primary }]}>
            Amount:
          </Text>
          <Text style={[styles.detailValue, { color: colors.text, fontFamily: typography.fontFamily?.primary }]}>
            {quantity} {baseCurrency}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary, fontFamily: typography.fontFamily?.primary }]}>
            Price per {baseCurrency}:
          </Text>
          <Text style={[styles.detailValue, { color: colors.text, fontFamily: typography.fontFamily?.primary }]}>
            {convertAndFormat(priceUSDT, exchangeRate)}
          </Text>
        </View>

        <View style={[styles.detailRow, styles.totalRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.detailLabel, styles.totalLabel, { color: colors.text, fontFamily: typography.fontFamily?.primary }]}>
            {trade.side === 'buy' ? 'Total Paid:' : 'Total Received:'}
          </Text>
          <Text style={[styles.detailValue, styles.totalValue, { color: colors.text, fontFamily: typography.fontFamily?.primary }]}>
            ₹{amountINR.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>
      </View>

      {/* Footer Row */}
      <View style={styles.tradeFooter}>
        <Text style={[styles.timestamp, { color: colors.textSecondary, fontFamily: typography.fontFamily?.primary }]}>
          {new Date(trade.created_at).toLocaleString()}
        </Text>
        {trade.order_id && (
          <Text style={[styles.orderId, { color: colors.textSecondary, fontFamily: typography.fontFamily?.primary }]}>
            Order #{trade.order_id.substring(0, 8)}...
          </Text>
        )}
      </View>
    </GlassContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  filterContainer: {
    backgroundColor: 'transparent',
    maxHeight: 60, // Prevent excessive height
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 60, // Ensure buttons don't wrap text unnecessarily
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
  },
  tradeCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
  },
  tradeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tradeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tradeSymbol: {
    fontSize: 16,
    fontWeight: '700',
  },
  executedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  executedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tradeDetails: {
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalRow: {
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 4,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'right',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  tradeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
  },
  timestamp: {
    fontSize: 12,
  },
  orderId: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
});
