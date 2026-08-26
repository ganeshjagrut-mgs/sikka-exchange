import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { ArrowRightLeft, ArrowUp, ArrowDown } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import GlassContainer from '../ui/GlassContainer';
import { formatIndianCurrency } from '../../utils/formatIndianCurrency';
import useWalletStore from '../../store/walletStore';
import { parseNumeric } from '../../utils/walletData';

/**
 * Account Transfer Component
 *
 * Allows users to transfer funds between MAIN and TRADE accounts
 * Features:
 * - Transfer funds between accounts (displayed as USD)
 * - Real-time balance display in USD
 * - Transfer history with USD amounts
 * - Confirmation dialogs
 * - Error handling
 */
const AccountTransfer = () => {
  const { colors, typography } = useTheme();
  const { isMobile, isTablet } = useBreakpoints();
  const {
    balance,
    createInnerAccountTransfer,
    loading,
    error,
    fetchBalance,
  } = useWalletStore();

  const [fromAccount, setFromAccount] = useState('MAIN');
  const [toAccount, setToAccount] = useState('TRADE');
  const [amount, setAmount] = useState('');
  const [transferHistory, setTransferHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Get account balances in USD (USDT ≈ USD)
  const getAccountBalanceUSD = (accountType) => {
    if (!balance?.[accountType.toLowerCase()]?.balances) return 0;

    let totalUSD = 0;
    const accountBalances = balance[accountType.toLowerCase()].balances;

    accountBalances.forEach(entry => {
      const currency = entry.currency;
      const amt = parseNumeric(entry.balance, 0);

      if (currency === 'USDT' || currency === 'USDC') {
        // Stablecoins are 1:1 with USD
        totalUSD += amt;
      }
      // For other crypto assets, we'd need current prices - simplified for now
    });

    return totalUSD;
  };

  const mainBalanceUSD = getAccountBalanceUSD('MAIN');
  const tradeBalanceUSD = getAccountBalanceUSD('TRADE');

  // Load transfer history on mount
  useEffect(() => {
    loadTransferHistory();
  }, []);

  const loadTransferHistory = async () => {
    setLoadingHistory(true);
    try {
      const history = await useWalletStore.getState().fetchTransferHistory({ limit: 20 });
      setTransferHistory(history || []);
    } catch (err) {
      console.error('Failed to load transfer history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleTransfer = async () => {
    const transferAmount = parseFloat(amount);
    if (!transferAmount || transferAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount to transfer.');
      return;
    }

    // Check if source account has sufficient balance
    const sourceBalanceUSD = fromAccount === 'MAIN' ? mainBalanceUSD : tradeBalanceUSD;
    if (transferAmount > sourceBalanceUSD) {
      Alert.alert('Insufficient Balance', `You don't have enough funds in your ${fromAccount} account.`);
      return;
    }

    // Confirm transfer
    Alert.alert(
      'Confirm Transfer',
      `Transfer $${transferAmount} from ${fromAccount} to ${toAccount} account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Transfer',
          onPress: async () => {
            try {
              // Amount is already in USD (USDT)
              await createInnerAccountTransfer(fromAccount, toAccount, 'USDT', transferAmount);
              setAmount('');
              await fetchBalance(); // Refresh balances
              await loadTransferHistory(); // Refresh history
              Alert.alert('Success', 'Transfer completed successfully!');
            } catch (err) {
              Alert.alert('Transfer Failed', err.message || 'An error occurred during transfer.');
            }
          },
        },
      ]
    );
  };

  const swapAccounts = () => {
    const temp = fromAccount;
    setFromAccount(toAccount);
    setToAccount(temp);
  };

  const getResponsiveStyles = () => {
    if (isMobile) {
      return {
        cardPadding: 16,
        titleSize: 16,
        valueSize: 18,
        spacing: 12,
        inputWidth: '100%',
      };
    } else if (isTablet) {
      return {
        cardPadding: 18,
        titleSize: 17,
        valueSize: 20,
        spacing: 16,
        inputWidth: '80%',
      };
    } else {
      return {
        cardPadding: 20,
        titleSize: 18,
        valueSize: 22,
        spacing: 20,
        inputWidth: '60%',
      };
    }
  };

  const responsive = getResponsiveStyles();

  const formatCurrency = (amount) => formatIndianCurrency(amount);

  return (
    <View style={styles.container}>
      {/* Transfer Form */}
      <GlassContainer style={[styles.transferCard, { padding: responsive.cardPadding }]}>
        <View style={styles.cardHeader}>
          <ArrowRightLeft size={responsive.titleSize + 4} color={colors.primary} />
          <Text style={[
            styles.cardTitle,
            {
              color: colors.text,
              fontFamily: typography.fontFamily?.bold || typography.fontFamily?.primary,
              fontSize: responsive.titleSize + 2,
            }
          ]}>
            Account Transfer
          </Text>
        </View>

        <Text style={[
          styles.cardSubtitle,
          {
            color: colors.textSecondary,
            fontFamily: typography.fontFamily?.primary,
            fontSize: responsive.titleSize - 2,
          }
        ]}>
          Transfer USDT between your MAIN and TRADE accounts
        </Text>

        {/* Account Selection */}
        <View style={styles.accountSelection}>
          <View style={styles.accountOption}>
            <Text style={[
              styles.accountLabel,
              {
                color: colors.textSecondary,
                fontFamily: typography.fontFamily?.primary,
                fontSize: responsive.titleSize - 1,
              }
            ]}>
              From
            </Text>
            <TouchableOpacity
              style={[
                styles.accountButton,
                {
                  backgroundColor: fromAccount === 'MAIN' ? colors.primary + '20' : colors.background + '50',
                  borderColor: fromAccount === 'MAIN' ? colors.primary : colors.border,
                }
              ]}
              onPress={() => setFromAccount('MAIN')}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.accountButtonText,
                {
                  color: fromAccount === 'MAIN' ? colors.primary : colors.text,
                  fontFamily: typography.fontFamily?.primary,
                  fontSize: responsive.titleSize,
                }
              ]}>
                MAIN Account
              </Text>
              <Text style={[
                styles.accountBalance,
                {
                  color: colors.textSecondary,
                  fontFamily: typography.fontFamily?.primary,
                  fontSize: responsive.titleSize - 2,
                }
              ]}>
                {formatCurrency(mainBalanceUSD)} USD
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.swapButton}
            onPress={swapAccounts}
            activeOpacity={0.7}
          >
            <ArrowUp size={20} color={colors.primary} />
            <ArrowDown size={20} color={colors.primary} />
          </TouchableOpacity>

          <View style={styles.accountOption}>
            <Text style={[
              styles.accountLabel,
              {
                color: colors.textSecondary,
                fontFamily: typography.fontFamily?.primary,
                fontSize: responsive.titleSize - 1,
              }
            ]}>
              To
            </Text>
            <TouchableOpacity
              style={[
                styles.accountButton,
                {
                  backgroundColor: toAccount === 'TRADE' ? colors.primary + '20' : colors.background + '50',
                  borderColor: toAccount === 'TRADE' ? colors.primary : colors.border,
                }
              ]}
              onPress={() => setToAccount('TRADE')}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.accountButtonText,
                {
                  color: colors.text,
                  fontFamily: typography.fontFamily?.primary,
                  fontSize: responsive.titleSize,
                }
              ]}>
                TRADE Account
              </Text>
              <Text style={[
                styles.accountBalance,
                {
                  color: colors.textSecondary,
                  fontFamily: typography.fontFamily?.primary,
                  fontSize: responsive.titleSize - 2,
                }
              ]}>
                {formatCurrency(tradeBalanceUSD)} USD
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Amount Input */}
        <View style={styles.amountSection}>
          <Text style={[
            styles.amountLabel,
            {
              color: colors.text,
              fontFamily: typography.fontFamily?.primary,
              fontSize: responsive.titleSize,
            }
          ]}>
            Amount (USD)
          </Text>
          <TextInput
            style={[
              styles.amountInput,
              {
                borderColor: colors.border,
                color: colors.text,
                fontFamily: typography.fontFamily?.primary,
                fontSize: responsive.valueSize,
                width: responsive.inputWidth,
              }
            ]}
            placeholder="0.00"
            placeholderTextColor={colors.textSecondary + '80'}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            autoCapitalize="none"
          />
        </View>

        {/* Transfer Button */}
        <TouchableOpacity
          style={[
            styles.transferButton,
            {
              backgroundColor: loading ? colors.textSecondary + '50' : colors.primary,
              opacity: loading ? 0.6 : 1,
            }
          ]}
          onPress={handleTransfer}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <ArrowRightLeft size={20} color="#ffffff" />
              <Text style={[
                styles.transferButtonText,
                {
                  color: '#ffffff',
                  fontFamily: typography.fontFamily?.bold || typography.fontFamily?.primary,
                  fontSize: responsive.titleSize,
                }
              ]}>
                Transfer USD
              </Text>
            </>
          )}
        </TouchableOpacity>

        {error && (
          <Text style={[
            styles.errorText,
            {
              color: colors.error,
              fontFamily: typography.fontFamily?.primary,
              fontSize: responsive.titleSize - 2,
            }
          ]}>
            {error}
          </Text>
        )}
      </GlassContainer>

      {/* Transfer History */}
      <GlassContainer style={[styles.historyCard, { padding: responsive.cardPadding }]}>
        <View style={styles.cardHeader}>
          <Text style={[
            styles.cardTitle,
            {
              color: colors.text,
              fontFamily: typography.fontFamily?.bold || typography.fontFamily?.primary,
              fontSize: responsive.titleSize + 2,
            }
          ]}>
            Transfer History
          </Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={loadTransferHistory}
            disabled={loadingHistory}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.refreshButtonText,
              {
                color: colors.primary,
                fontFamily: typography.fontFamily?.primary,
                fontSize: responsive.titleSize - 2,
              }
            ]}>
              {loadingHistory ? 'Loading...' : 'Refresh'}
            </Text>
          </TouchableOpacity>
        </View>

        {loadingHistory ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : transferHistory.length > 0 ? (
          <View style={styles.historyList}>
            {transferHistory.slice(0, 10).map((transfer, index) => (
              <View key={transfer.id || index} style={styles.historyItem}>
                <View style={styles.historyLeft}>
                  <Text style={[
                    styles.historyDirection,
                    {
                      color: colors.text,
                      fontFamily: typography.fontFamily?.primary,
                      fontSize: responsive.titleSize - 1,
                    }
                  ]}>
                    {transfer.direction === 'OUT' ? 'MAIN → TRADE' : 'TRADE → MAIN'}
                  </Text>
                  <Text style={[
                    styles.historyDate,
                    {
                      color: colors.textSecondary,
                      fontFamily: typography.fontFamily?.primary,
                      fontSize: responsive.titleSize - 3,
                    }
                  ]}>
                    {new Date(transfer.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.historyRight}>
                  <Text style={[
                    styles.historyAmount,
                    {
                      color: colors.text,
                      fontFamily: typography.fontFamily?.primary,
                      fontSize: responsive.titleSize - 1,
                    }
                  ]}>
                    {formatCurrency(transfer.amount_usdt)} USD
                  </Text>
                  <Text style={[
                    styles.historyStatus,
                    {
                      color: transfer.status === 'completed' ? colors.success : colors.warning,
                      fontFamily: typography.fontFamily?.primary,
                      fontSize: responsive.titleSize - 3,
                    }
                  ]}>
                    {transfer.status}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[
            styles.emptyText,
            {
              color: colors.textSecondary,
              fontFamily: typography.fontFamily?.primary,
              fontSize: responsive.titleSize - 1,
              textAlign: 'center',
            }
          ]}>
            No transfers yet
          </Text>
        )}
      </GlassContainer>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  transferCard: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    marginLeft: 8,
    fontWeight: 'bold',
  },
  cardSubtitle: {
    marginBottom: 20,
    opacity: 0.8,
  },
  accountSelection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  accountOption: {
    flex: 1,
    alignItems: 'center',
  },
  accountLabel: {
    marginBottom: 8,
    opacity: 0.8,
  },
  accountButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    minWidth: 120,
  },
  accountButtonText: {
    fontWeight: '600',
    marginBottom: 4,
  },
  accountBalance: {
    opacity: 0.8,
  },
  swapButton: {
    padding: 12,
    marginHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountSection: {
    marginBottom: 20,
    alignItems: 'center',
  },
  amountLabel: {
    marginBottom: 8,
    fontWeight: '600',
  },
  amountInput: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  transferButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  transferButtonText: {
    fontWeight: 'bold',
  },
  errorText: {
    marginTop: 12,
    textAlign: 'center',
  },
  historyCard: {
    flex: 1,
  },
  refreshButton: {
    padding: 8,
  },
  refreshButtonText: {
    opacity: 0.8,
  },
  historyList: {
    gap: 12,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
  },
  historyLeft: {
    flex: 1,
  },
  historyDirection: {
    fontWeight: '600',
    marginBottom: 2,
  },
  historyDate: {
    opacity: 0.8,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyAmount: {
    fontWeight: '600',
    marginBottom: 2,
  },
  historyStatus: {
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emptyText: {
    padding: 20,
    opacity: 0.8,
  },
});

export default AccountTransfer;