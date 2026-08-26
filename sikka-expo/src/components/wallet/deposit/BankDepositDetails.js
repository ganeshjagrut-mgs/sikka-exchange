import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Copy, Building2, User, Hash } from 'lucide-react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import { useBreakpoints } from '../../../hooks/useBreakpoints';
import GlassContainer from '../../ui/GlassContainer';

/**
 * BankDepositDetails Component
 *
 * Displays bank account details for manual bank transfers
 */
const BankDepositDetails = ({ bankDetails }) => {
  const { colors, typography } = useTheme();
  const { isMobile, isTablet } = useBreakpoints();

  // Responsive styling
  const getResponsiveStyles = () => {
    if (isMobile) {
      return {
        cardPadding: 16,
        titleSize: 16,
        iconSize: 20,
        spacing: 12,
      };
    } else if (isTablet) {
      return {
        cardPadding: 18,
        titleSize: 17,
        iconSize: 22,
        spacing: 16,
      };
    } else {
      return {
        cardPadding: 20,
        titleSize: 18,
        iconSize: 24,
        spacing: 20,
      };
    }
  };

  const responsive = getResponsiveStyles();

  // Copy text to clipboard
  const copyToClipboard = (text, label) => {
    if (Platform.OS === 'web') {
      navigator.clipboard.writeText(text).then(() => {
        // Could show a toast notification here
        console.log(`${label} copied to clipboard`);
      });
    } else {
      // React Native clipboard functionality would go here
      console.log(`${label} copied to clipboard`);
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
  );
};

const styles = StyleSheet.create({
  detailsCard: {},
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