import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
import { Copy, CreditCard, Building2, User, Hash } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import GlassContainer from '../ui/GlassContainer';

const BankDepositDetails = ({ responsive }) => {
  const { colors, typography } = useTheme();
  const [selectedMethod, setSelectedMethod] = useState('bank'); // 'bank', 'upi'

  // Bank account details for deposits
  const bankDetails = {
    bankName: 'State Bank of India',
    accountName: 'Sikkaa Technologies Private Limited',
    accountNumber: '1234567890123456',
    ifscCode: 'SBIN0001234',
    branch: 'Mumbai Main Branch',
    accountType: 'Current Account',
  };

  const upiDetails = {
    upiId: 'sikka@sbi',
    merchantCode: 'SIKKA001',
  };

  // Copy text to clipboard
  const copyToClipboard = (text, label) => {
    if (Platform.OS === 'web') {
      navigator.clipboard.writeText(text).then(() => {
        Alert.alert('Copied!', `${label} copied to clipboard`);
      });
    } else {
      // React Native clipboard functionality would go here
      Alert.alert('Copied!', `${label} copied to clipboard`);
    }
  };

  const CopyableField = ({ label, value, icon: Icon }) => (
    <View style={styles.copyableField}>
      <View style={styles.fieldLeft}>
        <Icon size={responsive.iconSize - 2} color={colors.textSecondary} strokeWidth={1.5} />
        <View style={styles.fieldInfo}>
          <Text style={[
            styles.fieldLabel,
            {
              color: colors.textSecondary,
              fontFamily: typography.fontFamily?.primary,
              fontSize: responsive.titleSize - 3,
            }
          ]}>
            {label}
          </Text>
          <Text style={[
            styles.fieldValue,
            {
              color: colors.text,
              fontFamily: typography.fontFamily?.primary,
              fontSize: responsive.titleSize,
            }
          ]}>
            {value}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.copyButton,
          { backgroundColor: colors.background + '40' }
        ]}
        onPress={() => copyToClipboard(value, label)}
        activeOpacity={0.7}
      >
        <Copy size={16} color={colors.primary} strokeWidth={1.8} />
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      {/* Bank Transfer Details */}
      {selectedMethod === 'bank' && (
        <GlassContainer style={[styles.detailsCard, { padding: responsive.cardPadding, marginBottom: responsive.spacing }]}>
          <View style={styles.cardHeader}>
            <Building2 size={responsive.iconSize + 2} color={colors.primary} strokeWidth={1.5} />
            <Text style={[
              styles.cardTitle,
              {
                color: colors.text,
                fontFamily: typography.fontFamily?.primary,
                fontSize: responsive.titleSize + 1,
                marginLeft: 8,
              }
            ]}>
              Bank Account Details
            </Text>
          </View>

          <View style={styles.bankDetails}>
            <CopyableField
              label="Bank Name"
              value={bankDetails.bankName}
              icon={Building2}
            />
            <CopyableField
              label="Account Holder Name"
              value={bankDetails.accountName}
              icon={User}
            />
            <CopyableField
              label="Account Number"
              value={bankDetails.accountNumber}
              icon={Hash}
            />
            <CopyableField
              label="IFSC Code"
              value={bankDetails.ifscCode}
              icon={Hash}
            />
            <CopyableField
              label="Branch"
              value={bankDetails.branch}
              icon={Building2}
            />
          </View>
        </GlassContainer>
      )}

      {/* UPI Details */}
      {selectedMethod === 'upi' && (
        <GlassContainer style={[styles.detailsCard, { padding: responsive.cardPadding, marginBottom: responsive.spacing }]}>
          <View style={styles.cardHeader}>
            <CreditCard size={responsive.iconSize + 2} color={colors.primary} strokeWidth={1.5} />
            <Text style={[
              styles.cardTitle,
              {
                color: colors.text,
                fontFamily: typography.fontFamily?.primary,
                fontSize: responsive.titleSize + 1,
                marginLeft: 8,
              }
            ]}>
              UPI Payment Details
            </Text>
          </View>

          <View style={styles.upiDetails}>
            <CopyableField
              label="UPI ID"
              value={upiDetails.upiId}
              icon={CreditCard}
            />
            <CopyableField
              label="Merchant Code"
              value={upiDetails.merchantCode}
              icon={Hash}
            />
          </View>

          <View style={[styles.qrPlaceholder, { backgroundColor: colors.background + '20' }]}>
            <Text style={[
              styles.qrText,
              {
                color: colors.textSecondary,
                fontFamily: typography.fontFamily?.primary,
                fontSize: responsive.titleSize,
              }
            ]}>
              QR Code
            </Text>
            <Text style={[
              styles.qrSubtext,
              {
                color: colors.textSecondary,
                fontFamily: typography.fontFamily?.primary,
                fontSize: responsive.titleSize - 2,
              }
            ]}>
              Scan with any UPI app
            </Text>
          </View>
        </GlassContainer>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  detailsCard: {

  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontWeight: 'bold',
  },
  bankDetails: {
    gap: 12,
  },
  upiDetails: {
    gap: 12,
    marginBottom: 16,
  },
  qrPlaceholder: {
    height: 200,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderStyle: 'dashed',
  },
  qrText: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  qrSubtext: {
    opacity: 0.8,
  },
  copyableField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
  },
  fieldLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fieldInfo: {
    marginLeft: 8,
    flex: 1,
  },
  fieldLabel: {
    opacity: 0.8,
    marginBottom: 2,
  },
  fieldValue: {
    fontWeight: '600',
  },
  copyButton: {
    padding: 8,
    borderRadius: 6,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      },
    }),
  },
});

export default BankDepositDetails;