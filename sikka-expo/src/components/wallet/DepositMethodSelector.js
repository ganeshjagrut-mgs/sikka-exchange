import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { CreditCard, Building2 } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import GlassContainer from '../ui/GlassContainer';

const DepositMethodSelector = ({ responsive }) => {
  const { colors, typography } = useTheme();
  const [selectedMethod, setSelectedMethod] = useState('online'); // 'online', 'bank', 'upi'

  const MethodButton = ({ method, label, icon: Icon, active }) => (
    <TouchableOpacity
      style={[
        styles.methodButton,
        {
          backgroundColor: active ? colors.primary + '20' : 'transparent',
          borderColor: active ? colors.primary : colors.border,
          borderWidth: 1,
          paddingHorizontal: responsive.cardPadding,
          paddingVertical: responsive.cardPadding * 0.75,
        }
      ]}
      onPress={() => setSelectedMethod(method)}
      activeOpacity={0.7}
    >
      <Icon
        size={responsive.iconSize}
        color={active ? colors.primary : colors.textSecondary}
        strokeWidth={1.8}
      />
      <Text style={[
        styles.methodButtonText,
        {
          color: active ? colors.primary : colors.textSecondary,
          fontFamily: typography.fontFamily?.primary,
          fontSize: responsive.titleSize - 1,
          marginLeft: 8,
        }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.methodSelection, { marginBottom: responsive.spacing }]}>
      <Text style={[
        styles.sectionTitle,
        {
          color: colors.text,
          fontFamily: typography.fontFamily?.primary,
          fontSize: responsive.titleSize + 2,
          marginBottom: responsive.spacing,
        }
      ]}>
        Other Deposit Methods
      </Text>

      <View style={styles.methodButtons}>
        <MethodButton
          method="bank"
          label="Bank Transfer"
          icon={Building2}
          active={selectedMethod === 'bank'}
        />
        <MethodButton
          method="upi"
          label="UPI Payment"
          icon={CreditCard}
          active={selectedMethod === 'upi'}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  methodSelection: {

  },
  sectionTitle: {
    fontWeight: 'bold',
  },
  methodButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
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
  methodButtonText: {
    fontWeight: '600',
  },
});

export default DepositMethodSelector;