import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { ArrowRight, ArrowDown, ArrowUp, RefreshCw, Inbox } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import useTransferStore from '../../store/transferStore';
import GlassContainer from '../ui/GlassContainer';

/**
 * TransferHistory Component
 *
 * Displays history of internal transfers between MAIN and TRADE accounts
 * Features:
 * - List of all transfers with timestamps
 * - Direction indicators (MAIN→TRADE or TRADE→MAIN)
 * - Transfer amounts and currencies
 * - Pull-to-refresh functionality
 * - Empty state when no transfers
 */
const TransferHistory = () => {
  const { colors, typography } = useTheme();
  const { transfers, loading, fetchTransferHistory } = useTransferStore();
  const [refreshing, setRefreshing] = React.useState(false);

  // Fetch transfer history on mount
  useEffect(() => {
    loadTransfers();
  }, []);

  const loadTransfers = async () => {
    try {
      await fetchTransferHistory({ limit: 50 });
    } catch (error) {
      console.error('Failed to load transfer history:', error);
    }
  };

  // Handle pull-to-refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTransfers();
    setRefreshing(false);
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  // Get transfer direction info
  const getTransferInfo = (transfer) => {
    const isMainToTrade = transfer.from_type === 'MAIN';

    return {
      icon: isMainToTrade ? ArrowDown : ArrowUp,
      iconColor: isMainToTrade ? colors.primary : colors.success,
      iconBg: isMainToTrade ? colors.primary + '20' : colors.success + '20',
      title: isMainToTrade ? 'Moved to Trading' : 'Moved to Main',
      subtitle: `${transfer.from_type} → ${transfer.to_type}`,
    };
  };

  // Render transfer item
  const renderTransferItem = (transfer) => {
    const info = getTransferInfo(transfer);
    const Icon = info.icon;

    return (
      <TouchableOpacity
        key={transfer.id}
        style={[styles.transferItem, { backgroundColor: colors.surface }]}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: info.iconBg }]}>
          <Icon size={20} color={info.iconColor} />
        </View>

        <View style={styles.transferInfo}>
          <Text style={[
            styles.transferTitle,
            {
              color: colors.text,
              fontFamily: typography.fontFamily?.primary,
            }
          ]}>
            {info.title}
          </Text>
          <Text style={[
            styles.transferSubtitle,
            {
              color: colors.textSecondary,
              fontFamily: typography.fontFamily?.primary,
            }
          ]}>
            {info.subtitle} • {formatDate(transfer.created_at)}
          </Text>
        </View>

        <View style={styles.amountContainer}>
          <Text style={[
            styles.transferAmount,
            {
              color: colors.text,
              fontFamily: typography.fontFamily?.bold || typography.fontFamily?.primary,
            }
          ]}>
            {parseFloat(transfer.amount).toFixed(6)}
          </Text>
          <Text style={[
            styles.transferCurrency,
            {
              color: colors.textSecondary,
              fontFamily: typography.fontFamily?.primary,
            }
          ]}>
            {transfer.currency}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Loading state
  if (loading && transfers.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[
          styles.loadingText,
          {
            color: colors.textSecondary,
            fontFamily: typography.fontFamily?.primary,
          }
        ]}>
          Loading transfers...
        </Text>
      </View>
    );
  }

  // Empty state
  if (transfers.length === 0) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.emptyContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        <View style={[styles.emptyIconContainer, { backgroundColor: colors.surface }]}>
          <Inbox size={48} color={colors.textSecondary} />
        </View>
        <Text style={[
          styles.emptyTitle,
          {
            color: colors.text,
            fontFamily: typography.fontFamily?.bold || typography.fontFamily?.primary,
          }
        ]}>
          No Transfers Yet
        </Text>
        <Text style={[
          styles.emptySubtitle,
          {
            color: colors.textSecondary,
            fontFamily: typography.fontFamily?.primary,
          }
        ]}>
          Transfer funds between your Main and Trading accounts to get started
        </Text>
        <TouchableOpacity
          onPress={handleRefresh}
          style={[styles.refreshButton, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
        >
          <RefreshCw size={20} color="#ffffff" />
          <Text style={[
            styles.refreshButtonText,
            {
              color: '#ffffff',
              fontFamily: typography.fontFamily?.primary,
            }
          ]}>
            Refresh
          </Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Transfer list
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.listContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
      }
      showsVerticalScrollIndicator={false}
    >
      <Text style={[
        styles.header,
        {
          color: colors.text,
          fontFamily: typography.fontFamily?.bold || typography.fontFamily?.primary,
        }
      ]}>
        Transfer History
      </Text>

      <View style={styles.transferList}>
        {transfers.map(renderTransferItem)}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.8,
    maxWidth: 300,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  transferList: {
    gap: 12,
  },
  transferItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transferInfo: {
    flex: 1,
  },
  transferTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  transferSubtitle: {
    fontSize: 12,
    opacity: 0.8,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  transferAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  transferCurrency: {
    fontSize: 12,
    opacity: 0.8,
  },
});

export default TransferHistory;
