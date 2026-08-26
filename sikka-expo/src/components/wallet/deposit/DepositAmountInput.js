import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Platform } from 'react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import { useBreakpoints } from '../../../hooks/useBreakpoints';
import GlassContainer from '../../ui/GlassContainer';
import { formatIndianCurrency } from '../../../utils/formatIndianCurrency';

/**
 * DepositAmountInput Component
 *
 * Handles deposit amount selection with preset buttons and custom input
 */
const DepositAmountInput = ({
  amount,
  setAmount,
  customAmount,
  setCustomAmount,
  onProceedToPayment,
  loading,
  error,
  onClearError
}) => {
  const { colors, typography } = useTheme();
  const { isMobile, isTablet } = useBreakpoints();

  // Responsive styling
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

  // Preset deposit amounts
  const presetAmounts = [500, 1000, 5000, 10000, 25000, 50000];

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
          <Text style={[
            styles.errorText,
            {
              color: colors.error || '#EF4444',
              fontFamily: typography.fontFamily?.primary,
              fontSize: responsive.titleSize - 2,
            }
          ]}>
            {error}
          </Text>
          <TouchableOpacity
            onPress={onClearError}
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

      {/* Proceed to Payment Button */}
      <TouchableOpacity
        style={[
          styles.proceedButton,
          {
            backgroundColor: colors.primary,
            opacity: !amount || loading ? 0.5 : 1,
            height: responsive.buttonHeight,
          }
        ]}
        onPress={onProceedToPayment}
        disabled={!amount || loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={[
            styles.proceedButtonText,
            {
              color: '#ffffff',
              fontFamily: typography.fontFamily?.bold || typography.fontFamily?.primary,
              fontSize: responsive.titleSize,
            }
          ]}>
            Proceed to Payment
          </Text>
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
});

export default DepositAmountInput;