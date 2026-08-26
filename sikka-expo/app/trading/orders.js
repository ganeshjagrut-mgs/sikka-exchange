import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/theme/ThemeProvider';
import { GlassContainer } from '../../src/components/ui';
import useTradingStore from '../../src/store/tradingStore';
import useMarketStore from '../../src/store/marketStore';
import { convertAndFormat } from '../../src/utils/formatIndianCurrency';
import { ArrowLeft, TrendingUp, TrendingDown, X, Clock, CheckCircle, XCircle } from 'lucide-react-native';

export default function OrderHistoryScreen() {
  const router = useRouter();
  const { colors, typography } = useTheme();
  const { trades: orders, fetchTrades: fetchOrders, cancelTrade: cancelOrder, loading } = useTradingStore();
  const { exchangeRate } = useMarketStore();
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, filled, cancelled

  useEffect(() => {
    fetchOrders({ limit: 100 });
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchOrders({ limit: 100 });
    } finally {
      setRefreshing(false);
    }
  };

  const handleCancelOrder = async (orderId, symbol) => {
    Alert.alert(
      'Cancel Order',
      `Are you sure you want to cancel this order for ${symbol}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelOrder(orderId);
              Alert.alert('Success', 'Order cancelled successfully');
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to cancel order');
            }
          },
        },
      ]
    );
  };

  // Filter orders by status
  const filteredOrders = orders.filter(order => {
    if (filterStatus === 'all') return true;
    return order.status === filterStatus;
  });

  // Get status badge info
  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return { icon: Clock, color: colors.warning, label: 'Pending' };
      case 'filled':
        return { icon: CheckCircle, color: colors.success, label: 'Filled' };
      case 'cancelled':
        return { icon: XCircle, color: colors.error, label: 'Cancelled' };
      default:
        return { icon: Clock, color: colors.textSecondary, label: status };
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text, fontFamily: typography.fontFamily?.primary }]}>
          Order History
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Filter Tabs */}
      <View style={[styles.filterContainer, { backgroundColor: colors.surface }]}>
        {['all', 'pending', 'filled', 'cancelled'].map((status) => (
          <TouchableOpacity
            key={status}
            onPress={() => setFilterStatus(status)}
            style={[
              styles.filterTab,
              filterStatus === status && { backgroundColor: colors.primary },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                {
                  color: filterStatus === status ? colors.white : colors.textSecondary,
                  fontFamily: typography.fontFamily?.primary,
                },
              ]}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Orders List */}
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
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading orders...</Text>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary, fontFamily: typography.fontFamily?.primary }]}>
              {filterStatus === 'all' ? 'No orders yet' : `No ${filterStatus} orders`}
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary, fontFamily: typography.fontFamily?.primary }]}>
              Start trading to see your orders here
            </Text>
          </View>
        ) : (
          filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              colors={colors}
              typography={typography}
              exchangeRate={exchangeRate}
              onCancel={handleCancelOrder}
              getStatusBadge={getStatusBadge}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Order Card Component
function OrderCard({ order, colors, typography, exchangeRate, onCancel, getStatusBadge }) {
  const statusInfo = getStatusBadge(order.status);
  const StatusIcon = statusInfo.icon;

  // Extract base currency from token_symbol
  const baseCurrency = order.token_symbol;

  // Use backend field names
  const price = parseFloat(order.price_usdt) || 0;
  const size = parseFloat(order.quantity) || 0;
  const total = price * size;
  const fee = parseFloat(order.platform_fee_inr) || 0;
  const finalTotalINR = parseFloat(order.amount_inr) || 0;

  return (
    <GlassContainer style={[styles.orderCard, { borderLeftColor: order.side === 'buy' ? colors.success : colors.error, borderLeftWidth: 4 }]}>
      {/* Header Row */}
      <View style={styles.orderHeader}>
        <View style={styles.orderHeaderLeft}>
          {order.side === 'buy' ? (
            <TrendingUp size={20} color={colors.success} strokeWidth={2} />
          ) : (
            <TrendingDown size={20} color={colors.error} strokeWidth={2} />
          )}
          <Text
            style={[
              styles.orderSymbol,
              {
                color: order.side === 'buy' ? colors.success : colors.error,
                fontFamily: typography.fontFamily?.primary,
              },
            ]}
          >
            {order.side.toUpperCase()} {order.token_symbol}
          </Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
          <StatusIcon size={14} color={statusInfo.color} strokeWidth={2} />
          <Text style={[styles.statusText, { color: statusInfo.color, fontFamily: typography.fontFamily?.primary }]}>
            {statusInfo.label}
          </Text>
        </View>
      </View>

      {/* Order Details */}
      <View style={styles.orderDetails}>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary, fontFamily: typography.fontFamily?.primary }]}>
            Amount:
          </Text>
          <Text style={[styles.detailValue, { color: colors.text, fontFamily: typography.fontFamily?.primary }]}>
            {size} {baseCurrency}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary, fontFamily: typography.fontFamily?.primary }]}>
            Price:
          </Text>
          <Text style={[styles.detailValue, { color: colors.text, fontFamily: typography.fontFamily?.primary }]}>
            {price.toFixed(2)} USDT ({convertAndFormat(price, exchangeRate)})
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary, fontFamily: typography.fontFamily?.primary }]}>
            Total:
          </Text>
          <Text style={[styles.detailValue, { color: colors.text, fontFamily: typography.fontFamily?.primary }]}>
            {total.toFixed(2)} USDT ({convertAndFormat(total, exchangeRate)})
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary, fontFamily: typography.fontFamily?.primary }]}>
            Fee:
          </Text>
          <Text style={[styles.detailValue, { color: colors.text, fontFamily: typography.fontFamily?.primary }]}>
            ₹{fee.toFixed(2)}
          </Text>
        </View>

        <View style={[styles.detailRow, styles.totalRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.detailLabel, styles.totalLabel, { color: colors.text, fontFamily: typography.fontFamily?.primary }]}>
            {order.side === 'buy' ? 'Total Cost:' : 'Total Receive:'}
          </Text>
          <Text style={[styles.detailValue, styles.totalValue, { color: colors.text, fontFamily: typography.fontFamily?.primary }]}>
            ₹{finalTotalINR.toFixed(2)}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary, fontFamily: typography.fontFamily?.primary }]}>
            Type:
          </Text>
          <Text style={[styles.detailValue, { color: colors.text, fontFamily: typography.fontFamily?.primary }]}>
            {order.order_type.charAt(0).toUpperCase() + order.order_type.slice(1)} Order
          </Text>
        </View>
      </View>

      {/* Footer Row */}
      <View style={styles.orderFooter}>
        <Text style={[styles.timestamp, { color: colors.textSecondary, fontFamily: typography.fontFamily?.primary }]}>
          {order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}
        </Text>

        {order.status === 'pending' && (
          <TouchableOpacity
            onPress={() => onCancel(order.id, order.token_symbol)}
            style={[styles.cancelButton, { backgroundColor: colors.error + '20' }]}
          >
            <X size={16} color={colors.error} strokeWidth={2} />
            <Text style={[styles.cancelButtonText, { color: colors.error, fontFamily: typography.fontFamily?.primary }]}>
              Cancel
            </Text>
          </TouchableOpacity>
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
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
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
  orderCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  orderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderSymbol: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderDetails: {
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
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
  },
  timestamp: {
    fontSize: 12,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
