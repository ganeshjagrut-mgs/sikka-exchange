import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, Alert, Linking, AppState } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useStore } from '../../store/useStore';
import useWalletStore from '../../store/walletStore';
import useKYCStore from '../../store/kycStore';
import { router } from 'expo-router';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import paymentService from '../../services/paymentService';
import API_CONFIG from '../../config/api';
import { formatIndianCurrency } from '../../utils/formatIndianCurrency';
import DepositAmountInput from './DepositAmountInput';
import DepositHistory from './DepositHistory';

/**
 * DepositINR Component
 *
 * Simplified INR deposit interface via Cashfree payment gateway
 * Features:
 * - Amount input with payment processing via Cashfree
 * - Recent deposit history
 * - Responsive design for all screen sizes
 */
const DepositINR = () => {
  const { colors, typography } = useTheme();
  const { user } = useStore();
  const { createDeposit, loading, error, fetchBalance, deposits, fetchDepositHistory, clearError } = useWalletStore();
  const { kycStatus } = useKYCStore();
  const { isMobile, isTablet } = useBreakpoints();

  const [paymentCapabilities, setPaymentCapabilities] = useState(null);

  // Deposit information constants (USD)
  const depositInfo = {
    minAmount: 10,       // $10 USD minimum
    maxAmount: 10000,    // $10,000 USD maximum
    processingTime: '2-5 minutes',
  };

  // Initialize payment service and check capabilities
  useEffect(() => {
    const capabilities = paymentService.getCapabilities();
    setPaymentCapabilities(capabilities);

    console.log('[DepositINR] Payment capabilities:', capabilities);

    // Show info message on web platform
    if (capabilities.platform === 'web') {
      console.log('[DepositINR] Running on web - using browser redirect for payments');
    } else if (capabilities.requiresDevelopmentBuild) {
      console.warn('[DepositINR] Native SDK requires development build. Run: npx expo run:android or npx expo run:ios');
    }

    // Fetch deposit history on component mount
    fetchDepositHistory({ limit: 10 });

    // Clear any existing errors when component mounts
    return () => {
      clearError();
    };
  }, [fetchDepositHistory, clearError]);

  // Auto-refresh balance when user returns to app after payment
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('[DepositINR] App became active - refreshing balance');
        fetchBalance();
      }
    });

    return () => {
      subscription?.remove();
    };
  }, [fetchBalance]);

  // Responsive styling based on screen size
  const getResponsiveStyles = () => {
    if (isMobile) {
      return {
        cardPadding: 16,
        titleSize: 16,
        valueSize: 18,
        iconSize: 20,
        spacing: 12,
      };
    } else if (isTablet) {
      return {
        cardPadding: 18,
        titleSize: 17,
        valueSize: 20,
        iconSize: 22,
        spacing: 16,
      };
    } else {
      return {
        cardPadding: 20,
        titleSize: 18,
        valueSize: 22,
        iconSize: 24,
        spacing: 20,
      };
    }
  };

  const responsive = getResponsiveStyles();

  // Handle manual bank transfer deposit submission
  const handleProceedToPayment = async (amount, utrNumber) => {
    // Block non-KYC users
    if (kycStatus?.status !== 'approved') {
      Alert.alert(
        'Complete KYC',
        'Verify your identity to deposit funds.',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Complete KYC', onPress: () => router.push('/(tabs)/kyc') }
        ]
      );
      return;
    }

    const depositAmount = parseInt(amount);

    // Validation
    if (!depositAmount || depositAmount < depositInfo.minAmount) {
      Alert.alert('Invalid Amount', `Minimum deposit amount is ${formatIndianCurrency(depositInfo.minAmount)}`);
      return;
    }

    if (depositAmount > depositInfo.maxAmount) {
      Alert.alert('Invalid Amount', `Maximum deposit amount is ${formatIndianCurrency(depositInfo.maxAmount)}`);
      return;
    }

    if (!utrNumber || utrNumber.trim().length === 0) {
      Alert.alert('UTR Required', 'Please enter the UTR/Reference number from your bank transfer');
      return;
    }

    try {
      console.log('💰 Submitting manual deposit:', { amount: depositAmount, utrNumber });

      // Call manual deposit API
      const response = await useWalletStore.getState().createManualDeposit(depositAmount, utrNumber);

      console.log('✅ Manual deposit submitted successfully:', response);

      // Show success message
      if (Platform.OS === 'web') {
        window.alert('Deposit Submitted!\n\nYour deposit has been submitted for admin approval. You will be notified once it is processed.');
      } else {
        Alert.alert(
          'Deposit Submitted!',
          'Your deposit has been submitted for admin approval. You will be notified once it is processed.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Refresh deposit history
                fetchDepositHistory({ limit: 10 });
              },
            },
          ]
        );
      }

      // Refresh deposit history
      fetchDepositHistory({ limit: 10 });
    } catch (error) {
      console.error('❌ Manual deposit submission failed:', error);
      if (Platform.OS === 'web') {
        window.alert(`Deposit Failed\n\n${error.message || error.error || 'Failed to submit deposit. Please try again.'}`);
      } else {
        Alert.alert(
          'Deposit Failed',
          error.message || error.error || 'Failed to submit deposit. Please try again.'
        );
      }
    }
  };

  /* CASHFREE PAYMENT FLOW - COMMENTED OUT FOR MANUAL BANK TRANSFER
  const handleProceedToPayment_CASHFREE = async (amount) => {
    const depositAmount = parseInt(amount);

    // Validation
    if (!depositAmount || depositAmount < depositInfo.minAmount) {
      Alert.alert('Invalid Amount', `Minimum deposit amount is ${formatIndianCurrency(depositInfo.minAmount)}`);
      return;
    }

    if (depositAmount > depositInfo.maxAmount) {
      Alert.alert('Invalid Amount', `Maximum deposit amount is ${formatIndianCurrency(depositInfo.maxAmount)}`);
      return;
    }

    try {
      console.log('💰 Processing deposit of ₹' + depositAmount);

      // Step 1: Create deposit order on backend
      const paymentDetails = await createDeposit(depositAmount);

      console.log('✅ Payment details received:', {
        orderId: paymentDetails.orderId,
        sessionId: paymentDetails.paymentSessionId,
        hasPaymentUrl: !!paymentDetails.paymentUrl
      });

      // Step 2: Build checkout page URL with payment session
      const checkoutUrl = `${API_CONFIG.API_BASE_URL}/checkout?session=${paymentDetails.paymentSessionId}&order_id=${paymentDetails.orderId}&amount=${depositAmount}`;

      console.log('🔗 Opening checkout page:', checkoutUrl);

      // Step 3: Open checkout page in browser
      if (Platform.OS === 'web') {
        window.open(checkoutUrl, '_blank');
        Alert.alert(
          'Payment Page Opened',
          'Complete your payment in the new tab. Once done, your balance will be updated automatically.',
          [
            {
              text: 'OK',
              onPress: () => {
                fetchBalance();
              },
            },
          ]
        );
      } else {
        const supported = await Linking.canOpenURL(checkoutUrl);
        if (supported) {
          Alert.alert(
            'Opening Payment Page',
            'You will be redirected to complete your payment. After payment, manually return to this app to see your updated balance.',
            [
              {
                text: 'Continue',
                onPress: async () => {
                  await Linking.openURL(checkoutUrl);
                },
              },
              {
                text: 'Cancel',
                style: 'cancel',
              },
            ]
          );
        } else {
          Alert.alert('Error', 'Unable to open payment page');
        }
      }
    } catch (error) {
      console.error('❌ Payment initiation failed:', error);
      Alert.alert(
        'Payment Failed',
        error.message || error.error || 'Failed to create payment order. Please try again.'
      );
    }
  };
  END OF CASHFREE FLOW */

  return (
    <View style={styles.container}>
      {/* Amount Input Section */}
      <DepositAmountInput
        onProceedToPayment={handleProceedToPayment}
        depositInfo={depositInfo}
        responsive={responsive}
      />

      {/* Recent Deposit History */}
      <DepositHistory responsive={responsive} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'ios' ? 105 : 85, // Account for bottom tab bar
  },
});

export default DepositINR;