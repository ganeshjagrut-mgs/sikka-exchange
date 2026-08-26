import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import {
  Send,
  X,
  Search,
  User,
  Mail,
  Phone,
  ChevronDown,
  Check,
  AlertCircle,
  ArrowUpRight,
} from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import useWalletStore from '../../store/walletStore';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import GlassContainer from '../ui/GlassContainer';
import backendApi from '../../services/backendApi';

/**
 * SendCrypto Component
 *
 * Modal for sending crypto to other Sikka users
 * Features:
 * - Recipient lookup by email or phone
 * - Currency selection from user's holdings
 * - Amount input with MAX button
 * - Balance display for selected currency
 * - Note/memo field
 * - Confirmation step before sending
 * - Success/error handling
 */
const SendCrypto = ({ visible, onClose }) => {
  const { colors, typography } = useTheme();
  const { balance, holdings, fetchBalance, fetchHoldings } = useWalletStore();
  const { isMobile, isTablet } = useBreakpoints();

  // States
  const [step, setStep] = useState('lookup'); // 'lookup', 'amount', 'confirm', 'success'
  const [lookupType, setLookupType] = useState('email');
  const [lookupValue, setLookupValue] = useState('');
  const [recipient, setRecipient] = useState(null);
  const [selectedCurrency, setSelectedCurrency] = useState('USDT');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [transferResult, setTransferResult] = useState(null);

  // Available currencies from holdings
  const [availableCurrencies, setAvailableCurrencies] = useState([]);

  // Minimum amounts per currency
  const MIN_AMOUNTS = {
    BTC: 0.0001,
    ETH: 0.001,
    USDT: 1,
    USDC: 1,
    SOL: 0.01,
    ADA: 1,
    DEFAULT: 0.001,
  };

  // Load holdings on mount
  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  // Build available currencies from holdings
  useEffect(() => {
    if (balance) {
      const currencies = [];
      const tradeBalances = balance.trade?.balances || balance.balances || [];

      tradeBalances.forEach((b) => {
        const available = parseFloat(b.available || 0);
        if (available > 0) {
          currencies.push({
            currency: b.currency,
            available: available,
            valueUSD: parseFloat(b.valueUSD || available),
          });
        }
      });

      // Sort by value (highest first)
      currencies.sort((a, b) => b.valueUSD - a.valueUSD);
      setAvailableCurrencies(currencies);

      // Default to USDT if available, otherwise first currency
      const hasUSDT = currencies.find((c) => c.currency === 'USDT');
      if (hasUSDT) {
        setSelectedCurrency('USDT');
      } else if (currencies.length > 0) {
        setSelectedCurrency(currencies[0].currency);
      }
    }
  }, [balance]);

  const loadData = async () => {
    try {
      await Promise.all([fetchBalance(), fetchHoldings()]);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const resetForm = () => {
    setStep('lookup');
    setLookupValue('');
    setRecipient(null);
    setAmount('');
    setNote('');
    setError('');
    setTransferResult(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Get available balance for selected currency
  const getAvailableBalance = () => {
    const currencyData = availableCurrencies.find(
      (c) => c.currency === selectedCurrency
    );
    return currencyData?.available || 0;
  };

  // Lookup recipient
  const handleLookup = async () => {
    if (!lookupValue.trim()) {
      setError('Please enter an email or phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await backendApi.p2p.lookup(lookupType, lookupValue.trim());

      if (response.success && response.data.found) {
        setRecipient(response.data.recipient);
        setStep('amount');
      } else if (response.success && !response.data.found) {
        setError(response.data.message || 'User not found');
      } else {
        setError(response.message || 'Lookup failed');
      }
    } catch (error) {
      console.error('Lookup error:', error);
      setError(error.message || 'Failed to lookup recipient');
    } finally {
      setLoading(false);
    }
  };

  // Validate and proceed to confirmation
  const handleProceedToConfirm = () => {
    const amountNum = parseFloat(amount);
    const available = getAvailableBalance();
    const minAmount = MIN_AMOUNTS[selectedCurrency] || MIN_AMOUNTS.DEFAULT;

    if (!amountNum || amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (amountNum < minAmount) {
      setError(`Minimum amount for ${selectedCurrency} is ${minAmount}`);
      return;
    }

    if (amountNum > available) {
      setError(`Insufficient balance. Available: ${available.toFixed(8)} ${selectedCurrency}`);
      return;
    }

    setError('');
    setStep('confirm');
  };

  // Execute transfer
  const handleSendTransfer = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await backendApi.p2p.transfer(
        recipient.id,
        selectedCurrency,
        parseFloat(amount),
        note
      );

      if (response.success) {
        setTransferResult(response.data);
        setStep('success');
        // Refresh balance
        fetchBalance();
      } else {
        setError(response.message || 'Transfer failed');
      }
    } catch (error) {
      console.error('Transfer error:', error);
      setError(error.message || 'Failed to send transfer');
    } finally {
      setLoading(false);
    }
  };

  // Set max amount
  const handleSetMax = () => {
    const available = getAvailableBalance();
    setAmount(available.toString());
  };

  // Responsive styling
  const getResponsiveStyles = () => {
    if (isMobile) {
      return {
        modalPadding: 16,
        titleSize: 20,
        labelSize: 14,
        inputHeight: 48,
        buttonHeight: 48,
        spacing: 12,
      };
    } else if (isTablet) {
      return {
        modalPadding: 24,
        titleSize: 22,
        labelSize: 15,
        inputHeight: 52,
        buttonHeight: 52,
        spacing: 16,
      };
    } else {
      return {
        modalPadding: 32,
        titleSize: 24,
        labelSize: 16,
        inputHeight: 56,
        buttonHeight: 56,
        spacing: 20,
      };
    }
  };

  const responsive = getResponsiveStyles();

  // Render lookup step
  const renderLookupStep = () => (
    <View style={styles.stepContainer}>
      <Text
        style={[
          styles.stepTitle,
          {
            color: colors.text,
            fontFamily: typography.fontFamily?.primary,
            fontSize: responsive.titleSize - 4,
          },
        ]}
      >
        Find Recipient
      </Text>

      {/* Lookup type tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            lookupType === 'email' && { backgroundColor: colors.primary + '20' },
          ]}
          onPress={() => setLookupType('email')}
        >
          <Mail size={18} color={lookupType === 'email' ? colors.primary : colors.textSecondary} />
          <Text
            style={[
              styles.tabText,
              {
                color: lookupType === 'email' ? colors.primary : colors.textSecondary,
                fontFamily: typography.fontFamily?.primary,
              },
            ]}
          >
            Email
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            lookupType === 'phone' && { backgroundColor: colors.primary + '20' },
          ]}
          onPress={() => setLookupType('phone')}
        >
          <Phone size={18} color={lookupType === 'phone' ? colors.primary : colors.textSecondary} />
          <Text
            style={[
              styles.tabText,
              {
                color: lookupType === 'phone' ? colors.primary : colors.textSecondary,
                fontFamily: typography.fontFamily?.primary,
              },
            ]}
          >
            Phone
          </Text>
        </TouchableOpacity>
      </View>

      {/* Input field */}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.background,
            borderColor: error ? colors.error : colors.border,
            height: responsive.inputHeight,
          },
        ]}
      >
        <Search size={20} color={colors.textSecondary} />
        <TextInput
          style={[
            styles.input,
            {
              color: colors.text,
              fontFamily: typography.fontFamily?.primary,
              fontSize: responsive.labelSize,
            },
          ]}
          placeholder={lookupType === 'email' ? 'Enter email address' : 'Enter phone number'}
          placeholderTextColor={colors.textSecondary}
          value={lookupValue}
          onChangeText={setLookupValue}
          keyboardType={lookupType === 'phone' ? 'phone-pad' : 'email-address'}
          autoCapitalize="none"
        />
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <AlertCircle size={16} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.primaryButton,
          {
            backgroundColor: colors.primary,
            height: responsive.buttonHeight,
            opacity: loading ? 0.7 : 1,
          },
        ]}
        onPress={handleLookup}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text style={[styles.buttonText, { fontFamily: typography.fontFamily?.primary }]}>
            Find User
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  // Render amount step
  const renderAmountStep = () => (
    <View style={styles.stepContainer}>
      {/* Recipient card */}
      <View style={[styles.recipientCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <User size={24} color={colors.primary} />
        <View style={styles.recipientInfo}>
          <Text style={[styles.recipientName, { color: colors.text, fontFamily: typography.fontFamily?.primary }]}>
            {recipient?.name}
          </Text>
          <Text style={[styles.recipientEmail, { color: colors.textSecondary, fontFamily: typography.fontFamily?.primary }]}>
            {recipient?.email || recipient?.phone || 'Sikka User'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setStep('lookup')}>
          <Text style={[styles.changeText, { color: colors.primary }]}>Change</Text>
        </TouchableOpacity>
      </View>

      {/* Currency selector */}
      <Text style={[styles.label, { color: colors.textSecondary, fontFamily: typography.fontFamily?.primary }]}>
        Select Currency
      </Text>
      <TouchableOpacity
        style={[
          styles.currencySelector,
          { backgroundColor: colors.background, borderColor: colors.border, height: responsive.inputHeight },
        ]}
        onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
      >
        <Text style={[styles.currencyText, { color: colors.text, fontFamily: typography.fontFamily?.primary }]}>
          {selectedCurrency}
        </Text>
        <View style={styles.currencyBalance}>
          <Text style={[styles.balanceText, { color: colors.textSecondary }]}>
            Available: {getAvailableBalance().toFixed(8)}
          </Text>
          <ChevronDown size={20} color={colors.textSecondary} />
        </View>
      </TouchableOpacity>

      {/* Currency picker dropdown */}
      {showCurrencyPicker && (
        <View style={[styles.currencyDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {availableCurrencies.map((c) => (
            <TouchableOpacity
              key={c.currency}
              style={[
                styles.currencyOption,
                selectedCurrency === c.currency && { backgroundColor: colors.primary + '20' },
              ]}
              onPress={() => {
                setSelectedCurrency(c.currency);
                setShowCurrencyPicker(false);
              }}
            >
              <Text style={[styles.currencyOptionText, { color: colors.text }]}>{c.currency}</Text>
              <Text style={[styles.currencyOptionBalance, { color: colors.textSecondary }]}>
                {c.available.toFixed(8)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Amount input */}
      <Text style={[styles.label, { color: colors.textSecondary, fontFamily: typography.fontFamily?.primary, marginTop: responsive.spacing }]}>
        Amount
      </Text>
      <View
        style={[
          styles.inputContainer,
          { backgroundColor: colors.background, borderColor: error ? colors.error : colors.border, height: responsive.inputHeight },
        ]}
      >
        <TextInput
          style={[styles.input, { color: colors.text, fontFamily: typography.fontFamily?.primary, fontSize: responsive.labelSize + 2 }]}
          placeholder="0.00"
          placeholderTextColor={colors.textSecondary}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />
        <TouchableOpacity style={[styles.maxButton, { backgroundColor: colors.primary + '20' }]} onPress={handleSetMax}>
          <Text style={[styles.maxButtonText, { color: colors.primary }]}>MAX</Text>
        </TouchableOpacity>
      </View>

      {/* Note input */}
      <Text style={[styles.label, { color: colors.textSecondary, fontFamily: typography.fontFamily?.primary, marginTop: responsive.spacing }]}>
        Note (optional)
      </Text>
      <View style={[styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.border, height: responsive.inputHeight }]}>
        <TextInput
          style={[styles.input, { color: colors.text, fontFamily: typography.fontFamily?.primary }]}
          placeholder="Add a message..."
          placeholderTextColor={colors.textSecondary}
          value={note}
          onChangeText={setNote}
          maxLength={50}
        />
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <AlertCircle size={16} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: colors.primary, height: responsive.buttonHeight, marginTop: responsive.spacing }]}
        onPress={handleProceedToConfirm}
      >
        <Text style={[styles.buttonText, { fontFamily: typography.fontFamily?.primary }]}>Continue</Text>
      </TouchableOpacity>
    </View>
  );

  // Render confirm step
  const renderConfirmStep = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: colors.text, fontFamily: typography.fontFamily?.primary, fontSize: responsive.titleSize - 4 }]}>
        Confirm Transfer
      </Text>

      <View style={[styles.confirmCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <View style={styles.confirmRow}>
          <Text style={[styles.confirmLabel, { color: colors.textSecondary }]}>To</Text>
          <Text style={[styles.confirmValue, { color: colors.text }]}>{recipient?.name}</Text>
        </View>
        <View style={styles.confirmRow}>
          <Text style={[styles.confirmLabel, { color: colors.textSecondary }]}>Amount</Text>
          <Text style={[styles.confirmValue, { color: colors.text, fontWeight: 'bold' }]}>
            {parseFloat(amount).toFixed(8)} {selectedCurrency}
          </Text>
        </View>
        <View style={styles.confirmRow}>
          <Text style={[styles.confirmLabel, { color: colors.textSecondary }]}>Fee</Text>
          <Text style={[styles.confirmValue, { color: colors.success }]}>FREE</Text>
        </View>
        {note && (
          <View style={styles.confirmRow}>
            <Text style={[styles.confirmLabel, { color: colors.textSecondary }]}>Note</Text>
            <Text style={[styles.confirmValue, { color: colors.text }]}>{note}</Text>
          </View>
        )}
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <AlertCircle size={16} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: colors.border, height: responsive.buttonHeight, flex: 1, marginRight: 8 }]}
          onPress={() => setStep('amount')}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.primary, height: responsive.buttonHeight, flex: 2, opacity: loading ? 0.7 : 1 }]}
          onPress={handleSendTransfer}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Send size={18} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={[styles.buttonText, { fontFamily: typography.fontFamily?.primary }]}>Send Now</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render success step
  const renderSuccessStep = () => (
    <View style={[styles.stepContainer, styles.successContainer]}>
      <View style={[styles.successIcon, { backgroundColor: colors.success + '20' }]}>
        <Check size={48} color={colors.success} />
      </View>
      <Text style={[styles.successTitle, { color: colors.text, fontFamily: typography.fontFamily?.primary }]}>
        Transfer Sent!
      </Text>
      <Text style={[styles.successAmount, { color: colors.primary, fontFamily: typography.fontFamily?.primary }]}>
        {transferResult?.amount} {transferResult?.currency}
      </Text>
      <Text style={[styles.successRecipient, { color: colors.textSecondary }]}>
        sent to {transferResult?.recipientName}
      </Text>

      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: colors.primary, height: responsive.buttonHeight, marginTop: 32 }]}
        onPress={handleClose}
      >
        <Text style={[styles.buttonText, { fontFamily: typography.fontFamily?.primary }]}>Done</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.card || '#1a1a2e' }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <ArrowUpRight size={24} color={colors.primary} />
              <Text style={[styles.modalTitle, { color: colors.text, fontFamily: typography.fontFamily?.primary, fontSize: responsive.titleSize }]}>
                Send Crypto
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {step === 'lookup' && renderLookupStep()}
            {step === 'amount' && renderAmountStep()}
            {step === 'confirm' && renderConfirmStep()}
            {step === 'success' && renderSuccessStep()}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    minHeight: '50%',
    backgroundColor: '#1a1a2e',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontWeight: 'bold',
    marginLeft: 12,
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    padding: 20,
  },
  stepContainer: {
    paddingBottom: 40,
  },
  stepTitle: {
    fontWeight: '600',
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 10,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  errorText: {
    fontSize: 13,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    marginTop: 16,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  recipientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  recipientInfo: {
    flex: 1,
    marginLeft: 12,
  },
  recipientName: {
    fontSize: 16,
    fontWeight: '600',
  },
  recipientEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  changeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  currencySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  currencyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  currencyBalance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balanceText: {
    fontSize: 12,
  },
  currencyDropdown: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    maxHeight: 200,
  },
  currencyOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  currencyOptionText: {
    fontSize: 15,
    fontWeight: '500',
  },
  currencyOptionBalance: {
    fontSize: 13,
  },
  maxButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  maxButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  confirmCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginTop: 8,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  confirmLabel: {
    fontSize: 14,
  },
  confirmValue: {
    fontSize: 14,
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  successContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  successAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 8,
  },
  successRecipient: {
    fontSize: 16,
    marginTop: 4,
  },
});

export default SendCrypto;
