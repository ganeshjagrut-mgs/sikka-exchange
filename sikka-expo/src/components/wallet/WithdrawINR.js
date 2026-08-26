import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { Send, Building2, User, Hash, DollarSign, AlertCircle, CheckCircle, Clock, X } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useStore } from '../../store/useStore';
import useWalletStore from '../../store/walletStore';
import useKYCStore from '../../store/kycStore';
import { router } from 'expo-router';
import useBankAccountStore from '../../store/bankAccountStore';
import useWithdrawalStore from '../../store/withdrawalStore';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import GlassContainer from '../ui/GlassContainer';
import { formatIndianCurrency } from '../../utils/formatIndianCurrency';

/**
 * WithdrawUSD Component (formerly WithdrawINR)
 *
 * Withdrawal interface with backend integration
 * Features:
 * - Real bank account selection from backend
 * - USD/USDT direct withdrawal
 * - Amount validation against real balance
 * - Withdrawal request to backend
 * - Withdrawal history with status
 * - Status polling for pending withdrawals
 * - Fee calculation
 */
const WithdrawINR = () => {
  const { colors, typography } = useTheme();
  const { user } = useStore();
  const { balance, fetchBalance } = useWalletStore();
  const { kycStatus } = useKYCStore();
  const { accounts, loading: loadingAccounts, fetchAccounts } = useBankAccountStore();
  const { withdrawals, loading: loadingWithdrawals, createWithdrawal, fetchWithdrawals } = useWithdrawalStore();
  const { isMobile, isTablet } = useBreakpoints();

  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedBankId, setSelectedBankId] = useState(null);
  const [errors, setErrors] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(null);

  // Constants - All amounts now in USD
  const WITHDRAWAL_FEE_PERCENTAGE = 0; // 0% fee
  const MIN_WITHDRAWAL_USD = 10;
  const MAX_WITHDRAWAL_USD = 10000;

  // Fetch data on mount
  useEffect(() => {
    loadData();

    // Start polling for pending withdrawals every 30 seconds
    const interval = setInterval(() => {
      if (hasPendingWithdrawals()) {
        fetchWithdrawals({ status: 'pending' });
      }
    }, 30000);

    setPollingInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  // Auto-select default bank account
  useEffect(() => {
    if (accounts.length > 0 && !selectedBankId) {
      const defaultAccount = accounts.find(acc => acc.is_default);
      if (defaultAccount) {
        setSelectedBankId(defaultAccount.id);
      } else {
        setSelectedBankId(accounts[0].id);
      }
    }
  }, [accounts]);

  const loadData = async () => {
    try {
      await Promise.all([
        fetchBalance(),
        fetchAccounts(),
        fetchWithdrawals({ limit: 10 }),
      ]);
    } catch (error) {
      console.error('Failed to load withdrawal data:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const hasPendingWithdrawals = () => {
    return withdrawals.some(w => w.status === 'pending');
  };

  // Get available USDT balance (from TRADE account)
  const getAvailableUSDT = () => {
    if (!balance) return 0;

    // Backend returns balance with trade account balances
    const balances = balance.trade?.balances || balance.balances || [];
    const usdtItem = balances.find(b => b.currency === 'USDT');

    return parseFloat(usdtItem?.available || 0);
  };

  // Get available USD - use available balance (total - locked)
  const getAvailableUSD = () => {
    if (!balance) return 0;
    // Backend returns available.usd or available.usdt which is total - locked
    // DO NOT fallback to totalValueUSD as it includes locked funds
    return parseFloat(balance.available?.usd || balance.available?.usdt || 0);
  };

  // Get locked USD amount
  const getLockedUSD = () => {
    if (!balance) return 0;
    return parseFloat(balance.locked?.usd || balance.locked?.usdt || 0);
  };

  // Calculate withdrawal fee
  const calculateFee = (amount) => {
    return (amount * WITHDRAWAL_FEE_PERCENTAGE) / 100;
  };

  // Responsive styling based on screen size
  const getResponsiveStyles = () => {
    if (isMobile) {
      return {
        cardPadding: 16,
        titleSize: 16,
        valueSize: 18,
        iconSize: 20,
        spacing: 12,
        inputHeight: 48,
        buttonHeight: 48,
      };
    } else if (isTablet) {
      return {
        cardPadding: 18,
        titleSize: 17,
        valueSize: 20,
        iconSize: 22,
        spacing: 16,
        inputHeight: 52,
        buttonHeight: 52,
      };
    } else {
      return {
        cardPadding: 20,
        titleSize: 18,
        valueSize: 22,
        iconSize: 24,
        spacing: 20,
        inputHeight: 56,
        buttonHeight: 56,
      };
    }
  };

  const responsive = getResponsiveStyles();

  const formatCurrency = (amount) => {
    return formatIndianCurrency(amount);
  };

  const formatUSDT = (amount) => {
    return `$${parseFloat(amount).toFixed(6)}`;
  };

  // Validate withdrawal amount
  const validateAmount = (amount) => {
    const numAmount = parseFloat(amount);
    const availableUSD = getAvailableUSD();
    const newErrors = {};

    if (!amount) {
      newErrors.amount = 'Please enter withdrawal amount';
    } else if (isNaN(numAmount) || numAmount <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    } else if (numAmount < MIN_WITHDRAWAL_USD) {
      newErrors.amount = `Minimum withdrawal amount is ${formatCurrency(MIN_WITHDRAWAL_USD)}`;
    } else if (numAmount > MAX_WITHDRAWAL_USD) {
      newErrors.amount = `Maximum withdrawal amount is ${formatCurrency(MAX_WITHDRAWAL_USD)}`;
    } else if (numAmount > availableUSD) {
      newErrors.amount = `Insufficient balance. Available: ${formatCurrency(availableUSD)}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAmountChange = (amount) => {
    setWithdrawAmount(amount);
    if (amount) {
      validateAmount(amount);
    } else {
      setErrors({});
    }
  };

  const handleQuickAmount = (percentage) => {
    const availableUSD = getAvailableUSD();
    const amount = Math.floor(availableUSD * percentage / 100);
    const validAmount = Math.min(amount, MAX_WITHDRAWAL_USD);
    handleAmountChange(validAmount.toString());
  };

  const handleWithdraw = () => {
    // Block non-KYC users
    if (kycStatus?.status !== 'approved') {
      Alert.alert(
        'Complete KYC',
        'Verify your identity to withdraw funds.',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Complete KYC', onPress: () => router.push('/(tabs)/kyc') }
        ]
      );
      return;
    }

    if (!validateAmount(withdrawAmount)) return;

    if (!selectedBankId) {
      Alert.alert('Error', 'Please select a bank account');
      return;
    }

    if (accounts.length === 0) {
      Alert.alert('Error', 'Please add a bank account first');
      return;
    }

    const selectedAccount = accounts.find(acc => acc.id === selectedBankId);
    const amountUSD = parseFloat(withdrawAmount);
    const fee = calculateFee(amountUSD);
    const netAmount = amountUSD - fee;

    Alert.alert(
      'Confirm Withdrawal',
      `Withdraw ${formatCurrency(netAmount)} to ${selectedAccount?.bank_name} account?\n\nThis will be pending admin approval.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => processWithdrawal(amountUSD) },
      ]
    );
  };

  const processWithdrawal = async (amountUSD) => {
    try {
      await createWithdrawal(amountUSD, selectedBankId);
      Alert.alert(
        'Success',
        'Withdrawal request submitted successfully!\n\nYour request is pending admin approval.'
      );
      setWithdrawAmount('');
      setErrors({});

      // Refresh balance
      await fetchBalance();
    } catch (error) {
      console.error('Withdrawal error:', error);
      Alert.alert('Error', error.message || 'Failed to process withdrawal. Please try again.');
    }
  };

  const QuickAmountButton = ({ label, percentage }) => (
    <TouchableOpacity
      style={[
        styles.quickAmountButton,
        {
          backgroundColor: colors.background + '40',
          borderColor: colors.border,
          paddingHorizontal: responsive.cardPadding * 0.75,
          paddingVertical: responsive.cardPadding * 0.5,
        }
      ]}
      onPress={() => handleQuickAmount(percentage)}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.quickAmountText,
        {
          color: colors.primary,
          fontFamily: typography.fontFamily?.primary,
          fontSize: responsive.titleSize - 2,
        }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const BankAccountItem = ({ account, selected }) => (
    <TouchableOpacity
      style={[
        styles.bankAccountItem,
        {
          backgroundColor: selected ? colors.primary + '15' : 'transparent',
          borderColor: selected ? colors.primary : colors.border,
          borderWidth: 1,
          padding: responsive.cardPadding * 0.75,
        }
      ]}
      onPress={() => setSelectedBankId(account.id)}
      activeOpacity={0.8}
    >
      <View style={styles.bankAccountLeft}>
        <View style={[
          styles.bankIcon,
          { backgroundColor: colors.primary + '20' }
        ]}>
          <Building2 size={20} color={colors.primary} strokeWidth={1.5} />
        </View>

        <View style={styles.bankInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[
              styles.bankName,
              {
                color: colors.text,
                fontFamily: typography.fontFamily?.primary,
                fontSize: responsive.titleSize - 1,
              }
            ]}>
              {account.bank_name}
            </Text>
            {account.is_default && (
              <View style={[styles.defaultBadge, { backgroundColor: colors.primary }]}>
                <Text style={[styles.defaultBadgeText, { fontFamily: typography.fontFamily?.primary }]}>
                  Default
                </Text>
              </View>
            )}
          </View>
          <Text style={[
            styles.accountNumber,
            {
              color: colors.textSecondary,
              fontFamily: typography.fontFamily?.primary,
              fontSize: responsive.titleSize - 3,
            }
          ]}>
            {account.account_number.replace(/\d(?=\d{4})/g, '*')} • {account.account_holder_name}
          </Text>
        </View>
      </View>

      {selected && (
        <CheckCircle size={18} color={colors.primary} strokeWidth={2} fill={colors.primary} />
      )}
    </TouchableOpacity>
  );

  const WithdrawalHistoryItem = ({ withdrawal }) => {
    const statusColors = {
      pending: colors.warning,
      approved: colors.success,
      rejected: colors.error,
      completed: colors.success,
    };

    const statusLabels = {
      pending: 'Pending Approval',
      approved: 'Approved',
      rejected: 'Rejected',
      completed: 'Completed',
    };

    return (
      <View style={[styles.historyItem, { backgroundColor: colors.surface }]}>
        <View style={styles.historyLeft}>
          <View style={[
            styles.historyIcon,
            { backgroundColor: statusColors[withdrawal.status] + '20' }
          ]}>
            <Send size={16} color={statusColors[withdrawal.status]} />
          </View>
          <View style={styles.historyInfo}>
            <Text style={[
              styles.historyAmount,
              {
                color: colors.text,
                fontFamily: typography.fontFamily?.primary,
                fontSize: responsive.titleSize - 1,
              }
            ]}>
              {formatCurrency(parseFloat(withdrawal.amount_usdt || withdrawal.amount_inr || 0))}
            </Text>
            <Text style={[
              styles.historyDate,
              {
                color: colors.textSecondary,
                fontFamily: typography.fontFamily?.primary,
                fontSize: responsive.titleSize - 3,
              }
            ]}>
              {new Date(withdrawal.requested_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
          </View>
        </View>

        <View style={[
          styles.statusBadge,
          { backgroundColor: statusColors[withdrawal.status] + '20' }
        ]}>
          <Text style={[
            styles.statusText,
            {
              color: statusColors[withdrawal.status],
              fontFamily: typography.fontFamily?.primary,
              fontSize: responsive.titleSize - 3,
            }
          ]}>
            {statusLabels[withdrawal.status]}
          </Text>
        </View>
      </View>
    );
  };

  const availableUSD = getAvailableUSD();
  const lockedUSD = getLockedUSD();
  const availableUSDT = getAvailableUSDT();
  const withdrawAmountNum = parseFloat(withdrawAmount) || 0;
  const fee = calculateFee(withdrawAmountNum);
  const netAmount = withdrawAmountNum - fee;

  return (
    <View style={styles.container}>
      {/* Available Balance */}
      <GlassContainer style={[styles.balanceCard, { padding: responsive.cardPadding, marginBottom: responsive.spacing }]}>
        <View style={styles.balanceHeader}>
          <Text style={[
            styles.balanceLabel,
            {
              color: colors.textSecondary,
              fontFamily: typography.fontFamily?.primary,
              fontSize: responsive.titleSize - 1,
            }
          ]}>
            Amount Available to Withdraw
          </Text>
        </View>

        <Text style={[
          styles.balanceAmount,
          {
            color: colors.text,
            fontFamily: typography.fontFamily?.bold || typography.fontFamily?.primary,
            fontSize: responsive.valueSize + 4,
          }
        ]}>
          {formatCurrency(availableUSD)}
        </Text>

        {/* Show locked balance if there are pending withdrawals */}
        {lockedUSD > 0 && (
          <View style={[
            styles.lockedBalanceRow,
            {
              marginTop: responsive.spacing / 2,
              backgroundColor: colors.warning + '10',
              padding: responsive.spacing / 2,
              borderRadius: 8,
            }
          ]}>
            <Clock size={14} color={colors.warning} strokeWidth={2} />
            <Text style={[
              styles.lockedBalanceText,
              {
                color: colors.warning,
                fontFamily: typography.fontFamily?.primary,
                fontSize: responsive.titleSize - 3,
                marginLeft: 6,
              }
            ]}>
              {formatCurrency(lockedUSD)} locked in pending withdrawals
            </Text>
          </View>
        )}
      </GlassContainer>

      {/* Withdrawal Form */}
      <GlassContainer style={[styles.formCard, { padding: responsive.cardPadding, marginBottom: responsive.spacing }]}>
        <View style={styles.formHeader}>
          <Send size={responsive.iconSize + 2} color={colors.primary} strokeWidth={1.5} />
          <Text style={[
            styles.formTitle,
            {
              color: colors.text,
              fontFamily: typography.fontFamily?.primary,
              fontSize: responsive.titleSize + 1,
              marginLeft: 8,
            }
          ]}>
            Withdraw to Bank
          </Text>
        </View>

        {/* Amount Input */}
        <View style={styles.inputSection}>
          <Text style={[
            styles.inputLabel,
            {
              color: colors.textSecondary,
              fontFamily: typography.fontFamily?.primary,
              fontSize: responsive.titleSize - 2,
            }
          ]}>
            Withdrawal Amount
          </Text>

          <View style={[
            styles.amountInputContainer,
            {
              borderColor: errors.amount ? colors.error : colors.border,
              borderWidth: 1,
              backgroundColor: colors.background + '20',
            }
          ]}>
            <DollarSign size={responsive.iconSize} color={colors.textSecondary} strokeWidth={1.5} />
            <TextInput
              style={[
                styles.amountInput,
                {
                  color: colors.text,
                  fontFamily: typography.fontFamily?.primary,
                  fontSize: responsive.titleSize + 1,
                  height: responsive.inputHeight,
                }
              ]}
              value={withdrawAmount}
              onChangeText={handleAmountChange}
              placeholder="Enter amount"
              placeholderTextColor={colors.textSecondary + '80'}
              keyboardType="numeric"
              returnKeyType="done"
            />
          </View>

          {errors.amount && (
            <View style={styles.errorContainer}>
              <AlertCircle size={14} color={colors.error} strokeWidth={2} />
              <Text style={[
                styles.errorText,
                {
                  color: colors.error,
                  fontFamily: typography.fontFamily?.primary,
                  fontSize: responsive.titleSize - 3,
                }
              ]}>
                {errors.amount}
              </Text>
            </View>
          )}

          {/* Quick Amount Buttons */}
          <View style={styles.quickAmounts}>
            <QuickAmountButton label="25%" percentage={25} />
            <QuickAmountButton label="50%" percentage={50} />
            <QuickAmountButton label="75%" percentage={75} />
            <QuickAmountButton label="Max" percentage={100} />
          </View>
        </View>

        {/* Bank Account Selection */}
        <View style={styles.bankSelection}>
          <Text style={[
            styles.inputLabel,
            {
              color: colors.textSecondary,
              fontFamily: typography.fontFamily?.primary,
              fontSize: responsive.titleSize - 2,
              marginBottom: responsive.spacing,
            }
          ]}>
            Select Bank Account
          </Text>

          {loadingAccounts ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ paddingVertical: 20 }} />
          ) : accounts.length === 0 ? (
            <View style={[styles.noBankAccounts, { backgroundColor: colors.surface }]}>
              <Building2 size={32} color={colors.textSecondary} />
              <Text style={[
                styles.noBankText,
                {
                  color: colors.textSecondary,
                  fontFamily: typography.fontFamily?.primary,
                  fontSize: responsive.titleSize - 1,
                }
              ]}>
                No bank accounts found
              </Text>
              <Text style={[
                styles.noBankHint,
                {
                  color: colors.textSecondary,
                  fontFamily: typography.fontFamily?.primary,
                  fontSize: responsive.titleSize - 3,
                }
              ]}>
                Add a bank account in your profile to enable withdrawals
              </Text>
            </View>
          ) : (
            <View style={styles.bankList}>
              {accounts.map((account) => (
                <BankAccountItem
                  key={account.id}
                  account={account}
                  selected={selectedBankId === account.id}
                />
              ))}
            </View>
          )}
        </View>

        {/* Withdrawal Summary */}
        {withdrawAmount && !errors.amount && accounts.length > 0 && (
          <View style={[styles.summary, { backgroundColor: colors.background + '20' }]}>
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={[
                styles.summaryLabel,
                {
                  color: colors.text,
                  fontFamily: typography.fontFamily?.bold || typography.fontFamily?.primary,
                  fontSize: responsive.titleSize - 1,
                }
              ]}>
                You will receive
              </Text>
              <Text style={[
                styles.summaryValue,
                {
                  color: colors.primary,
                  fontFamily: typography.fontFamily?.bold || typography.fontFamily?.primary,
                  fontSize: responsive.titleSize,
                }
              ]}>
                {formatCurrency(netAmount)}
              </Text>
            </View>
          </View>
        )}

        {/* Withdraw Button */}
        <TouchableOpacity
          style={[
            styles.withdrawButton,
            {
              backgroundColor: (withdrawAmount && !errors.amount && accounts.length > 0) ? colors.primary : colors.textSecondary + '40',
              height: responsive.buttonHeight,
              opacity: (withdrawAmount && !errors.amount && accounts.length > 0) ? 1 : 0.6,
            }
          ]}
          onPress={handleWithdraw}
          disabled={!withdrawAmount || !!errors.amount || accounts.length === 0 || loadingWithdrawals}
          activeOpacity={0.8}
        >
          {loadingWithdrawals ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={[
              styles.withdrawButtonText,
              {
                color: '#ffffff',
                fontFamily: typography.fontFamily?.primary,
                fontSize: responsive.titleSize,
              }
            ]}>
              Request Withdrawal
            </Text>
          )}
        </TouchableOpacity>
      </GlassContainer>

      {/* Withdrawal History */}
      {withdrawals.length > 0 && (
        <GlassContainer style={[styles.historyCard, { padding: responsive.cardPadding }]}>
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
              Recent Withdrawals
            </Text>
          </View>

          <View style={styles.historyList}>
            {withdrawals.slice(0, 5).map((withdrawal) => (
              <WithdrawalHistoryItem key={withdrawal.id} withdrawal={withdrawal} />
            ))}
          </View>
        </GlassContainer>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  balanceCard: {

  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceLabel: {
    opacity: 0.8,
  },
  balanceAmount: {
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  balanceUSDT: {
    marginTop: 4,
    opacity: 0.7,
  },
  lockedBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockedBalanceText: {
    flex: 1,
  },
  formCard: {

  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  formTitle: {
    fontWeight: 'bold',
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    marginBottom: 8,
    opacity: 0.8,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  amountInput: {
    flex: 1,
    marginLeft: 8,
    fontWeight: '600',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  usdtEquivalent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingLeft: 4,
  },
  usdtText: {
    opacity: 0.8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  errorText: {
    marginLeft: 4,
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: 8,
  },
  quickAmountButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      },
    }),
  },
  quickAmountText: {
    fontWeight: '600',
  },
  bankSelection: {
    marginBottom: 20,
  },
  bankList: {
    gap: 8,
  },
  noBankAccounts: {
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  noBankText: {
    fontWeight: '600',
    marginTop: 8,
  },
  noBankHint: {
    opacity: 0.8,
    textAlign: 'center',
  },
  bankAccountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      },
    }),
  },
  bankAccountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bankIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bankInfo: {
    flex: 1,
  },
  bankName: {
    fontWeight: '600',
    marginBottom: 2,
  },
  defaultBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  accountNumber: {
    opacity: 0.8,
  },
  summary: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryTotal: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    marginBottom: 0,
  },
  summaryLabel: {
    opacity: 0.8,
  },
  summaryValue: {
    fontWeight: '600',
  },
  withdrawButton: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      },
    }),
  },
  withdrawButtonText: {
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  historyCard: {
    marginBottom: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyTitle: {
    fontWeight: 'bold',
  },
  historyList: {
    gap: 8,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyInfo: {
    flex: 1,
  },
  historyAmount: {
    fontWeight: '600',
    marginBottom: 2,
  },
  historyDate: {
    opacity: 0.8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  infoCard: {

  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontWeight: 'bold',
  },
  infoContent: {
    gap: 8,
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    opacity: 0.8,
  },
  infoValue: {
    fontWeight: '600',
  },
  infoNote: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderRadius: 8,
  },
  infoNoteText: {
    flex: 1,
    lineHeight: 18,
  },
});

export default WithdrawINR;
