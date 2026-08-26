import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useBreakpoints } from '../../src/hooks/useBreakpoints';
import { TradingPanel } from '../../src/components/trading';
import TradingViewChart from '../../src/components/trading/TradingViewChart';
import useTradingStore from '../../src/store/tradingStore';
import useMarketStore from '../../src/store/marketStore';

export default function TradingDetailScreen() {
  const { symbol } = useLocalSearchParams();
  const { colors, typography } = useTheme();
  const { isMobile } = useBreakpoints();
  const { orders, fetchOrders } = useTradingStore();
  const { initialize: initializeMarket } = useMarketStore();

  // Initialize market data (fetch prices) when page loads
  useEffect(() => {
    if (symbol) {
      console.log('[TradingDetail] Trading symbol:', symbol);
      initializeMarket(); // Fetch prices like main trading tab does
    }
  }, [symbol, initializeMarket]);

  // Fetch recent orders for this token
  useEffect(() => {
    fetchOrders({ limit: 5 });
  }, [fetchOrders]);

  // Filter orders for current symbol
  const symbolOrders = orders.filter(order => order.token_symbol === symbol);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <Stack.Screen
        options={{
          title: `Trade ${symbol}`,
          headerShown: true,
          headerBackTitle: 'Markets',
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontFamily: typography.fontFamily?.primary,
            fontWeight: '700',
          },
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { padding: isMobile ? 12 : 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Live Price Chart - TradingView shows price, ticker, and chart */}
        <View style={styles.chartWrapper}>
          <TradingViewChart symbol={`${symbol}-USDT`} height={280} />
        </View>

        {/* Trading Panel (main functionality) */}
        <TradingPanel />

        {/* Recent Orders for this token */}
        {symbolOrders.length > 0 && (
          <View style={[styles.recentOrdersSection, { backgroundColor: colors.surface + '30', borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: typography.fontFamily?.primary }]}>
              Recent {symbol} Orders
            </Text>

            {symbolOrders.slice(0, 3).map((order) => (
              <View
                key={order.id}
                style={[styles.orderItem, { borderBottomColor: colors.border }]}
              >
                <View style={styles.orderLeft}>
                  <Text style={[
                    styles.orderSide,
                    {
                      color: order.side === 'buy' ? colors.success : colors.error,
                      fontFamily: typography.fontFamily?.primary
                    }
                  ]}>
                    {order.side.toUpperCase()}
                  </Text>
                  <Text style={[styles.orderAmount, { color: colors.text, fontFamily: typography.fontFamily?.primary }]}>
                    {order.quantity} {order.token_symbol}
                  </Text>
                </View>
                <View style={styles.orderRight}>
                  <Text style={[
                    styles.orderStatus,
                    {
                      color: order.status === 'filled' ? colors.success : colors.warning,
                      fontFamily: typography.fontFamily?.primary
                    }
                  ]}>
                    {order.status}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  chartWrapper: {
    marginBottom: 16,
  },

  // Recent Orders Section
  recentOrdersSection: {
    marginTop: 16,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  orderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orderSide: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 40,
  },
  orderAmount: {
    fontSize: 14,
    fontWeight: '500',
  },
  orderRight: {
    alignItems: 'flex-end',
  },
  orderStatus: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
