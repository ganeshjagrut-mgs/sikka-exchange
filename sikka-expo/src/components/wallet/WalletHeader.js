import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator, Alert } from 'react-native';
import { Wallet, Plus, ArrowUpRight } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useStore } from '../../store/useStore';
import useWalletStore from '../../store/walletStore';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import GlassContainer from '../ui/GlassContainer';
import SendCrypto from './SendCrypto';

/**
 * WalletHeader Component
 *
 * Displays user's portfolio value with quick action for deposits
 * Features:
 * - Portfolio value display in INR (simplified)
 * - Responsive design for mobile/tablet/desktop
 * - Quick action button for deposits
 * - Professional "Sikka Exchange" branding
 *
 * Note: Transfer functionality removed as MAIN ↔ TRADE transfers are handled
 * automatically during deposits (Broker → Sub MAIN → Sub TRADE) and
 * withdrawals (Sub TRADE → Sub MAIN → Broker)
 */
const WalletHeader = ({ onNavigateToTab }) => {
  const { colors, typography } = useTheme();
  const { user } = useStore();
  const { balance, loading, error, fetchBalance } = useWalletStore();
  const { isMobile, isTablet } = useBreakpoints();
  const [showSendModal, setShowSendModal] = useState(false);

  // Fetch balance on component mount
  useEffect(() => {
    const loadBalance = async () => {
      try {
        await fetchBalance();
      } catch (error) {
        console.error('Failed to load balance:', error);
        Alert.alert('Error', 'Failed to load wallet balance. Please try again.');
      }
    };

    loadBalance();
  }, []);

  // Format USDT with 6 decimal places
  const formatUSDT = (amount) => {
    if (!amount && amount !== 0) return '$0.000000';
    return `$${parseFloat(amount).toFixed(6)}`;
  };

  // Format USD currency
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDecimalAmount = (amount) => {
    if (!amount && amount !== 0) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  /**
   * Calculate portfolio totals from balance API data
   *
   * Note: We use backend's pre-calculated totalValueUSD instead of recalculating
   * because backend already handles proper currency conversion with live prices.
   *
   * Previous bug: Was summing different currencies (BTC + USDT + USDC) as if they
   * were the same, which gave wrong results.
   *
   * Backend converts each currency separately using proper market prices before summing.
   * All values are now in USD (USDT ≈ USD for display purposes).
   */
  const calculateTotalBalance = () => {
    if (!balance) return { usdt: 0, usd: 0, available: 0, locked: 0 };

    // Backend returns: { main: {...}, trade: {...}, balances: [...], totalValueUSD: number }
    const tradeBalances = balance.trade?.balances || balance.balances || [];
    const mainBalances = balance.main?.balances || [];

    // Use pre-calculated total from backend (correctly converts each currency)
    const totalUSD = parseFloat(balance.totalValueUSD || balance.trade?.totalValueUSD || 0);

    // Combine MAIN and TRADE account balances
    const allBalances = [...mainBalances, ...tradeBalances];

    // Find USDT balance from the combined balances for reference display
    const usdtItem = allBalances.find(b => b.currency === 'USDT');
    const usdtBalance = parseFloat(usdtItem?.balance || usdtItem?.available || 0);

    // Available = funds not locked for withdrawals (backend calculates available.usd)
    // Prioritize available.usd which excludes locked funds
    const availableInUSD = parseFloat(balance.available?.usd || balance.trade?.totalValueUSD || 0);

    // Locked = funds locked for pending withdrawals (from backend's locked_balance_usdt)
    // Note: This is different from KuCoin's "holds" which are for open orders
    const lockedInUSD = parseFloat(balance.locked?.usd || 0);

    return {
      usdt: usdtBalance,
      usd: totalUSD,
      available: availableInUSD, // Fixed: Use backend's totalValueUSD
      locked: lockedInUSD,
      rawBalances: allBalances,
      mainBalances,
      tradeBalances
    };
  };

  const totalBalance = calculateTotalBalance();
  const availableBalance = totalBalance.available; // Show available USD as primary balance
  const usdtBalance = totalBalance.usdt; // USDT balance for reference
  const lockedBalance = totalBalance.locked; // Locked balance in USD
  const totalUSD = totalBalance.usd; // Total portfolio value in USD

  // Responsive styling based on screen size
  const getResponsiveStyles = () => {
    if (isMobile) {
      return {
        container: { padding: 16 },
        titleSize: 20,
        balanceSize: 32,
        spacing: 12,
        buttonSize: 'small',
        iconSize: 18,
      };
    } else if (isTablet) {
      return {
        container: { padding: 20 },
        titleSize: 22,
        balanceSize: 36,
        spacing: 16,
        buttonSize: 'medium',
        iconSize: 20,
      };
    } else {
      return {
        container: { padding: 24 },
        titleSize: 24,
        balanceSize: 40,
        spacing: 20,
        buttonSize: 'large',
        iconSize: 22,
      };
    }
  };

  const responsive = getResponsiveStyles();

  const QuickActionButton = ({ icon: Icon, label, onPress, variant = 'primary' }) => (
    <TouchableOpacity
      style={[
        styles.quickActionButton,
        {
          backgroundColor: variant === 'primary' ? colors.primary : colors.background + '40',
          borderWidth: variant === 'secondary' ? 1 : 0,
          borderColor: colors.border,
          paddingHorizontal: responsive.buttonSize === 'small' ? 12 : 16,
          paddingVertical: responsive.buttonSize === 'small' ? 8 : 10,
        }
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Icon 
        size={responsive.iconSize} 
        color={variant === 'primary' ? '#ffffff' : colors.primary} 
        strokeWidth={1.8}
      />
      <Text style={[
        styles.quickActionText,
        {
          color: variant === 'primary' ? '#ffffff' : colors.primary,
          fontSize: responsive.buttonSize === 'small' ? 13 : 14,
          fontFamily: typography.fontFamily?.primary,
          marginLeft: 6,
        }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <GlassContainer style={[styles.container, responsive.container]}>
      {/* Header with Wallet Icon and Title */}
      <View style={styles.headerRow}>
        <View style={styles.titleSection}>
          <Wallet size={responsive.iconSize + 4} color={colors.primary} strokeWidth={1.5} />
          <Text style={[
            styles.title,
            {
              color: colors.text,
              fontFamily: typography.fontFamily?.primary,
              fontSize: responsive.titleSize,
              marginLeft: 8,
            }
          ]}>
            My Wallet
          </Text>
        </View>
      </View>

      {/* Total Balance Display - INR Primary */}
      <View style={[styles.balanceSection, { marginTop: responsive.spacing }]}>
        <Text style={[
          styles.balanceLabel,
          {
            color: colors.textSecondary,
            fontFamily: typography.fontFamily?.primary,
            fontSize: responsive.titleSize - 6,
          }
        ]}>
          Portfolio Value (USD)
        </Text>

        {loading && !balance ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 8 }} />
        ) : error ? (
          <Text style={[
            styles.errorText,
            {
              color: colors.error,
              fontFamily: typography.fontFamily?.primary,
              fontSize: responsive.titleSize - 4,
            }
          ]}>
            {error}
          </Text>
        ) : (
          <>
            <Text style={[
              styles.totalBalance,
              {
                color: colors.text,
                fontFamily: typography.fontFamily?.bold || typography.fontFamily?.primary,
                fontSize: responsive.balanceSize,
              }
            ]}>
              {formatDecimalAmount(totalUSD)}
            </Text>

            {/* Show locked balance if user has pending withdrawals */}
            {balance && balance.locked && parseFloat(balance.locked.usd) > 0 && (
              <Text style={[
                styles.lockedBalance,
                {
                  color: colors.warning,
                  fontFamily: typography.fontFamily?.primary,
                  fontSize: responsive.titleSize - 6,
                  marginTop: 4,
                }
              ]}>
                Locked: {formatDecimalAmount(balance.locked.usd)}
              </Text>
            )}
          </>
        )}
      </View>


      {/* Quick Actions */}
      <View style={[styles.quickActions, { marginTop: responsive.spacing + 4, justifyContent: 'center' }]}>
        <QuickActionButton
          icon={ArrowUpRight}
          label="Send"
          onPress={() => setShowSendModal(true)}
          variant="secondary"
        />
        <QuickActionButton
          icon={Plus}
          label="Add Money"
          onPress={() => onNavigateToTab && onNavigateToTab('deposit')}
          variant="primary"
        />
      </View>

      {/* Send Crypto Modal */}
      <SendCrypto
        visible={showSendModal}
        onClose={() => setShowSendModal(false)}
      />
    </GlassContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
  },
  visibilityToggle: {
    padding: 8,
    borderRadius: 8,
  },
  balanceSection: {
    alignItems: 'flex-start',
  },
  balanceLabel: {
    opacity: 0.8,
    marginBottom: 4,
  },
  totalBalance: {
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  lockedBalance: {
    opacity: 0.9,
  },
  secondaryBalance: {
    opacity: 0.7,
  },
  errorText: {
    fontWeight: '600',
    opacity: 0.9,
  },
  balanceBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  balanceItem: {
    flex: 1,
    marginRight: 16,
  },
  balanceItemLabel: {
    opacity: 0.8,
    marginBottom: 2,
  },
  balanceItemValue: {
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      },
    }),
  },
  quickActionText: {
    fontWeight: '600',
  },
});

export default WalletHeader;