import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { BarChart3, Coins, Clock, Plus, Send } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useBreakpoints } from '../../hooks/useBreakpoints';

/**
 * WalletTabs Component
 *
 * 5-tab navigation system for wallet interface:
 * - Overview: Portfolio summary and P&L
 * - Assets: Detailed crypto holdings
 * - Transactions: Transaction history
 * - Deposit INR: Bank deposit interface
 * - Withdraw INR: Withdrawal interface
 *
 * Note: Transfer tab removed as MAIN ↔ TRADE account transfers
 * are handled automatically during deposits and withdrawals
 *
 * Features responsive design and proper tab indicators
 */
const WalletTabs = ({ activeTab, onTabChange }) => {
  const { colors, typography } = useTheme();
  const { isMobile, isTablet } = useBreakpoints();

  // Tab configuration with icons and labels
  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      icon: BarChart3,
      shortLabel: 'Overview'
    },
    {
      id: 'assets',
      label: 'Assets',
      icon: Coins,
      shortLabel: 'Assets'
    },
    {
      id: 'transactions',
      label: 'Transactions',
      icon: Clock,
      shortLabel: isMobile ? 'Txns' : 'Transactions'
    },
    {
      id: 'deposit',
      label: 'Deposit INR',
      icon: Plus,
      shortLabel: isMobile ? 'Deposit' : 'Deposit INR'
    },
    {
      id: 'withdraw',
      label: 'Withdraw INR',
      icon: Send,
      shortLabel: isMobile ? 'Withdraw' : 'Withdraw INR'
    }
  ];

  // Responsive styling based on screen size
  const getResponsiveStyles = () => {
    if (isMobile) {
      return {
        fontSize: 13,
        iconSize: 16,
        padding: 8,
        minWidth: 0,
        spacing: 4,
      };
    } else if (isTablet) {
      return {
        fontSize: 14,
        iconSize: 18,
        padding: 12,
        minWidth: 100,
        spacing: 6,
      };
    } else {
      return {
        fontSize: 15,
        iconSize: 20,
        padding: 16,
        minWidth: 120,
        spacing: 8,
      };
    }
  };

  const responsive = getResponsiveStyles();

  const TabButton = ({ tab, isActive }) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        {
          backgroundColor: isActive ? colors.primary + '20' : 'transparent',
          borderBottomWidth: isActive ? 2 : 0,
          borderBottomColor: colors.primary,
          paddingHorizontal: responsive.padding,
          paddingVertical: responsive.padding * 0.75,
          minWidth: responsive.minWidth,
        }
      ]}
      onPress={() => onTabChange(tab.id)}
      activeOpacity={0.7}
    >
      <View style={[styles.tabContent, { gap: responsive.spacing }]}>
        <tab.icon
          size={responsive.iconSize}
          color={isActive ? colors.primary : colors.textSecondary}
          strokeWidth={isActive ? 2 : 1.5}
        />
        <Text
          style={[
            styles.tabText,
            {
              color: isActive ? colors.primary : colors.textSecondary,
              fontFamily: typography.fontFamily?.primary,
              fontSize: responsive.fontSize,
              fontWeight: isActive ? '600' : '500',
            }
          ]}
          numberOfLines={1}
        >
          {tab.shortLabel}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
        bounces={false}
        scrollsToTop={false}
        nestedScrollEnabled={true}
      >
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            isActive={activeTab === tab.id}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tabButton: {
    marginRight: 4,
    borderRadius: 8,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      },
    }),
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    textAlign: 'center',
  },
});

export default WalletTabs;