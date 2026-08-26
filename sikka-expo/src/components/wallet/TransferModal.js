import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { X, ArrowRight, ArrowLeftRight, Wallet, TrendingUp } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import backendApi from '../../services/backendApi';
import useWalletStore from '../../store/walletStore';

/**
 * TransferModal Component
 *
 * Allows users to transfer funds between MAIN and TRADE accounts
 * Features:
 * - Select transfer direction (MAIN→TRADE or TRADE→MAIN)
 * - Enter amount with validation
 * - Show available balances
 * - Real-time transfer execution
 * - Success/error handling
 */
const TransferModal = ({ visible, onClose }) => {
  const { colors, typography } = useTheme();
  const { balance, fetchBalance, loading: balanceLoading } = useWalletStore();

  // Transfer state
  const [direction, setDirection] = useState('MAIN_TO_TRADE'); // 'MAIN_TO_TRADE' or 'TRADE_TO_MAIN'
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setAmount('');
      setError(null);
      fetchBalance();
    }
  }, [visible]);

  // Get balances based on direction
  const getBalances = () => {
    if (!balance || !balance.data) {
      return { from: 0, to: 0, currency: 'USDT' };
    }

    // Backend currently only returns TRADE account balance
    // MAIN account balance needs separate API or will be 0
    const balances = balance.data.balances || [];
    const usdtItem = balances.find(b => b.currency === 'USDT');
    const tradeBalance = parseFloat(usdtItem?.available || 0);
    const mainBalance = 0; // MAIN account not yet implemented in backend

    if (direction === 'MAIN_TO_TRADE') {
      return {
        from: mainBalance,
        to: tradeBalance,
        fromLabel: 'Main Account',
        toLabel: 'Trading Account',
        currency: 'USDT',
      };
    } else {
      return {
        from: tradeBalance,
        to: mainBalance,
        fromLabel: 'Trading Account',
        toLabel: 'Main Account',
        currency: 'USDT',
      };
    }
  };

  const balances = getBalances();

  // Toggle transfer direction
  const toggleDirection = () => {
    setDirection(prev =>
      prev === 'MAIN_TO_TRADE' ? 'TRADE_TO_MAIN' : 'MAIN_TO_TRADE'
    );
    setAmount('');
    setError(null);
  };

  // Validate amount
  const validateAmount = (value) => {
    const numAmount = parseFloat(value);

    if (!value || isNaN(numAmount) || numAmount <= 0) {
      return 'Please enter a valid amount';
    }

    if (numAmount > balances.from) {
      return `Insufficient balance. Available: ${balances.from} USDT`;
    }

    if (numAmount < 0.1) {
      return 'Minimum transfer amount is 0.1 USDT';
    }

    return null;
  };

  // Handle amount input
  const handleAmountChange = (text) => {
    // Allow only numbers and decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');

    // Prevent multiple decimal points
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return;
    }

    // Limit decimal places to 6
    if (parts[1] && parts[1].length > 6) {
      return;
    }

    setAmount(cleaned);
    setError(null);
  };

  // Set max amount
  const handleMaxAmount = () => {
    setAmount(balances.from.toString());
    setError(null);
  };

  // Execute transfer
  const handleTransfer = async () => {
    // Validate
    const validationError = validateAmount(amount);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const numAmount = parseFloat(amount);
      const fromType = direction === 'MAIN_TO_TRADE' ? 'MAIN' : 'TRADE';
      const toType = direction === 'MAIN_TO_TRADE' ? 'TRADE' : 'MAIN';

      console.log(`💸 Transferring ${numAmount} USDT from ${fromType} to ${toType}...`);

      // Call transfer API
      const response = await backendApi.transfers.innerAccount(
        fromType,
        toType,
        'USDT',
        numAmount
      );

      console.log('✅ Transfer successful:', response.data);

      // Refresh balance
      await fetchBalance();

      // Show success message
      Alert.alert(
        'Transfer Successful',
        `${numAmount} USDT transferred from ${balances.fromLabel} to ${balances.toLabel}`,
        [
          {
            text: 'OK',
            onPress: () => {
              setAmount('');
              onClose();
            },
          },
        ]
      );
    } catch (err) {
      console.error('❌ Transfer failed:', err);
      const errorMessage = err.message || err.error || 'Transfer failed. Please try again.';
      setError(errorMessage);
      Alert.alert('Transfer Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[
              styles.title,
              {
                color: colors.text,
                fontFamily: typography.fontFamily?.bold || typography.fontFamily?.primary,
              }
            ]}>
              Transfer Funds
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeButton, { backgroundColor: colors.background }]}
              activeOpacity={0.7}
            >
              <X size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Transfer Direction */}
          <View style={[styles.directionContainer, { backgroundColor: colors.background }]}>
            <View style={styles.accountBox}>
              <View style={[styles.accountIcon, { backgroundColor: colors.primary + '20' }]}>
                <Wallet size={20} color={colors.primary} />
              </View>
              <Text style={[styles.accountLabel, { color: colors.textSecondary }]}>
                {balances.fromLabel}
              </Text>
              <Text style={[styles.accountBalance, { color: colors.text }]}>
                {balances.from.toFixed(6)} USDT
              </Text>
            </View>

            <TouchableOpacity
              onPress={toggleDirection}
              style={[styles.swapButton, { backgroundColor: colors.primary }]}
              activeOpacity={0.7}
            >
              <ArrowLeftRight size={20} color="#ffffff" />
            </TouchableOpacity>

            <View style={styles.accountBox}>
              <View style={[styles.accountIcon, { backgroundColor: colors.success + '20' }]}>
                <TrendingUp size={20} color={colors.success} />
              </View>
              <Text style={[styles.accountLabel, { color: colors.textSecondary }]}>
                {balances.toLabel}
              </Text>
              <Text style={[styles.accountBalance, { color: colors.text }]}>
                {balances.to.toFixed(6)} USDT
              </Text>
            </View>
          </View>

          {/* Amount Input */}
          <View style={styles.amountSection}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>
              Amount (USDT)
            </Text>

            <View style={[
              styles.amountInputContainer,
              {
                borderColor: error ? colors.error : colors.border,
                backgroundColor: colors.background,
              }
            ]}>
              <TextInput
                style={[
                  styles.amountInput,
                  {
                    color: colors.text,
                    fontFamily: typography.fontFamily?.primary,
                  }
                ]}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary + '60'}
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={handleAmountChange}
                editable={!loading && !balanceLoading}
              />

              <TouchableOpacity
                onPress={handleMaxAmount}
                style={[styles.maxButton, { backgroundColor: colors.primary + '20' }]}
                activeOpacity={0.7}
                disabled={loading || balanceLoading}
              >
                <Text style={[styles.maxButtonText, { color: colors.primary }]}>
                  MAX
                </Text>
              </TouchableOpacity>
            </View>

            {error && (
              <Text style={[styles.errorText, { color: colors.error }]}>
                {error}
              </Text>
            )}

            <Text style={[styles.availableText, { color: colors.textSecondary }]}>
              Available: {balances.from.toFixed(6)} USDT
            </Text>
          </View>

          {/* Transfer Info */}
          <View style={[styles.infoBox, { backgroundColor: colors.background }]}>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              💡 Funds will be transferred instantly. No fees charged for internal transfers.
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.button,
                styles.cancelButton,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                }
              ]}
              activeOpacity={0.7}
              disabled={loading}
            >
              <Text style={[
                styles.cancelButtonText,
                {
                  color: colors.text,
                  fontFamily: typography.fontFamily?.primary,
                }
              ]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleTransfer}
              style={[
                styles.button,
                styles.transferButton,
                {
                  backgroundColor: colors.primary,
                  opacity: (!amount || loading || balanceLoading) ? 0.5 : 1,
                }
              ]}
              activeOpacity={0.8}
              disabled={!amount || loading || balanceLoading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Text style={[
                    styles.transferButtonText,
                    {
                      color: '#ffffff',
                      fontFamily: typography.fontFamily?.bold || typography.fontFamily?.primary,
                    }
                  ]}>
                    Transfer
                  </Text>
                  <ArrowRight size={20} color="#ffffff" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
    ...Platform.select({
      web: {
        justifyContent: 'center',
        alignItems: 'center',
      },
    }),
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
    ...Platform.select({
      web: {
        borderRadius: 24,
        width: '100%',
        maxWidth: 500,
        maxHeight: 'none',
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  directionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  accountBox: {
    flex: 1,
    alignItems: 'center',
  },
  accountIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  accountLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  accountBalance: {
    fontSize: 14,
    fontWeight: '600',
  },
  swapButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  amountSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    padding: 0,
    outlineStyle: 'none',
  },
  maxButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  maxButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  availableText: {
    fontSize: 12,
    marginTop: 4,
  },
  infoBox: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  transferButton: {
    flexDirection: 'row',
    gap: 8,
  },
  transferButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default TransferModal;
