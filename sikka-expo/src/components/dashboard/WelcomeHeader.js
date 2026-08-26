import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import { useStore } from '../../store/useStore';
import { formatIndianCurrency } from '../../utils/formatIndianCurrency';

const WelcomeHeader = memo(() => {
  const { theme } = useTheme();
  const { user } = useStore();

  const formatBalance = (balance) => {
    return formatIndianCurrency(balance);
  };

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'column',
      gap: theme.spacing[4],
      marginBottom: theme.spacing[6],
    },
    headerContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      flexWrap: 'wrap',
      gap: theme.spacing[4],
    },
    welcomeSection: {
      flex: 1,
      minWidth: 200,
    },
    welcomeTitle: {
      fontSize: theme.typography.fontSize['3xl'],
      fontWeight: theme.typography.fontWeight.bold,
      fontFamily: theme.typography.fontFamily.primary,
      marginBottom: theme.spacing[2],
    },
    welcomeSubtitle: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily.primary,
      fontWeight: theme.typography.fontWeight.normal,
    },
    balanceSection: {
      alignItems: 'flex-end',
    },
    balanceToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      paddingVertical: theme.spacing[2],
      paddingHorizontal: theme.spacing[4],
      gap: theme.spacing[2],
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    toggleText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text,
      fontFamily: theme.typography.fontFamily.primary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    balanceContainer: {
      alignItems: 'center',
      marginTop: theme.spacing[4],
    },
    balanceLabel: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily.primary,
      marginBottom: theme.spacing[1],
    },
    balanceAmount: {
      fontSize: theme.typography.fontSize['2xl'],
      fontWeight: theme.typography.fontWeight.bold,
      fontFamily: theme.typography.fontFamily.primary,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.welcomeSection}>
          <Text style={[styles.welcomeTitle, { color: theme.colors.primary }]}>
            Welcome back, {user.name.split(' ')[0]}! 👋
          </Text>
          <Text style={styles.welcomeSubtitle}>
            Here's what's happening with your crypto portfolio today.
          </Text>
        </View>
      </View>

      <View style={styles.balanceContainer}>
        <Text style={styles.balanceLabel}>Total Balance</Text>
        <Text style={[styles.balanceAmount, { color: theme.colors.text }]}>
          {formatBalance(user.totalBalance)}
        </Text>
      </View>
    </View>
  );
});

WelcomeHeader.displayName = 'WelcomeHeader';

export default WelcomeHeader;