import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TextInput, TouchableOpacity, Platform, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useStore } from '../../src/store/useStore';
import { useBreakpoints } from '../../src/hooks/useBreakpoints';
import GlassContainer from '../../src/components/ui/GlassContainer';
import { TradingSearch, TradingMarketList } from '../../src/components/trading';
import useTradingStore from '../../src/store/tradingStore';
import useMarketStore from '../../src/store/marketStore';
import {
  BarChart3,
  Activity,
  DollarSign,
  Clock,
  History,
} from 'lucide-react-native';

export default function TradingScreen() {
  const router = useRouter();
  const { colors, typography } = useTheme();
  const { selectedCrypto, setSelectedCrypto, user = {} } = useStore();
  const { isMobile, isTablet, isDesktop, screenWidth, breakpoint } = useBreakpoints();
  const { orders, fetchOrders, getRecentTrades } = useTradingStore();
  const { initialize: initializeMarket } = useMarketStore();

  // Trading state
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        initializeMarket(),
        fetchOrders({ limit: 5 }),
      ]);
    } catch (error) {
      console.error('Error refreshing trading data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Reset search when screen comes into focus (e.g., when navigating back)
  useFocusEffect(
    useCallback(() => {
      setSearchTerm('');
    }, [])
  );

  // Initialize market store and fetch orders on mount
  useEffect(() => {
    console.log('📊 Trading screen mounted, initializing market...');
    initializeMarket();
    fetchOrders({ limit: 5 });
  }, [initializeMarket, fetchOrders]);

  // Responsive grid columns calculation
  const getGridColumns = () => {
    if (isMobile) return 1;      // Mobile: Single column layout
    if (isTablet) return 2;      // Tablet: 2 column layout
    return 4;                    // Desktop: 4 column layout (market list + chart + trading panels)
  };

  const gridColumns = getGridColumns();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { padding: isMobile ? 12 : 16, paddingTop: isMobile ? 24 : 16 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* TradingSearch Component */}
        <TradingSearch
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />

        {/* Token List - Full Width */}
        <TradingMarketList
          searchTerm={searchTerm}
          style={{ flex: 1 }}
        />

        {/* Recent Orders Section */}
        {orders.length > 0 && (
          <GlassContainer style={[styles.recentOrdersCard, { marginTop: 16 }]}>
            <View style={styles.recentOrdersHeader}>
              <Text style={[styles.recentOrdersTitle, { color: colors.text, fontFamily: typography.fontFamily?.primary }]}>
                Recent Orders
              </Text>
              <TouchableOpacity onPress={() => router.push('/trading/orders')} style={styles.viewAllButton}>
                <Text style={[styles.viewAllText, { color: colors.primary, fontFamily: typography.fontFamily?.primary }]}>
                  View All
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.ordersList}>
              {orders.slice(0, 3).map((order) => (
                <TouchableOpacity
                  key={order.id}
                  onPress={() => router.push('/trading/orders')}
                  style={[styles.orderItem, { borderBottomColor: colors.border }]}
                >
                  <View style={styles.orderItemLeft}>
                    {order.side === 'buy' ? (
                      <Activity size={16} color={colors.success} />
                    ) : (
                      <Activity size={16} color={colors.error} />
                    )}
                    <Text style={[styles.orderSymbol, { color: colors.text, fontFamily: typography.fontFamily?.primary }]}>
                      {order.side.toUpperCase()} {order.token_symbol}
                    </Text>
                  </View>
                  <View style={styles.orderItemRight}>
                    <Text style={[styles.orderAmount, { color: colors.text, fontFamily: typography.fontFamily?.primary }]}>
                      {order.quantity} {order.token_symbol}
                    </Text>
                    <Text style={[styles.orderStatus, { color: order.status === 'filled' ? colors.success : colors.warning, fontFamily: typography.fontFamily?.primary }]}>
                      {order.status}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.quickLinks}>
              <TouchableOpacity
                onPress={() => router.push('/trading/orders')}
                style={[styles.quickLinkButton, { backgroundColor: colors.surface }]}
              >
                <Clock size={18} color={colors.primary} />
                <Text style={[styles.quickLinkText, { color: colors.text, fontFamily: typography.fontFamily?.primary }]}>
                  All Orders
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/trading/trades')}
                style={[styles.quickLinkButton, { backgroundColor: colors.surface }]}
              >
                <History size={18} color={colors.primary} />
                <Text style={[styles.quickLinkText, { color: colors.text, fontFamily: typography.fontFamily?.primary }]}>
                  Trade History
                </Text>
              </TouchableOpacity>
            </View>
          </GlassContainer>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper functions for responsive design
const getResponsiveSpacing = (isMobile, isTablet) => {
  if (isMobile) return { marginBottom: 12 };
  if (isTablet) return { marginBottom: 16 };
  return { marginBottom: 20 };
};

const getResponsiveFontSize = (type, isMobile, isTablet) => {
  const fontSizes = {
    title: isMobile ? 24 : isTablet ? 28 : 32,
    subtitle: isMobile ? 14 : isTablet ? 16 : 18,
    sectionTitle: isMobile ? 16 : isTablet ? 18 : 20,
    statValue: isMobile ? 16 : isTablet ? 18 : 20,
  };
  
  return { fontSize: fontSizes[type] || 16 };
};

// Stats grid styling moved to TradingHeader component

const getTradingGridStyle = (isMobile, isTablet, isDesktop) => ({
  flexDirection: isMobile ? 'column' : 'row',
  gap: isMobile ? 12 : isTablet ? 16 : 20,
  flex: 1,
});

const getMarketListStyle = (isMobile, isTablet) => ({
  flex: isMobile ? 0 : isTablet ? 1.5 : 1.5, // 60% width on tablet/desktop
});

const getChartTradingStyle = (isMobile, isTablet, isDesktop) => ({
  flex: isMobile ? 0 : isTablet ? 1 : 1, // 40% width on tablet/desktop
  flexDirection: 'column',
  gap: isMobile ? 12 : 16,
});

const getChartCardStyle = (isMobile, isTablet) => ({
  minHeight: isMobile ? 250 : isTablet ? 300 : 400,
  flex: 1,
});

const getTradingCardStyle = (isMobile, isTablet) => ({
  minHeight: isMobile ? 200 : isTablet ? 250 : 300,
});

const getChartPlaceholderStyle = (isMobile, isTablet) => ({
  minHeight: isMobile ? 200 : isTablet ? 250 : 350,
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 100, // Tab bar height (60) + buffer for bottom drawer clearance
  },
  
  // Header styles moved to TradingHeader component
  
  // Search and Filters handled by TradingSearch component
  
  // Trading Grid Layout
  tradingGrid: {
    flex: 1,
  },
  
  // Market List
  marketListCard: {
    padding: 16,
  },
  
  // Chart and Trading Section
  chartTradingSection: {
    flex: 1,
  },
  chartCard: {
    padding: 16,
  },
  tradingCard: {
    padding: 16,
  },
  
  // Section Headers
  sectionHeader: {
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionTitle: {
    fontWeight: '600',
  },
  
  // Placeholder Styles
  marketListPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    opacity: 0.7,
  },
  chartPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    opacity: 0.7,
  },
  tradingPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    opacity: 0.7,
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  placeholderSubtext: {
    fontSize: 14,
    marginTop: 8,
    opacity: 0.8,
    textAlign: 'center',
  },
  
  // Recent Orders Section
  recentOrdersCard: {
    padding: 16,
  },
  recentOrdersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  recentOrdersTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  viewAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  ordersList: {
    marginBottom: 16,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  orderItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderSymbol: {
    fontSize: 14,
    fontWeight: '600',
  },
  orderItemRight: {
    alignItems: 'flex-end',
  },
  orderAmount: {
    fontSize: 14,
    fontWeight: '500',
  },
  orderStatus: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  quickLinks: {
    flexDirection: 'row',
    gap: 12,
  },
  quickLinkButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  quickLinkText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Trade Button
  tradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginTop: 12,
    gap: 8,
  },
  tradeButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Debug Styles (Development Only)
  debugCard: {
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  debugText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});