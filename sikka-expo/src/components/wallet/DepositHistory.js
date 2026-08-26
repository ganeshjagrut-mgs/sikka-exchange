import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Alert } from 'react-native';
import { Clock, CheckCircle, Info } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import useWalletStore from '../../store/walletStore';
import GlassContainer from '../ui/GlassContainer';
import { formatIndianCurrency } from '../../utils/formatIndianCurrency';

const DepositHistory = ({ responsive }) => {
  const { colors, typography } = useTheme();
  const { deposits, loading, fetchDepositHistory } = useWalletStore();
  const [refreshing, setRefreshing] = useState(false);

  // Handle pull-to-refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchDepositHistory({ limit: 10 });
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <GlassContainer style={[styles.historyCard, { padding: responsive.cardPadding, marginTop: responsive.spacing }]}>
      <View style={styles.historyHeader}>
        <Clock size={responsive.iconSize} color={colors.primary} strokeWidth={1.5} />
        <Text style={[
          styles.historyTitle,
          {
            color: colors.text,
            fontFamily: typography.fontFamily?.primary,
            fontSize: responsive.titleSize + 1,
            marginLeft: 8,
          }
        ]}>
          Recent Deposits
        </Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={handleRefresh}
          disabled={refreshing || loading}
          style={[
            styles.refreshButton,
            { opacity: (refreshing || loading) ? 0.5 : 1 }
          ]}
          activeOpacity={0.7}
        >
          {refreshing || loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[
              styles.refreshText,
              { color: colors.primary }
            ]}>
              Refresh
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {deposits && deposits.length > 0 ? (
        <View style={styles.historyList}>
          {deposits.slice(0, 5).map((deposit, index) => (
            <View key={deposit.id || index} style={[
              styles.historyItem,
              { borderColor: colors.border, borderBottomWidth: index < deposits.slice(0, 5).length - 1 ? 1 : 0 }
            ]}>
              <View style={styles.historyItemLeft}>
                <View style={[
                  styles.statusIcon,
                  { backgroundColor: deposit.status === 'success' ? '#10B98120' : deposit.status === 'pending' ? '#F59E0B20' : '#EF444420' }
                ]}>
                  {deposit.status === 'success' ? (
                    <CheckCircle size={16} color={colors.success || '#10B981'} strokeWidth={2} />
                  ) : deposit.status === 'pending' ? (
                    <Clock size={16} color={colors.warning || '#F59E0B'} strokeWidth={2} />
                  ) : (
                    <Info size={16} color={colors.error || '#EF4444'} strokeWidth={2} />
                  )}
                </View>
                <View style={styles.historyItemInfo}>
                  <Text style={[
                    styles.historyItemAmount,
                    {
                      color: colors.text,
                      fontFamily: typography.fontFamily?.bold || typography.fontFamily?.primary,
                      fontSize: responsive.titleSize,
                    }
                  ]}>
                    {formatIndianCurrency(deposit.amount_inr || deposit.amount || 0)}
                  </Text>
                  <Text style={[
                    styles.historyItemDate,
                    {
                      color: colors.textSecondary,
                      fontFamily: typography.fontFamily?.primary,
                      fontSize: responsive.titleSize - 3,
                    }
                  ]}>
                    {deposit.requested_at ? new Date(deposit.requested_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                  </Text>
                </View>
              </View>
              <View style={styles.historyItemRight}>
                <Text style={[
                  styles.historyItemStatus,
                  {
                    color: deposit.status === 'success' ? (colors.success || '#10B981') :
                           deposit.status === 'pending' ? (colors.warning || '#F59E0B') :
                           (colors.error || '#EF4444'),
                    fontFamily: typography.fontFamily?.bold || typography.fontFamily?.primary,
                    fontSize: responsive.titleSize - 2,
                    textTransform: 'capitalize',
                  }
                ]}>
                  {deposit.status || 'unknown'}
                </Text>
                {deposit.transaction_id && (
                  <Text style={[
                    styles.historyItemTransaction,
                    {
                      color: colors.textSecondary,
                      fontFamily: typography.fontFamily?.primary,
                      fontSize: responsive.titleSize - 3,
                    }
                  ]}>
                    ID: {deposit.transaction_id.substring(0, 8)}...
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      ) : !loading && !refreshing ? (
        <View style={styles.emptyState}>
          <Text style={[
            styles.emptyStateText,
            {
              color: colors.textSecondary,
              fontFamily: typography.fontFamily?.primary,
              fontSize: responsive.titleSize - 1,
            }
          ]}>
            No deposits yet. Make your first deposit to get started.
          </Text>
        </View>
      ) : null}

      {deposits && deposits.length > 5 && (
        <TouchableOpacity
          style={[
            styles.viewMoreButton,
            { marginTop: responsive.cardPadding }
          ]}
          onPress={() => {
            // TODO: Navigate to full deposit history screen
            Alert.alert('View All', 'Navigate to full deposit history screen');
          }}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.viewMoreText,
            {
              color: colors.primary,
              fontFamily: typography.fontFamily?.primary,
              fontSize: responsive.titleSize - 1,
            }
          ]}>
            View All Deposits
          </Text>
        </TouchableOpacity>
      )}
    </GlassContainer>
  );
};

const styles = StyleSheet.create({
  historyCard: {
    marginBottom: 20,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyTitle: {
    fontWeight: 'bold',
  },
  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      },
    }),
  },
  refreshText: {
    fontWeight: '600',
    fontSize: 14,
  },
  historyList: {
    gap: 4,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  historyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyItemInfo: {
    marginLeft: 12,
    flex: 1,
  },
  historyItemAmount: {
    marginBottom: 2,
  },
  historyItemDate: {
    opacity: 0.8,
  },
  historyItemRight: {
    alignItems: 'flex-end',
  },
  historyItemStatus: {
    marginBottom: 2,
  },
  historyItemTransaction: {
    opacity: 0.7,
  },
  viewMoreButton: {
    alignItems: 'center',
    paddingVertical: 8,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      },
    }),
  },
  viewMoreText: {
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyStateText: {
    textAlign: 'center',
    opacity: 0.8,
  },
});

export default DepositHistory;