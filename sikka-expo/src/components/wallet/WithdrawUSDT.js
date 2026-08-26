import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert, TextInput, ActivityIndicator, Modal } from 'react-native';
import { ArrowRight, Lock, Building2, User, Hash, AlertCircle, CheckCircle, X } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import useWalletStore from '../../store/walletStore';
import useWithdrawalStore from '../../store/withdrawalStore';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import GlassContainer from '../ui/GlassContainer';
import { formatIndianCurrency } from '../../utils/formatIndianCurrency';

/**
 * WithdrawUSDT Component
 *
 * Withdrawal request interface for USDT to INR
 * Features:
 * - Amount input with USDT to INR conversion
 * - Bank account selection
 * - Add bank account form
 * - Balance locking on withdrawal request
 * - Confirmation modal with fee breakdown
 * - Warning about immediate fund locking
 * - Responsive design for all screen sizes
 */
const WithdrawUSDT = () => {
  const { colors, typography } = useTheme();
  const { balance, fetchBalance } = useWalletStore();
  const {
    bankAccounts,
    loading,
    error,
    fetchBankAccounts,
    addBankAccount,
    createWithdrawal,
    clearError
  } = useWithdrawalStore();
  const { isMobile, isTablet } = useBreakpoints();

  const [amount, setAmount] = useState('');
  const [selectedBankAccount, setSelectedBankAccount] = useState(null);
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Bank account form state
  const [bankForm, setBankForm] = useState({
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    accountType: 'savings',
    branch: '',
  });

  // Fetch bank accounts and balance on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          fetchBankAccounts(),
          fetchBalance(),
        ]);
      } catch (error) {
        console.error('Failed to load withdrawal data:', error);
      }
    };

    loadData();
  }, []);

  // Auto-select first bank account if available
  useEffect(() => {
    if (bankAccounts.length > 0 && !selectedBankAccount) {
      setSelectedBankAccount(bankAccounts[0]);
    }
  }, [bankAccounts]);

  // Get exchange rate from balance API (INR per USDT)
  const exchangeRate = 88.77; // Default rate, should be fetched from backend admin_config

  // Calculate available USDT balance
  const getAvailableUSDT = () => {
    if (!balance || !balance.data) return 0;

    // Backend returns: { data: { balances: [...], totalValueINR: number } }
    const balances = balance.data.balances || [];
    const usdtItem = balances.find(b => b.currency === 'USDT');
    return parseFloat(usdtItem?.available || 0);
  };

  const getLockedUSDT = () => {
    if (!balance || !balance.data) return 0;

    const balances = balance.data.balances || [];
    const usdtItem = balances.find(b => b.currency === 'USDT');
    return parseFloat(usdtItem?.holds || 0);
  };

  const availableUSDT = getAvailableUSDT();
  const lockedUSDT = getLockedUSDT();
  // Note: KuCoin's 'available' field already excludes 'holds', so don't subtract again
  const withdrawableUSDT = availableUSDT;

  // Calculate INR equivalent
  const calculateINREquivalent = (usdtAmount) => {
    if (!usdtAmount || isNaN(usdtAmount)) return 0;
    return parseFloat(usdtAmount) * exchangeRate;
  };

  // Withdrawal info
  const withdrawalInfo = {
    minAmount: 1, // USDT
    maxAmount: withdrawableUSDT,
    processingTime: '1-3 business days',
    fee: 0, // No withdrawal fee (as per requirements)
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
        buttonHeight: 44,
      };
    } else if (isTablet) {
      return {
        cardPadding: 18,
        titleSize: 17,
        valueSize: 20,
        iconSize: 22,
        spacing: 16,
        buttonHeight: 48,
      };
    } else {
      return {
        cardPadding: 20,
        titleSize: 18,
        valueSize: 22,
        iconSize: 24,
        spacing: 20,
        buttonHeight: 52,
      };
    }
  };

  const responsive = getResponsiveStyles();

  // Handle amount input
  const handleAmountInput = (text) => {
    // Remove non-numeric characters (no decimals for INR)
    const numericValue = text.replace(/[^0-9]/g, '');
    setAmount(numericValue);
  };

  // Validate withdrawal amount
  const validateAmount = () => {
    const withdrawAmountINR = parseFloat(amount);

    if (!withdrawAmountINR || withdrawAmountINR <= 0) {
      return { valid: false, message: 'Please enter a valid amount' };
    }

    // Convert to USDT for validation
    const withdrawAmountUSDT = withdrawAmountINR / exchangeRate;

    if (withdrawAmountUSDT < withdrawalInfo.minAmount) {
      return { valid: false, message: `Minimum withdrawal is ${formatIndianCurrency(withdrawalInfo.minAmount * exchangeRate)}` };
    }

    const availableINR = calculateINREquivalent(withdrawableUSDT);
    if (withdrawAmountINR > availableINR) {
      return { valid: false, message: `Insufficient balance. Available: ${formatIndianCurrency(availableINR)}` };
    }

    return { valid: true };
  };

  // Handle withdrawal request
  const handleRequestWithdrawal = () => {
    // Validate amount
    const validation = validateAmount();
    if (!validation.valid) {
      Alert.alert('Invalid Amount', validation.message);
      return;
    }

    // Validate bank account
    if (!selectedBankAccount) {
      Alert.alert('No Bank Account', 'Please select a bank account for withdrawal');
      return;
    }

    // Show confirmation modal
    setShowConfirmModal(true);
  };

  // Confirm withdrawal
  const confirmWithdrawal = async () => {
    const withdrawAmountINR = parseFloat(amount);
    const withdrawAmountUSDT = withdrawAmountINR / exchangeRate;

    try {
      setShowConfirmModal(false);

      console.log('💸 Processing withdrawal:', withdrawAmountINR, 'INR (', withdrawAmountUSDT.toFixed(2), 'USDT)');

      // Create withdrawal request (backend expects USDT)
      await createWithdrawal(withdrawAmountUSDT, 'USDT', selectedBankAccount.id);

      // Show success message
      Alert.alert(
        'Withdrawal Requested',
        `Your withdrawal of ${formatIndianCurrency(withdrawAmountINR)} (${withdrawAmountUSDT.toFixed(2)} USDT) has been submitted for admin approval.\n\nFunds have been locked and will be released once approved.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Clear form
              setAmount('');

              // Refresh balance to show locked funds
              fetchBalance();
            },
          },
        ]
      );
    } catch (error) {
      console.error('❌ Withdrawal request failed:', error);
      Alert.alert(
        'Withdrawal Failed',
        error.message || 'Failed to create withdrawal request. Please try again.'
      );
    }
  };

  // Handle add bank account
  const handleAddBankAccount = async () => {
    // Validate form
    if (!bankForm.accountHolderName || !bankForm.bankName || !bankForm.accountNumber || !bankForm.ifscCode) {
      Alert.alert('Invalid Form', 'Please fill all required fields');
      return;
    }

    // Validate IFSC code format (11 characters)
    if (bankForm.ifscCode.length !== 11) {
      Alert.alert('Invalid IFSC', 'IFSC code must be 11 characters');
      return;
    }

    // Validate account number (numeric)
    if (!/^\d+$/.test(bankForm.accountNumber)) {
      Alert.alert('Invalid Account Number', 'Account number must contain only digits');
      return;
    }

    try {
      console.log('🏦 Adding bank account:', bankForm.accountHolderName);

      await addBankAccount(bankForm);

      // Close modal and reset form
      setShowAddBankModal(false);
      setBankForm({
        accountHolderName: '',
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        accountType: 'savings',
        branch: '',
      });

      Alert.alert('Success', 'Bank account added successfully');
    } catch (error) {
      console.error('❌ Add bank account failed:', error);
      Alert.alert(
        'Failed to Add Account',
        error.message || 'Failed to add bank account. Please try again.'
      );
    }
  };

  // Bank account selector
  const BankAccountSelector = () => (
    <GlassContainer style={[styles.sectionCard, { padding: responsive.cardPadding, marginBottom: responsive.spacing }]}>
      <Text style={[
        styles.sectionTitle,
        {
          color: colors.text,
          fontFamily: typography.fontFamily?.primary,
          fontSize: responsive.titleSize + 1,
          marginBottom: responsive.spacing,
        }
      ]}>
        Select Bank Account
      </Text>

      {bankAccounts.length === 0 ? (
        <View style={styles.emptyState}>
          <Building2 size={48} color={colors.textSecondary} strokeWidth={1} />
          <Text style={[
            styles.emptyText,
            {
              color: colors.textSecondary,
              fontFamily: typography.fontFamily?.primary,
              fontSize: responsive.titleSize,
              marginTop: responsive.spacing,
              textAlign: 'center',
            }
          ]}>
            No bank accounts added
          </Text>
        </View>
      ) : (
        <View style={styles.bankAccountsList}>
          {bankAccounts.map((account) => (
            <TouchableOpacity
              key={account.id}
              style={[
                styles.bankAccountItem,
                {
                  backgroundColor: selectedBankAccount?.id === account.id
                    ? colors.primary + '20'
                    : colors.background + '40',
                  borderColor: selectedBankAccount?.id === account.id
                    ? colors.primary
                    : colors.border,
                  borderWidth: 1,
                  padding: responsive.cardPadding * 0.75,
                }
              ]}
              onPress={() => setSelectedBankAccount(account)}
              activeOpacity={0.7}
            >
              <View style={styles.bankAccountInfo}>
                <Text style={[
                  styles.bankAccountName,
                  {
                    color: colors.text,
                    fontFamily: typography.fontFamily?.primary,
                    fontSize: responsive.titleSize,
                  }
                ]}>
                  {account.bank_name}
                </Text>
                <Text style={[
                  styles.bankAccountNumber,
                  {
                    color: colors.textSecondary,
                    fontFamily: typography.fontFamily?.primary,
                    fontSize: responsive.titleSize - 2,
                  }
                ]}>
                  {account.account_number.replace(/\d(?=\d{4})/g, '*')}
                </Text>
              </View>
              {selectedBankAccount?.id === account.id && (
                <CheckCircle size={20} color={colors.primary} strokeWidth={2} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.addBankButton,
          {
            backgroundColor: colors.primary + '20',
            borderColor: colors.primary,
            borderWidth: 1,
            height: responsive.buttonHeight * 0.9,
            marginTop: responsive.spacing,
          }
        ]}
        onPress={() => setShowAddBankModal(true)}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.addBankButtonText,
          {
            color: colors.primary,
            fontFamily: typography.fontFamily?.primary,
            fontSize: responsive.titleSize,
          }
        ]}>
          + Add New Bank Account
        </Text>
      </TouchableOpacity>
    </GlassContainer>
  );

  // Confirmation modal
  const ConfirmationModal = () => {
    const withdrawAmountINR = parseFloat(amount);
    const withdrawAmountUSDT = withdrawAmountINR / exchangeRate;

    return (
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <GlassContainer style={[styles.modalContent, { padding: responsive.cardPadding * 1.5 }]}>
            <View style={styles.modalHeader}>
              <Text style={[
                styles.modalTitle,
                {
                  color: colors.text,
                  fontFamily: typography.fontFamily?.bold || typography.fontFamily?.primary,
                  fontSize: responsive.titleSize + 4,
                }
              ]}>
                Confirm Withdrawal
              </Text>
              <TouchableOpacity
                onPress={() => setShowConfirmModal(false)}
                style={styles.closeButton}
              >
                <X size={24} color={colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <View style={[styles.modalBody, { marginVertical: responsive.spacing * 1.5 }]}>
              {/* Amount (INR Primary) */}
              <View style={styles.confirmRow}>
                <Text style={[styles.confirmLabel, { color: colors.textSecondary, fontSize: responsive.titleSize }]}>
                  Amount
                </Text>
                <Text style={[styles.confirmValue, { color: colors.text, fontSize: responsive.titleSize + 2 }]}>
                  {formatIndianCurrency(withdrawAmountINR)}
                </Text>
              </View>

              {/* USDT Equivalent (Secondary) */}
              <View style={styles.confirmRow}>
                <Text style={[styles.confirmLabel, { color: colors.textSecondary, fontSize: responsive.titleSize }]}>
                  USDT Equivalent
                </Text>
                <Text style={[styles.confirmValue, { color: colors.text, fontSize: responsive.titleSize + 2 }]}>
                  {withdrawAmountUSDT.toFixed(2)} USDT
                </Text>
              </View>

              {/* Fee */}
              <View style={styles.confirmRow}>
                <Text style={[styles.confirmLabel, { color: colors.textSecondary, fontSize: responsive.titleSize }]}>
                  Withdrawal Fee
                </Text>
                <Text style={[styles.confirmValue, { color: colors.success, fontSize: responsive.titleSize + 2 }]}>
                  {formatIndianCurrency(0)} (Free)
                </Text>
              </View>

              {/* You'll Receive */}
              <View style={[styles.confirmRow, styles.confirmRowTotal]}>
                <Text style={[styles.confirmLabel, { color: colors.text, fontSize: responsive.titleSize + 1, fontWeight: 'bold' }]}>
                  You'll Receive
                </Text>
                <Text style={[styles.confirmValue, { color: colors.primary, fontSize: responsive.titleSize + 4, fontWeight: 'bold' }]}>
                  {formatIndianCurrency(withdrawAmountINR)}
                </Text>
              </View>

              {/* Bank Account */}
              <View style={[styles.confirmRow, { marginTop: responsive.spacing }]}>
                <Text style={[styles.confirmLabel, { color: colors.textSecondary, fontSize: responsive.titleSize }]}>
                  Bank Account
                </Text>
                <Text style={[styles.confirmValue, { color: colors.text, fontSize: responsive.titleSize }]}>
                  {selectedBankAccount?.bank_name}
                </Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={[styles.confirmLabel, { color: colors.textSecondary, fontSize: responsive.titleSize - 1 }]}>
                  Account Number
                </Text>
                <Text style={[styles.confirmValue, { color: colors.text, fontSize: responsive.titleSize - 1 }]}>
                  {selectedBankAccount?.account_number.replace(/\d(?=\d{4})/g, '*')}
                </Text>
              </View>

              {/* Warning */}
              <View style={[styles.warningBox, { backgroundColor: colors.warning + '20', marginTop: responsive.spacing * 1.5 }]}>
                <AlertCircle size={20} color={colors.warning} strokeWidth={2} />
                <Text style={[
                  styles.warningText,
                  {
                    color: colors.warning,
                    fontFamily: typography.fontFamily?.primary,
                    fontSize: responsive.titleSize - 2,
                    marginLeft: 8,
                  }
                ]}>
                  Funds will be locked immediately and released after admin approval. Withdrawal cannot be cancelled once submitted.
                </Text>
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.cancelButton,
                  {
                    backgroundColor: 'transparent',
                    borderColor: colors.border,
                    borderWidth: 1,
                    height: responsive.buttonHeight,
                  }
                ]}
                onPress={() => setShowConfirmModal(false)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.buttonText,
                  {
                    color: colors.textSecondary,
                    fontFamily: typography.fontFamily?.primary,
                    fontSize: responsive.titleSize,
                  }
                ]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.confirmButton,
                  {
                    backgroundColor: colors.primary,
                    height: responsive.buttonHeight,
                  }
                ]}
                onPress={confirmWithdrawal}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.buttonText,
                  {
                    color: '#ffffff',
                    fontFamily: typography.fontFamily?.bold || typography.fontFamily?.primary,
                    fontSize: responsive.titleSize,
                  }
                ]}>
                  Confirm Withdrawal
                </Text>
              </TouchableOpacity>
            </View>
          </GlassContainer>
        </View>
      </Modal>
    );
  };

  // Add bank account modal
  const AddBankAccountModal = () => (
    <Modal
      visible={showAddBankModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowAddBankModal(false)}
    >
      <View style={styles.modalOverlay}>
        <GlassContainer style={[styles.modalContent, styles.addBankModal, { padding: responsive.cardPadding * 1.5 }]}>
          <View style={styles.modalHeader}>
            <Text style={[
              styles.modalTitle,
              {
                color: colors.text,
                fontFamily: typography.fontFamily?.bold || typography.fontFamily?.primary,
                fontSize: responsive.titleSize + 4,
              }
            ]}>
              Add Bank Account
            </Text>
            <TouchableOpacity
              onPress={() => setShowAddBankModal(false)}
              style={styles.closeButton}
            >
              <X size={24} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScrollView} showsVerticalScrollIndicator={false}>
            {/* Account Holder Name */}
            <View style={[styles.formGroup, { marginBottom: responsive.spacing }]}>
              <Text style={[
                styles.formLabel,
                {
                  color: colors.textSecondary,
                  fontFamily: typography.fontFamily?.primary,
                  fontSize: responsive.titleSize - 1,
                }
              ]}>
                Account Holder Name *
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    fontFamily: typography.fontFamily?.primary,
                    fontSize: responsive.titleSize,
                  }
                ]}
                placeholder="Enter account holder name"
                placeholderTextColor={colors.textSecondary + '60'}
                value={bankForm.accountHolderName}
                onChangeText={(text) => setBankForm({ ...bankForm, accountHolderName: text })}
              />
            </View>

            {/* Bank Name */}
            <View style={[styles.formGroup, { marginBottom: responsive.spacing }]}>
              <Text style={[
                styles.formLabel,
                {
                  color: colors.textSecondary,
                  fontFamily: typography.fontFamily?.primary,
                  fontSize: responsive.titleSize - 1,
                }
              ]}>
                Bank Name *
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    fontFamily: typography.fontFamily?.primary,
                    fontSize: responsive.titleSize,
                  }
                ]}
                placeholder="Enter bank name"
                placeholderTextColor={colors.textSecondary + '60'}
                value={bankForm.bankName}
                onChangeText={(text) => setBankForm({ ...bankForm, bankName: text })}
              />
            </View>

            {/* Account Number */}
            <View style={[styles.formGroup, { marginBottom: responsive.spacing }]}>
              <Text style={[
                styles.formLabel,
                {
                  color: colors.textSecondary,
                  fontFamily: typography.fontFamily?.primary,
                  fontSize: responsive.titleSize - 1,
                }
              ]}>
                Account Number *
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    fontFamily: typography.fontFamily?.primary,
                    fontSize: responsive.titleSize,
                  }
                ]}
                placeholder="Enter account number"
                placeholderTextColor={colors.textSecondary + '60'}
                keyboardType="numeric"
                value={bankForm.accountNumber}
                onChangeText={(text) => setBankForm({ ...bankForm, accountNumber: text.replace(/\D/g, '') })}
              />
            </View>

            {/* IFSC Code */}
            <View style={[styles.formGroup, { marginBottom: responsive.spacing }]}>
              <Text style={[
                styles.formLabel,
                {
                  color: colors.textSecondary,
                  fontFamily: typography.fontFamily?.primary,
                  fontSize: responsive.titleSize - 1,
                }
              ]}>
                IFSC Code *
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    fontFamily: typography.fontFamily?.primary,
                    fontSize: responsive.titleSize,
                  }
                ]}
                placeholder="Enter IFSC code"
                placeholderTextColor={colors.textSecondary + '60'}
                maxLength={11}
                autoCapitalize="characters"
                value={bankForm.ifscCode}
                onChangeText={(text) => setBankForm({ ...bankForm, ifscCode: text.toUpperCase() })}
              />
            </View>

            {/* Account Type */}
            <View style={[styles.formGroup, { marginBottom: responsive.spacing }]}>
              <Text style={[
                styles.formLabel,
                {
                  color: colors.textSecondary,
                  fontFamily: typography.fontFamily?.primary,
                  fontSize: responsive.titleSize - 1,
                }
              ]}>
                Account Type *
              </Text>
              <View style={styles.accountTypeButtons}>
                <TouchableOpacity
                  style={[
                    styles.accountTypeButton,
                    {
                      backgroundColor: bankForm.accountType === 'savings' ? colors.primary + '20' : colors.background + '40',
                      borderColor: bankForm.accountType === 'savings' ? colors.primary : colors.border,
                      borderWidth: 1,
                    }
                  ]}
                  onPress={() => setBankForm({ ...bankForm, accountType: 'savings' })}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.accountTypeText,
                    {
                      color: bankForm.accountType === 'savings' ? colors.primary : colors.textSecondary,
                      fontFamily: typography.fontFamily?.primary,
                      fontSize: responsive.titleSize - 1,
                    }
                  ]}>
                    Savings
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.accountTypeButton,
                    {
                      backgroundColor: bankForm.accountType === 'current' ? colors.primary + '20' : colors.background + '40',
                      borderColor: bankForm.accountType === 'current' ? colors.primary : colors.border,
                      borderWidth: 1,
                    }
                  ]}
                  onPress={() => setBankForm({ ...bankForm, accountType: 'current' })}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.accountTypeText,
                    {
                      color: bankForm.accountType === 'current' ? colors.primary : colors.textSecondary,
                      fontFamily: typography.fontFamily?.primary,
                      fontSize: responsive.titleSize - 1,
                    }
                  ]}>
                    Current
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Branch (Optional) */}
            <View style={[styles.formGroup, { marginBottom: responsive.spacing }]}>
              <Text style={[
                styles.formLabel,
                {
                  color: colors.textSecondary,
                  fontFamily: typography.fontFamily?.primary,
                  fontSize: responsive.titleSize - 1,
                }
              ]}>
                Branch (Optional)
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    fontFamily: typography.fontFamily?.primary,
                    fontSize: responsive.titleSize,
                  }
                ]}
                placeholder="Enter branch name"
                placeholderTextColor={colors.textSecondary + '60'}
                value={bankForm.branch}
                onChangeText={(text) => setBankForm({ ...bankForm, branch: text })}
              />
            </View>
          </ScrollView>

          {/* Buttons */}
          <View style={[styles.modalButtons, { marginTop: responsive.spacing }]}>
            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.cancelButton,
                {
                  backgroundColor: 'transparent',
                  borderColor: colors.border,
                  borderWidth: 1,
                  height: responsive.buttonHeight,
                }
              ]}
              onPress={() => setShowAddBankModal(false)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.buttonText,
                {
                  color: colors.textSecondary,
                  fontFamily: typography.fontFamily?.primary,
                  fontSize: responsive.titleSize,
                }
              ]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.confirmButton,
                {
                  backgroundColor: colors.primary,
                  height: responsive.buttonHeight,
                  opacity: loading ? 0.7 : 1,
                }
              ]}
              onPress={handleAddBankAccount}
              disabled={loading}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={[
                  styles.buttonText,
                  {
                    color: '#ffffff',
                    fontFamily: typography.fontFamily?.bold || typography.fontFamily?.primary,
                    fontSize: responsive.titleSize,
                  }
                ]}>
                  Add Account
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </GlassContainer>
      </View>
    </Modal>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Balance Info */}
      <GlassContainer style={[styles.balanceCard, { padding: responsive.cardPadding, marginBottom: responsive.spacing }]}>
        <Text style={[
          styles.balanceLabel,
          {
            color: colors.textSecondary,
            fontFamily: typography.fontFamily?.primary,
            fontSize: responsive.titleSize - 1,
          }
        ]}>
          Available Balance
        </Text>
        <Text style={[
          styles.balanceValue,
          {
            color: colors.text,
            fontFamily: typography.fontFamily?.bold || typography.fontFamily?.primary,
            fontSize: responsive.titleSize + 8,
          }
        ]}>
          {formatIndianCurrency(calculateINREquivalent(withdrawableUSDT))}
        </Text>
        <Text style={[
          styles.balanceINR,
          {
            color: colors.textSecondary,
            fontFamily: typography.fontFamily?.primary,
            fontSize: responsive.titleSize - 1,
          }
        ]}>
          {withdrawableUSDT.toFixed(2)} USDT
        </Text>
      </GlassContainer>

      {/* Amount Input */}
      <GlassContainer style={[styles.amountSection, { padding: responsive.cardPadding, marginBottom: responsive.spacing }]}>
        <Text style={[
          styles.sectionTitle,
          {
            color: colors.text,
            fontFamily: typography.fontFamily?.primary,
            fontSize: responsive.titleSize + 2,
            marginBottom: responsive.spacing,
          }
        ]}>
          Enter Withdrawal Amount (INR)
        </Text>

        <View style={[styles.amountInputContainer, { borderColor: colors.border }]}>
          <Text style={[
            styles.currencySymbol,
            {
              color: colors.textSecondary,
              fontFamily: typography.fontFamily?.bold || typography.fontFamily?.primary,
              fontSize: responsive.titleSize + 4,
              marginRight: 8,
            }
          ]}>
            ₹
          </Text>
          <TextInput
            style={[
              styles.amountInput,
              {
                color: colors.text,
                fontFamily: typography.fontFamily?.bold || typography.fontFamily?.primary,
                fontSize: responsive.titleSize + 8,
              }
            ]}
            placeholder="0"
            placeholderTextColor={colors.textSecondary + '60'}
            keyboardType="numeric"
            value={amount}
            onChangeText={handleAmountInput}
            editable={!loading}
          />
        </View>

        {/* USDT Equivalent (Secondary) */}
        {amount && parseFloat(amount) > 0 && (
          <View style={[styles.inrEquivalent, { marginTop: responsive.spacing }]}>
            <Text style={[
              styles.inrLabel,
              {
                color: colors.textSecondary,
                fontFamily: typography.fontFamily?.primary,
                fontSize: responsive.titleSize - 1,
              }
            ]}>
              Equivalent USDT:
            </Text>
            <Text style={[
              styles.inrValue,
              {
                color: colors.primary,
                fontFamily: typography.fontFamily?.bold || typography.fontFamily?.primary,
                fontSize: responsive.titleSize + 4,
              }
            ]}>
              {(parseFloat(amount) / exchangeRate).toFixed(2)} USDT
            </Text>
            <Text style={[
              styles.exchangeRate,
              {
                color: colors.textSecondary,
                fontFamily: typography.fontFamily?.primary,
                fontSize: responsive.titleSize - 2,
              }
            ]}>
              Exchange rate: 1 USDT = {formatIndianCurrency(exchangeRate)}
            </Text>
          </View>
        )}

        {/* Warning */}
        <View style={[styles.warningBox, { backgroundColor: colors.warning + '15', marginTop: responsive.spacing }]}>
          <Lock size={16} color={colors.warning} strokeWidth={2} />
          <Text style={[
            styles.warningText,
            {
              color: colors.warning,
              fontFamily: typography.fontFamily?.primary,
              fontSize: responsive.titleSize - 2,
              marginLeft: 8,
            }
          ]}>
            Funds will be locked immediately upon withdrawal request
          </Text>
        </View>
      </GlassContainer>

      {/* Bank Account Selector */}
      <BankAccountSelector />

      {/* Request Withdrawal Button */}
      <TouchableOpacity
        style={[
          styles.requestButton,
          {
            backgroundColor: colors.primary,
            opacity: (!amount || !selectedBankAccount || loading) ? 0.5 : 1,
            height: responsive.buttonHeight,
            marginBottom: responsive.spacing * 2,
          }
        ]}
        onPress={handleRequestWithdrawal}
        disabled={!amount || !selectedBankAccount || loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <>
            <Text style={[
              styles.requestButtonText,
              {
                color: '#ffffff',
                fontFamily: typography.fontFamily?.bold || typography.fontFamily?.primary,
                fontSize: responsive.titleSize,
              }
            ]}>
              Request Withdrawal
            </Text>
            <ArrowRight size={responsive.iconSize} color="#ffffff" strokeWidth={2} />
          </>
        )}
      </TouchableOpacity>

      {/* Modals */}
      <ConfirmationModal />
      <AddBankAccountModal />

      {/* Error Display */}
      {error && (
        <GlassContainer style={[styles.errorContainer, { padding: responsive.cardPadding, marginBottom: responsive.spacing }]}>
          <AlertCircle size={20} color={colors.error} strokeWidth={2} />
          <Text style={[
            styles.errorText,
            {
              color: colors.error,
              fontFamily: typography.fontFamily?.primary,
              fontSize: responsive.titleSize - 1,
              marginLeft: 8,
            }
          ]}>
            {error}
          </Text>
          <TouchableOpacity onPress={clearError}>
            <X size={20} color={colors.error} strokeWidth={2} />
          </TouchableOpacity>
        </GlassContainer>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  balanceCard: {
    alignItems: 'center',
  },
  balanceLabel: {
    opacity: 0.8,
  },
  balanceValue: {
    fontWeight: 'bold',
    marginVertical: 8,
  },
  balanceINR: {
    opacity: 0.8,
  },
  amountSection: {
  },
  sectionTitle: {
    fontWeight: 'bold',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  amountInput: {
    flex: 1,
    fontWeight: 'bold',
    padding: 0,
    outlineStyle: 'none',
  },
  currencyLabel: {
    fontWeight: 'bold',
    marginLeft: 8,
  },
  inrEquivalent: {
    alignItems: 'center',
  },
  inrLabel: {
    opacity: 0.8,
  },
  inrValue: {
    fontWeight: 'bold',
    marginVertical: 4,
  },
  exchangeRate: {
    opacity: 0.6,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  warningText: {
    flex: 1,
    lineHeight: 18,
  },
  sectionCard: {
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    opacity: 0.8,
  },
  bankAccountsList: {
    gap: 12,
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
  bankAccountInfo: {
    flex: 1,
  },
  bankAccountName: {
    fontWeight: '600',
    marginBottom: 4,
  },
  bankAccountNumber: {
    opacity: 0.8,
  },
  addBankButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      },
    }),
  },
  addBankButtonText: {
    fontWeight: '600',
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    gap: 8,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      },
    }),
  },
  requestButtonText: {
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 16,
  },
  addBankModal: {
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  modalBody: {
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmRowTotal: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    marginTop: 12,
  },
  confirmLabel: {
    opacity: 0.8,
  },
  confirmValue: {
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      },
    }),
  },
  cancelButton: {
  },
  confirmButton: {
  },
  buttonText: {
    fontWeight: '600',
  },
  formScrollView: {
    maxHeight: 400,
  },
  formGroup: {
  },
  formLabel: {
    marginBottom: 8,
    opacity: 0.8,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    outlineStyle: 'none',
  },
  accountTypeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  accountTypeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      },
    }),
  },
  accountTypeText: {
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    flex: 1,
    marginLeft: 8,
  },
});

export default WithdrawUSDT;
