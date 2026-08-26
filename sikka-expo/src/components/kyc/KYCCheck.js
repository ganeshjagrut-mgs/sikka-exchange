import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Shield, AlertTriangle } from 'lucide-react-native';

/**
 * KYCCheck Component
 *
 * Simple component to check and display KYC verification status
 * Used for quick status checks in headers, cards, and other UI elements
 *
 * @param {Object} props
 * @param {string} props.status - KYC status ('not_submitted', 'pending', 'approved', 'rejected')
 * @param {boolean} props.compact - Whether to show compact version
 * @param {Object} props.style - Additional styles
 * @param {Function} props.onPress - Click handler
 */
const KYCCheck = ({ status = 'not_submitted', compact = false, style, onPress }) => {
  const { colors } = useTheme();

  // Get status display information
  const getStatusDisplay = () => {
    switch (status) {
      case 'pending':
        return {
          icon: AlertTriangle,
          text: 'KYC Pending',
          color: '#f59e0b',
          bgColor: '#f59e0b20',
        };

      case 'approved':
        return {
          icon: Shield,
          text: 'KYC Verified',
          color: '#10b981',
          bgColor: '#10b98120',
        };

      case 'rejected':
        return {
          icon: AlertTriangle,
          text: 'KYC Failed',
          color: '#ef4444',
          bgColor: '#ef444420',
        };

      case 'not_submitted':
      default:
        return {
          icon: AlertTriangle,
          text: 'KYC Required',
          color: colors.textSecondary,
          bgColor: colors.surfaceVariant,
        };
    }
  };

  const statusDisplay = getStatusDisplay();
  const StatusIcon = statusDisplay.icon;

  const badgeContent = (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: statusDisplay.bgColor,
          paddingHorizontal: compact ? 8 : 12,
          paddingVertical: compact ? 4 : 6,
        },
        style,
      ]}
    >
      <StatusIcon
        size={compact ? 14 : 16}
        color={statusDisplay.color}
        style={styles.icon}
      />
      <Text
        style={[
          styles.badgeText,
          {
            color: statusDisplay.color,
            fontSize: compact ? 11 : 13,
            fontWeight: compact ? '600' : '700',
          },
        ]}
      >
        {statusDisplay.text}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <View onTouchEnd={onPress} style={styles.pressable}>
        {badgeContent}
      </View>
    );
  }

  return badgeContent;
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 6,
  },
  badgeText: {
    fontWeight: '700',
  },
  pressable: {
    borderRadius: 20,
  },
});

export default KYCCheck;
