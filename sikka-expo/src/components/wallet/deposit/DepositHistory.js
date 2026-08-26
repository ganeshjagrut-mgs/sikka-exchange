import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Clock, CheckCircle, Info } from 'lucide-react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import { useBreakpoints } from '../../../hooks/useBreakpoints';
import GlassContainer from '../../ui/GlassContainer';
import { formatIndianCurrency } from '../../../utils/formatIndianCurrency';

/**
 * DepositHistory Component
 *
 * Displays recent deposit history with refresh functionality
 */
const DepositHistory = ({ deposits, loading, onRefresh }) => {
  const { colors, typography } = useTheme();
  const { isMobile, isTablet } = useBreakpoints();

  // Responsive styling
  const getResponsiveStyles = () => {
    if (isMobile) {
      return {
        cardPadding: 16,
        titleSize: 16,
        iconSize: 20,
        spacing: 12,
      };
    } else if (isTablet) {
      return {
        cardPadding: 18,
        titleSize: 17,
        iconSize: 22,
        spacing: 16,
      };
    } else {
      return {
        cardPadding: 20,
        titleSize: 18,
        iconSize: 24,
        spacing: 20,
      };
    }
  };

  const responsive = getResponsiveStyles();

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
          onPress={onRefresh}
          disabled={loading}
          style={[
            styles.refreshButton,
            { opacity: loading ? 0.5 : 1 }
          ]}
          activeOpacity={0.7}
        >
          {loading ? (
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
                    {deposit.created_at ? new Date(deposit.created_at).toLocaleString() : 'N/A'}
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
      ) : !loading ? (
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
            console.log('Navigate to full deposit history screen');
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