import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, ActivityIndicator, TextInput, Alert } from 'react-native';
import { TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, AlertCircle, Copy, ArrowUpRight, ArrowDownLeft } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../theme/ThemeProvider';
import { useStore } from '../../store/useStore';
import useWalletStore from '../../store/walletStore';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import GlassContainer from '../ui/GlassContainer';
import { formatIndianCurrency } from '../../utils/formatIndianCurrency';
import { parseNumeric } from '../../utils/walletData';

/**
 * WalletTransactions Component
 * 
 * Transaction history with filtering and search capabilities
 * Features:
 * - Complete transaction history display
 * - Filter by type (buy/sell), status, date range
 * - Search by cryptocurrency or transaction ID
 * - Status indicators (completed, pending, failed)
 * - Export functionality
 * - Responsive design for all screen sizes
 */
const WalletTransactions = () => {
  const { colors, typography } = useTheme();
  const mockTransactions = useStore((state) => state.transactions); // Fallback to mock
  const [filterType, setFilterType] = useState('all'); // 'all', 'deposit', 'withdrawal', 'trade'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'completed', 'pending', 'failed'
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('all'); // 'all', '1d', '7d', '30d', '90d'

  const { isMobile, isTablet } = useBreakpoints();

  const {
    transactions: walletTransactions,
    transactionsLoading,
    transactionsError,
    hasFetchedTransactions,
    fetchTransactions,
  } = useWalletStore();

  // Fetch transactions on mount if not already fetched
  useEffect(() => {
    if (!hasFetchedTransactions && !transactionsLoading) {
      fetchTransactions({ limit: 100 }).catch((error) => {
        console.error('Failed to load transactions:', error);
      });
    }
  }, [hasFetchedTransactions, fetchTransactions, transactionsLoading]);

  // Use wallet transactions if available, otherwise fall back to mock data
  const transactions = (hasFetchedTransactions
    ? walletTransactions
    : mockTransactions) || [];

  // Format currency with proper localization
  const formatCurrency = (amount) => {
    return formatIndianCurrency(parseNumeric(amount, 0));
  };

  const formatDate = (date) => {
    const timestamp = date ? new Date(date) : new Date();
    if (Number.isNaN(timestamp.getTime())) {
      return 'N/A';
    }

    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(timestamp);
  };

  // Copy transaction ID to clipboard
  const copyTransactionId = async (txId) => {
    try {
      await Clipboard.setStringAsync(txId.toString());
      if (Platform.OS === 'web') {
        window.alert('Transaction ID copied');
      } else {
        Alert.alert('Copied', 'Transaction ID copied to clipboard');
      }
    } catch (error) {
      console.error('Failed to copy transaction ID:', error);
    }
  };

  // Filter transactions based on selected criteria
  const getFilteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter((tx) => {
        const txType = (tx.type || '').toLowerCase();
        if (filterType === 'trade') {
          return txType === 'buy' || txType === 'sell' || txType === 'trade';
        }
        if (filterType === 'p2p') {
          return txType === 'sent' || txType === 'received' || txType === 'p2p_sent' || txType === 'p2p_received';
        }
        return txType === filterType;
      });
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(tx => (tx.status || 'pending').toLowerCase() === filterStatus);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(tx =>
        (tx.crypto && tx.crypto.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (tx.id && tx.id.toString().toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Filter by date range
    if (dateRange !== 'all') {
      const now = new Date();
      const days = {
        '1d': 1,
        '7d': 7,
        '30d': 30,
        '90d': 90,
      };

      const cutoffDate = new Date(now.getTime() - (days[dateRange] * 24 * 60 * 60 * 1000));
      filtered = filtered.filter(tx => new Date(tx.date || tx.createdAt) >= cutoffDate);
    }

    // Sort by date (newest first)
    return filtered.sort(
      (a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)
    );
  }, [transactions, filterType, filterStatus, searchQuery, dateRange]);

  const filteredTransactions = getFilteredTransactions;

  // Responsive styling based on screen size
  const getResponsiveStyles = () => {
    if (isMobile) {
      return {
        cardPadding: 14,
        titleSize: 15,
        valueSize: 16,
        iconSize: 18,
        spacing: 10,
        itemPadding: 12,
      };
    } else if (isTablet) {
      return {
        cardPadding: 16,
        titleSize: 16,
        valueSize: 18,
        iconSize: 20,
        spacing: 12,
        itemPadding: 14,
      };
    } else {
      return {
        cardPadding: 18,
        titleSize: 17,
        valueSize: 20,
        iconSize: 22,
        spacing: 16,
        itemPadding: 16,
      };
    }
  };

  const responsive = getResponsiveStyles();

  const FilterButton = ({ label, value, activeFilter, onPress }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        {
          backgroundColor: activeFilter === value ? colors.primary + '20' : 'transparent',
          borderColor: colors.border,
          paddingHorizontal: responsive.itemPadding,
          paddingVertical: responsive.itemPadding * 0.6,
        }
      ]}
      onPress={() => onPress(value)}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.filterButtonText,
        {
          color: activeFilter === value ? colors.primary : colors.textSecondary,
          fontFamily: typography.fontFamily?.primary,
          fontSize: responsive.titleSize - 2,
        }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const StatusIcon = ({ status }) => {
    const statusConfig = {
      completed: { icon: CheckCircle, color: colors.success },
      pending: { icon: Clock, color: colors.warning },
      failed: { icon: XCircle, color: colors.error },
    };

    const normalized = (status || 'pending').toLowerCase();
    const config = statusConfig[normalized] || statusConfig.pending;
    const IconComponent = config.icon;

    return <IconComponent size={16} color={config.color} strokeWidth={2} />;
  };

  // Get transaction display configuration based on type
  const getTransactionDisplay = (transaction) => {
  const { type, from_currency, to_currency, fromCurrency, toCurrency, crypto } = transaction;

    // Use camelCase fields if available (from API), otherwise fallback to snake_case (from mock)
    const fromCurr = fromCurrency || from_currency;
    const toCurr = toCurrency || to_currency;

    // Comprehensive transaction type mapping
    const typeMap = {
      'deposit': {
        label: 'Deposit INR',
        Icon: TrendingUp,
        iconColor: colors.success,
        iconBg: colors.success + '20',
        amountColor: colors.success,
        prefix: '+'
      },
      'deposit_inr': {
        label: 'Deposit INR',
        Icon: TrendingUp,
        iconColor: colors.success,
        iconBg: colors.success + '20',
        amountColor: colors.success,
        prefix: '+'
      },
      'deposit_pending': {
        label: 'Deposit Pending',
        Icon: Clock,
        iconColor: colors.warning,
        iconBg: colors.warning + '20',
        amountColor: colors.warning,
        prefix: ''
      },
      'deposit_approved': {
        label: 'Deposit Approved',
        Icon: CheckCircle,
        iconColor: colors.success,
        iconBg: colors.success + '20',
        amountColor: colors.success,
        prefix: '+'
      },
      'conversion': {
        label: 'Converted to USDT',
        Icon: TrendingUp,
        iconColor: '#667eea',
        iconBg: '#667eea20',
        amountColor: colors.textSecondary,
        prefix: ''
      },
      'withdrawal': {
        label: 'Withdrawal Requested',
        Icon: TrendingDown,
        iconColor: colors.warning,
        iconBg: colors.warning + '20',
        amountColor: colors.warning,
        prefix: '-'
      },
      'withdrawal_requested': {
        label: 'Withdrawal Requested',
        Icon: TrendingDown,
        iconColor: colors.warning,
        iconBg: colors.warning + '20',
        amountColor: colors.warning,
        prefix: '-'
      },
      'withdrawal_pending': {
        label: 'Withdrawal Pending',
        Icon: Clock,
        iconColor: colors.warning,
        iconBg: colors.warning + '20',
        amountColor: colors.warning,
        prefix: '-'
      },
      'withdrawal_approved': {
        label: 'Withdrawal Approved',
        Icon: CheckCircle,
        iconColor: colors.success,
        iconBg: colors.success + '20',
        amountColor: colors.textPrimary, // Neutral - icon shows success, prefix shows outgoing
        prefix: '-'
      },
      'withdrawal_rejected': {
        label: 'Withdrawal Rejected',
        Icon: XCircle,
        iconColor: colors.error,
        iconBg: colors.error + '20',
        amountColor: colors.textSecondary,
        prefix: ''
      },
      'withdrawal_completed': {
        label: 'Withdrawal Completed',
        Icon: CheckCircle,
        iconColor: colors.success,
        iconBg: colors.success + '20',
        amountColor: colors.textPrimary, // Neutral - icon shows success, prefix shows outgoing
        prefix: '-'
      },
      'buy': {
        label: `Bought ${crypto || toCurr || 'Crypto'}`,
        Icon: TrendingUp,
        iconColor: colors.success,
        iconBg: colors.success + '20',
        amountColor: colors.error, // Money out
        prefix: '-'
      },
      'sell': {
        label: `Sold ${crypto || fromCurr || 'Crypto'}`,
        Icon: TrendingDown,
        iconColor: colors.error,
        iconBg: colors.error + '20',
        amountColor: colors.success, // Money in
        prefix: '+'
      },
      // P2P Transfer types
      'p2p_sent': {
        label: 'Sent to User',
        Icon: ArrowUpRight,
        iconColor: colors.warning,
        iconBg: colors.warning + '20',
        amountColor: colors.warning,
        prefix: '-'
      },
      'p2p_received': {
        label: 'Received from User',
        Icon: ArrowDownLeft,
        iconColor: colors.success,
        iconBg: colors.success + '20',
        amountColor: colors.success,
        prefix: '+'
      },
      'sent': {
        label: 'Sent to User',
        Icon: ArrowUpRight,
        iconColor: colors.warning,
        iconBg: colors.warning + '20',
        amountColor: colors.warning,
        prefix: '-'
      },
      'received': {
        label: 'Received from User',
        Icon: ArrowDownLeft,
        iconColor: colors.success,
        iconBg: colors.success + '20',
        amountColor: colors.success,
        prefix: '+'
      },
    };

    // Return mapped type or default
    return typeMap[type] || {
      label: type ? type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ') : 'Unknown',
      Icon: AlertCircle,
      iconColor: colors.textSecondary,
      iconBg: colors.textSecondary + '20',
      amountColor: colors.textSecondary,
      prefix: ''
    };
  };

  const TransactionItem = ({ transaction }) => {
    const display = getTransactionDisplay(transaction);
    const statusColors = {
      completed: colors.success,
      pending: colors.warning,
      failed: colors.error,
    };

    const resolvedStatus = transaction.status || 'pending';
    const statusKey = (transaction.status || 'pending').toLowerCase();

    return (
      <GlassContainer style={[styles.transactionItem, { padding: responsive.itemPadding }]}>
        <View style={styles.transactionHeader}>
          <View style={styles.transactionLeft}>
            <View style={[
              styles.typeIcon,
              {
                backgroundColor: display.iconBg,
              }
            ]}>
              <display.Icon size={responsive.iconSize - 2} color={display.iconColor} strokeWidth={2} />
            </View>

            <View style={styles.transactionInfo}>
              <Text style={[
                styles.transactionType,
                {
                  color: colors.text,
                  fontFamily: typography.fontFamily?.primary,
                  fontSize: responsive.titleSize,
                }
              ]}>
                {display.label}
              </Text>
              <TouchableOpacity
                onPress={() => copyTransactionId(transaction.id)}
                style={styles.transactionIdRow}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.transactionId,
                  {
                    color: colors.textSecondary,
                    fontFamily: typography.fontFamily?.primary,
                    fontSize: responsive.titleSize - 3,
                  }
                ]}>
                  ID: {transaction.id}
                </Text>
                <Copy size={12} color={colors.textSecondary} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.transactionRight}>
            <Text style={[
              styles.transactionAmount,
              {
                color: display.amountColor,
                fontFamily: typography.fontFamily?.bold || typography.fontFamily?.primary,
                fontSize: responsive.valueSize,
              }
            ]}>
              {display.prefix}
              {(transaction.type === 'sent' || transaction.type === 'received')
                ? `${parseNumeric(transaction.total, 0).toFixed(6)} ${transaction.crypto || 'USDT'}`
                : formatCurrency(transaction.total || transaction.from_amount || 0)
              }
            </Text>
            
            <View style={styles.statusContainer}>
              <StatusIcon status={transaction.status} />
              <Text style={[
                styles.statusText,
                {
                  color: statusColors[statusKey] || colors.textSecondary,
                  fontFamily: typography.fontFamily?.primary,
                  fontSize: responsive.titleSize - 3,
                }
              ]}>
                {statusKey.charAt(0).toUpperCase() + statusKey.slice(1)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.transactionDetails}>
          {/* Only show crypto amount and price for trades (buy/sell) */}
          {(transaction.type === 'buy' || transaction.type === 'sell') && (
            <>
              <View style={styles.detailRow}>
                <Text style={[
                  styles.detailLabel,
                  {
                    color: colors.textSecondary,
                    fontFamily: typography.fontFamily?.primary,
                    fontSize: responsive.titleSize - 3,
                  }
                ]}>
                  Amount
                </Text>
                <Text style={[
                  styles.detailValue,
                  {
                    color: colors.text,
                    fontFamily: typography.fontFamily?.primary,
                    fontSize: responsive.titleSize - 2,
                  }
                ]}>
                  {parseNumeric(transaction.amount, 0).toFixed(8)} {transaction.crypto}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={[
                  styles.detailLabel,
                  {
                    color: colors.textSecondary,
                    fontFamily: typography.fontFamily?.primary,
                    fontSize: responsive.titleSize - 3,
                  }
                ]}>
                  Price
                </Text>
                <Text style={[
                  styles.detailValue,
                  {
                    color: colors.text,
                    fontFamily: typography.fontFamily?.primary,
                    fontSize: responsive.titleSize - 2,
                  }
                ]}>
                  {formatCurrency(transaction.price || transaction.price_inr || 0)}
                </Text>
              </View>
            </>
          )}

          {/* Show counterparty for P2P transfers */}
          {(transaction.type === 'sent' || transaction.type === 'received') && transaction.metadata?.counterparty && (
            <View style={styles.detailRow}>
              <Text style={[
                styles.detailLabel,
                {
                  color: colors.textSecondary,
                  fontFamily: typography.fontFamily?.primary,
                  fontSize: responsive.titleSize - 3,
                }
              ]}>
                {transaction.type === 'sent' ? 'To' : 'From'}
              </Text>
              <Text style={[
                styles.detailValue,
                {
                  color: colors.text,
                  fontFamily: typography.fontFamily?.primary,
                  fontSize: responsive.titleSize - 2,
                }
              ]}>
                {transaction.metadata.counterparty}
              </Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={[
              styles.detailLabel,
              {
                color: colors.textSecondary,
                fontFamily: typography.fontFamily?.primary,
                fontSize: responsive.titleSize - 3,
              }
            ]}>
              Date & Time
            </Text>
            <Text style={[
              styles.detailValue,
              {
                color: colors.text,
                fontFamily: typography.fontFamily?.primary,
                fontSize: responsive.titleSize - 2,
              }
            ]}>
              {formatDate(transaction.createdAt || transaction.date)}
            </Text>
          </View>
        </View>
      </GlassContainer>
    );
  };

  return (
    <View style={styles.container}>
      {/* Filters Header */}
      <GlassContainer style={[styles.filtersContainer, { padding: responsive.cardPadding }]}>
        <Text style={[
          styles.filtersTitle,
          {
            color: colors.text,
            fontFamily: typography.fontFamily?.primary,
            fontSize: responsive.titleSize + 1,
            marginBottom: responsive.spacing,
          }
        ]}>
          Filters
        </Text>

        {/* Search Filter */}
        <View style={styles.filterSection}>
          <Text style={[
            styles.filterLabel,
            {
              color: colors.textSecondary,
              fontFamily: typography.fontFamily?.primary,
              fontSize: responsive.titleSize - 2,
            }
          ]}>
            Search
          </Text>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by asset or ID"
            placeholderTextColor={colors.textSecondary + '80'}
            style={[
              styles.searchInput,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.surfaceSecondary || colors.surface,
                fontFamily: typography.fontFamily?.primary,
                fontSize: responsive.titleSize - 1,
                padding: responsive.itemPadding * 0.8,
              }
            ]}
          />
        </View>

        {/* Type Filter */}
        <View style={styles.filterSection}>
          <Text style={[
            styles.filterLabel,
            {
              color: colors.textSecondary,
              fontFamily: typography.fontFamily?.primary,
              fontSize: responsive.titleSize - 2,
            }
          ]}>
            Type
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            <FilterButton label="All" value="all" activeFilter={filterType} onPress={setFilterType} />
            <FilterButton label="Deposit" value="deposit" activeFilter={filterType} onPress={setFilterType} />
            <FilterButton label="Withdrawal" value="withdrawal" activeFilter={filterType} onPress={setFilterType} />
            <FilterButton label="Trade" value="trade" activeFilter={filterType} onPress={setFilterType} />
            <FilterButton label="P2P" value="p2p" activeFilter={filterType} onPress={setFilterType} />
          </ScrollView>
        </View>

        {/* Status Filter */}
        <View style={styles.filterSection}>
          <Text style={[
            styles.filterLabel,
            {
              color: colors.textSecondary,
              fontFamily: typography.fontFamily?.primary,
              fontSize: responsive.titleSize - 2,
            }
          ]}>
            Status
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            <FilterButton label="All" value="all" activeFilter={filterStatus} onPress={setFilterStatus} />
            <FilterButton label="Completed" value="completed" activeFilter={filterStatus} onPress={setFilterStatus} />
            <FilterButton label="Pending" value="pending" activeFilter={filterStatus} onPress={setFilterStatus} />
          </ScrollView>
        </View>

        {/* Date Range Filter */}
        <View style={styles.filterSection}>
          <Text style={[
            styles.filterLabel,
            {
              color: colors.textSecondary,
              fontFamily: typography.fontFamily?.primary,
              fontSize: responsive.titleSize - 2,
            }
          ]}>
            Period
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            <FilterButton label="All Time" value="all" activeFilter={dateRange} onPress={setDateRange} />
            <FilterButton label="1 Day" value="1d" activeFilter={dateRange} onPress={setDateRange} />
            <FilterButton label="7 Days" value="7d" activeFilter={dateRange} onPress={setDateRange} />
            <FilterButton label="30 Days" value="30d" activeFilter={dateRange} onPress={setDateRange} />
            <FilterButton label="90 Days" value="90d" activeFilter={dateRange} onPress={setDateRange} />
          </ScrollView>
        </View>
      </GlassContainer>

      {/* Results Summary */}
      <View style={styles.summaryContainer}>
        {transactionsLoading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : transactionsError ? (
          <Text style={[
            styles.summaryText,
            {
              color: colors.error,
              fontFamily: typography.fontFamily?.primary,
              fontSize: responsive.titleSize - 1,
            }
          ]}>
            {transactionsError}
          </Text>
        ) : (
          <Text style={[
            styles.summaryText,
            {
              color: colors.textSecondary,
              fontFamily: typography.fontFamily?.primary,
              fontSize: responsive.titleSize - 1,
            }
          ]}>
            {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} found
          </Text>
        )}
      </View>

      {/* Transactions List */}
      <View style={styles.transactionsList}>
        {transactionsLoading && (walletTransactions?.length ?? 0) === 0 ? (
          <GlassContainer style={[styles.emptyContainer, { padding: responsive.cardPadding * 2 }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[
              styles.emptyTitle,
              {
                color: colors.text,
                fontFamily: typography.fontFamily?.primary,
                fontSize: responsive.titleSize + 2,
                marginTop: responsive.spacing,
              }
            ]}>
              Loading Transactions...
            </Text>
          </GlassContainer>
        ) : filteredTransactions.length > 0 ? (
          filteredTransactions.map((transaction, index) => (
            <TransactionItem key={transaction.id || `tx-${index}`} transaction={transaction} />
          ))
        ) : (
          <GlassContainer style={[styles.emptyContainer, { padding: responsive.cardPadding * 2 }]}>
            <AlertCircle size={48} color={colors.textSecondary} strokeWidth={1} />
            <Text style={[
              styles.emptyTitle,
              {
                color: colors.text,
                fontFamily: typography.fontFamily?.primary,
                fontSize: responsive.titleSize + 2,
                marginTop: responsive.spacing,
              }
            ]}>
              No Transactions Found
            </Text>
            <Text style={[
              styles.emptyText,
              {
                color: colors.textSecondary,
                fontFamily: typography.fontFamily?.primary,
                fontSize: responsive.titleSize - 1,
              }
            ]}>
              {transactionsError || 'Try adjusting your filters or search criteria'}
            </Text>
          </GlassContainer>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filtersContainer: {
    marginBottom: 16,
  },
  filtersTitle: {
    fontWeight: 'bold',
  },
  filterSection: {
    marginBottom: 12,
  },
  filterLabel: {
    opacity: 0.8,
    marginBottom: 8,
  },
  filterRow: {
    maxHeight: 50,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 8,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  filterButton: {
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      },
    }),
  },
  filterButtonText: {
    fontWeight: '500',
  },
  summaryContainer: {
    marginBottom: 12,
  },
  summaryText: {
    opacity: 0.8,
  },
  transactionsList: {
    flex: 1,
  },
  transactionItem: {
    marginBottom: 12,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
    flexShrink: 1,
    marginRight: 8,
  },
  transactionType: {
    fontWeight: 'bold',
    marginBottom: 2,
  },
  transactionId: {
    opacity: 0.8,
  },
  transactionIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionRight: {
    alignItems: 'flex-end',
    minWidth: 100,
    flexShrink: 0,
  },
  transactionAmount: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    marginLeft: 4,
    fontWeight: '500',
  },
  transactionDetails: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailLabel: {
    opacity: 0.8,
  },
  detailValue: {
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  emptyTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.8,
  },
});

export default WalletTransactions;