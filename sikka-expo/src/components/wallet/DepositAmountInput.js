import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, Platform, Clipboard } from 'react-native';
import { ArrowRight, Info, Copy } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import useWalletStore from '../../store/walletStore';
import GlassContainer from '../ui/GlassContainer';
import { formatIndianCurrency } from '../../utils/formatIndianCurrency';

const DepositAmountInput = ({ onProceedToPayment, depositInfo, responsive }) => {
  const { colors, typography } = useTheme();
  const { loading, error, clearError } = useWalletStore();

  const [amount, setAmount] = useState('');
  const [customAmount, setCustomAmount] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');

  // Preset deposit amounts
  const presetAmounts = [10, 25, 50, 100, 250, 500];

  // Default deposit info if not provided (USD)
  const defaultDepositInfo = {
    minAmount: 10,       // $10 USD minimum
    maxAmount: 10000,    // $10,000 USD maximum
  };

  const currentDepositInfo = depositInfo || defaultDepositInfo;

  // Handle preset amount selection
  const handlePresetAmount = (presetAmount) => {
    setAmount(presetAmount.toString());
    setCustomAmount(false);
  };

  // Handle custom amount input
  const handleCustomAmountInput = (text) => {
    // Remove non-numeric characters
    const numericValue = text.replace(/[^0-9]/g, '');
    setAmount(numericValue);
    setCustomAmount(true);
  };

  // Handle copy to clipboard
  const handleCopy = (text, label) => {
    Clipboard.setString(text);
    if (Platform.OS === 'web') {
      // For web, use the navigator.clipboard API if available
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
      }
    }
    Alert.alert('Copied!', `${label} copied to clipboard`);
  };

  // Handle proceed to payment
  const handleProceed = () => {
    const depositAmount = parseInt(amount);

    // Validation
    if (!depositAmount || depositAmount < currentDepositInfo.minAmount) {
      Alert.alert('Invalid Amount', `Minimum deposit amount is ${formatIndianCurrency(currentDepositInfo.minAmount)}`);
      return;
    }

    if (depositAmount > currentDepositInfo.maxAmount) {
      Alert.alert('Invalid Amount', `Maximum deposit amount is ${formatIndianCurrency(currentDepositInfo.maxAmount)}`);
      return;
    }

    // Validate UTR number
    if (!utrNumber || utrNumber.trim().length === 0) {
      Alert.alert('UTR Required', 'Please enter the UTR/Reference number from your bank transfer');
      return;
    }

    onProceedToPayment(amount, utrNumber.trim());
  };

  return (
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
        Enter Deposit Amount
      </Text>

      {/* Error Banner */}
      {error && (
        <View style={[styles.errorBanner, { backgroundColor: (colors.error || '#EF4444') + '20', borderColor: (colors.error || '#EF4444') + '40', marginBottom: responsive.spacing }]}>
          <Info size={16} color={colors.error || '#EF4444'} strokeWidth={2} />
          <Text style={[
            styles.errorText,
            {
              color: colors.error || '#EF4444',
              fontFamily: typography.fontFamily?.primary,
              fontSize: responsive.titleSize - 2,
              marginLeft: 8,
            }
          ]}>
            {error}
          </Text>
          <TouchableOpacity
            onPress={() => clearError()}
            style={styles.errorCloseButton}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.errorCloseText,
              { color: colors.error || '#EF4444' }
            ]}>
              ×
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Custom Amount Input */}
      <View style={[styles.amountInputContainer, { borderColor: colors.border }]}>
        <Text style={[styles.currencySymbol, { color: colors.textSecondary, fontSize: responsive.titleSize + 4 }]}>
          $
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
          onChangeText={handleCustomAmountInput}
          editable={!loading}
        />
      </View>

      {/* Preset Amount Buttons */}
      <View style={styles.presetAmounts}>
        {presetAmounts.map((preset) => (
          <TouchableOpacity
            key={preset}
            style={[
              styles.presetButton,
              {
                backgroundColor: amount === preset.toString() && !customAmount
                  ? colors.primary + '20'
                  : colors.background + '40',
                borderColor: amount === preset.toString() && !customAmount
                  ? colors.primary
                  : colors.border,
                borderWidth: 1,
              }
            ]}
            onPress={() => handlePresetAmount(preset)}
            activeOpacity={0.7}
            disabled={loading}
          >
            <Text style={[
              styles.presetText,
              {
                color: amount === preset.toString() && !customAmount
                  ? colors.primary
                  : colors.textSecondary,
                fontFamily: typography.fontFamily?.primary,
                fontSize: responsive.titleSize - 2,
              }
            ]}>
              {formatIndianCurrency(preset)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Bank Account Details */}
      <View style={[styles.bankDetailsContainer, { borderColor: colors.border, backgroundColor: colors.primary + '10', marginBottom: 16 }]}>
        <Text style={[
          styles.bankDetailsTitle,
          {
            color: colors.text,
            fontFamily: typography.fontFamily?.bold || typography.fontFamily?.primary,
            fontSize: responsive.titleSize,
            marginBottom: 12,
          }
        ]}>
          Transfer Amount to:
        </Text>

        {/* Account Name */}
        <View style={styles.bankDetailRow}>
          <View style={styles.bankDetailLeft}>
            <Text style={[styles.bankDetailLabel, { color: colors.textSecondary, fontSize: responsive.titleSize - 2 }]}>Account Name:</Text>
            <Text style={[styles.bankDetailValue, { color: colors.text, fontSize: responsive.titleSize - 2, fontFamily: typography.fontFamily?.primary }]}>
              CRYPEXCH TECHNOLOGIES PRIVATE LIMITED
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => handleCopy('CRYPEXCH TECHNOLOGIES PRIVATE LIMITED', 'Account Name')}
            style={[styles.copyButton, { backgroundColor: colors.primary + '20' }]}
            activeOpacity={0.7}
          >
            <Copy size={16} color={colors.primary} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Account Number */}
        <View style={styles.bankDetailRow}>
          <View style={styles.bankDetailLeft}>
            <Text style={[styles.bankDetailLabel, { color: colors.textSecondary, fontSize: responsive.titleSize - 2 }]}>Account Number:</Text>
            <Text style={[styles.bankDetailValue, { color: colors.text, fontSize: responsive.titleSize - 2, fontFamily: typography.fontFamily?.bold || typography.fontFamily?.primary }]}>
              99998855894319
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => handleCopy('99998855894319', 'Account Number')}
            style={[styles.copyButton, { backgroundColor: colors.primary + '20' }]}
            activeOpacity={0.7}
          >
            <Copy size={16} color={colors.primary} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* IFSC Code */}
        <View style={styles.bankDetailRow}>
          <View style={styles.bankDetailLeft}>
            <Text style={[styles.bankDetailLabel, { color: colors.textSecondary, fontSize: responsive.titleSize - 2 }]}>IFSC Code:</Text>
            <Text style={[styles.bankDetailValue, { color: colors.text, fontSize: responsive.titleSize - 2, fontFamily: typography.fontFamily?.bold || typography.fontFamily?.primary }]}>
              HDFC0004692
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => handleCopy('HDFC0004692', 'IFSC Code')}
            style={[styles.copyButton, { backgroundColor: colors.primary + '20' }]}
            activeOpacity={0.7}
          >
            <Copy size={16} color={colors.primary} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Account Type */}
        <View style={styles.bankDetailRow}>
          <View style={styles.bankDetailLeft}>
            <Text style={[styles.bankDetailLabel, { color: colors.textSecondary, fontSize: responsive.titleSize - 2 }]}>Account Type:</Text>
            <Text style={[styles.bankDetailValue, { color: colors.text, fontSize: responsive.titleSize - 2, fontFamily: typography.fontFamily?.primary }]}>
              Current
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => handleCopy('Current', 'Account Type')}
            style={[styles.copyButton, { backgroundColor: colors.primary + '20' }]}
            activeOpacity={0.7}
          >
            <Copy size={16} color={colors.primary} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* UTR Number Input */}
      <View style={[styles.utrInputContainer, { borderColor: colors.border, marginBottom: 16 }]}>
        <Text style={[
          styles.utrLabel,
          {
            color: colors.text,
            fontFamily: typography.fontFamily?.primary,
            fontSize: responsive.titleSize - 2,
            marginBottom: 8,
          }
        ]}>
          UTR / Reference Number
        </Text>
        <TextInput
          style={[
            styles.utrInput,
            {
              color: colors.text,
              borderColor: colors.border,
              fontFamily: typography.fontFamily?.primary,
              fontSize: responsive.titleSize,
            }
          ]}
          placeholder="Enter UTR or reference number"
          placeholderTextColor={colors.textSecondary + '60'}
          value={utrNumber}
          onChangeText={setUtrNumber}
          editable={!loading}
          autoCapitalize="characters"
        />
      </View>

      {/* Submit Deposit Button */}
      <TouchableOpacity
        style={[
          styles.proceedButton,
          {
            backgroundColor: colors.primary,
            opacity: !amount || !utrNumber || loading ? 0.5 : 1,
            height: responsive.buttonHeight || 56,
          }
        ]}
        onPress={handleProceed}
        disabled={!amount || !utrNumber || loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <>
            <Text style={[
              styles.proceedButtonText,
              {
                color: '#ffffff',
                fontFamily: typography.fontFamily?.bold || typography.fontFamily?.primary,
                fontSize: responsive.titleSize,
              }
            ]}>
              Submit Deposit
            </Text>
            <ArrowRight size={responsive.iconSize} color="#ffffff" strokeWidth={2} />
          </>
        )}
      </TouchableOpacity>
    </GlassContainer>
  );
};

