import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform, RefreshControl } from 'react-native';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useBreakpoints } from '../../src/hooks/useBreakpoints';
import {
  ProfileHeader,
  ProfileTabs,
  PersonalInfo,
  BankAccounts,
} from '../../src/components/profile';
import useBankAccountStore from '../../src/store/bankAccountStore';

/**
 * ProfileScreen Component
 *
 * Complete profile management interface for Sikka Exchange
 * Features:
 * - 2-tab navigation system (Personal, Banks)
 * - User profile header with stats and quick actions
 * - Personal information management with form validation and sign out
 * - Bank account management for withdrawals
 * - Responsive design for mobile, tablet, and desktop
 * - Professional "Sikka Exchange" branding
 * - Glass morphism design consistency
 */
export default function ProfileScreen() {
  const { colors } = useTheme();
  const { isMobile } = useBreakpoints();
  const [activeTab, setActiveTab] = useState('personal');
  const [refreshing, setRefreshing] = useState(false);
  const { fetchAccounts } = useBankAccountStore();

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchAccounts();
    } catch (error) {
      console.error('Error refreshing profile data:', error);
    } finally {
      setRefreshing(false);
    }
  };

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

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'personal':
        return <PersonalInfo />;
      case 'banks':
        return <BankAccounts />;
      default:
        return <PersonalInfo />;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            padding: responsive.padding,
            gap: responsive.spacing,
            paddingBottom: 100, // Tab bar height (60) + buffer for bottom drawer clearance
          }
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary || '#54c255'}
          />
        }
      >
        {/* Profile Header - User Info and Stats */}
        <ProfileHeader />

        {/* Profile Navigation Tabs */}
        <ProfileTabs 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
        />

        {/* Tab Content */}
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
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  tabContent: {
    flex: 1,
    minHeight: 400, // Ensure sufficient height for tab content
  },
});