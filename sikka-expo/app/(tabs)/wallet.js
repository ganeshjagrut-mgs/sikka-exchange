import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useBreakpoints } from '../../src/hooks/useBreakpoints';
import {
  WalletHeader,
  WalletTabs,
  WalletOverview,
  WalletAssets,
  WalletTransactions,
  DepositINR,
  WithdrawINR,
} from '../../src/components/wallet';
import { useLocalSearchParams } from 'expo-router';
import useWalletStore from '../../src/store/walletStore';

/**
 * WalletScreen Component
 * 
 * Complete wallet management interface for Sikka Exchange
 * Features:
 * - 5-tab navigation system (Overview, Assets, Transactions, Deposit, Withdraw)
 * - Balance display with visibility toggle
 * - Portfolio overview and P&L tracking
 * - Detailed asset holdings with performance metrics
 * - Complete transaction history with filtering
 * - INR deposit interface with bank details
 * - INR withdrawal form with validation
 * - Responsive design for mobile, tablet, and desktop
 * - Professional "Sikka Exchange" branding
 * - Glass morphism design consistency
 */
export default function WalletScreen() {
  const { colors } = useTheme();
  const { isMobile } = useBreakpoints();
  const [activeTab, setActiveTab] = useState('assets');
  const [isInitialized, setIsInitialized] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const params = useLocalSearchParams();
  const { fetchBalance, fetchHoldings } = useWalletStore();

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchBalance(),
        fetchHoldings(),
      ]);
    } catch (error) {
      console.error('Error refreshing wallet data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Initialize after a small delay to prevent blank screen on first navigation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const requestedTabParam = Array.isArray(params.tab) ? params.tab[0] : params.tab;
    const requestedTab = typeof requestedTabParam === 'string' ? requestedTabParam.toLowerCase() : null;

    const validTabs = new Set(['overview', 'assets', 'transactions', 'deposit', 'withdraw']);
    if (requestedTab && validTabs.has(requestedTab) && requestedTab !== activeTab) {
      setActiveTab(requestedTab);
    }
  }, [params.tab]);

  // Responsive styling based on screen size
  const getResponsiveStyles = () => {
    if (isMobile) {
      return {
        padding: 16,
        spacing: 12,
      };
    } else {
      return {
        padding: 20,
        spacing: 16,
      };
    }
  };

  const responsive = getResponsiveStyles();

  // Show loading indicator while initializing to prevent blank screen
  if (!isInitialized) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary || '#54c255'} />
      </View>
    );
  }

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <WalletOverview />;
      case 'assets':
        return <WalletAssets />;
      case 'transactions':
        return <WalletTransactions />;
      case 'deposit':
        return <DepositINR />;
      case 'withdraw':
        return <WithdrawINR />;
      default:
        return <WalletOverview />;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 100, // Tab bar height (60) + buffer for bottom drawer clearance
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary || '#54c255'}
          />
        }
      >
        {/* Wallet Header - Balance and Quick Actions */}
        <WalletHeader onNavigateToTab={setActiveTab} />

        {/* Wallet Navigation Tabs */}
        <WalletTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Tab Content - Single scroll for entire page */}
        <View style={styles.tabContent}>
          {renderTabContent()}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  tabContent: {
    // Tab content no longer needs flex or minHeight - single scroll handles it
  },
});