const styles = StyleSheet.create({
  amountSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  errorText: {
    flex: 1,
  },
  errorCloseButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      },
    }),
  },
  errorCloseText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
  },
  currencySymbol: {
    fontWeight: 'bold',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontWeight: 'bold',
    padding: 0,
    outlineStyle: 'none', // Remove outline on web
  },
  presetAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  presetButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      },
    }),
  },
  presetText: {
    fontWeight: '600',
  },
  proceedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    gap: 8,
    height: 56,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      },
    }),
  },
  proceedButtonText: {
    fontWeight: 'bold',
  },
  bankDetailsContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  bankDetailsTitle: {
    fontWeight: 'bold',
  },
  bankDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 12,
  },
  bankDetailLabel: {
    flex: 0,
    minWidth: 110,
  },
  bankDetailLeft: {
    flex: 1,
  },
  bankDetailValue: {
    flex: 1,
    textAlign: 'right',
  },
  copyButton: {
    padding: 8,
    borderRadius: 8,
    marginLeft: 8,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      },
    }),
  },
  utrInputContainer: {
    marginTop: 8,
  },
  utrLabel: {
    fontWeight: '600',
  },
  utrInput: {
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    outlineStyle: 'none', // Remove outline on web
  },
});

export default DepositAmountInput;