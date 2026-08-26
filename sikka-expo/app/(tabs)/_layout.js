import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Home, TrendingUp, Wallet, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useBreakpoints } from '../../src/hooks/useBreakpoints';
import useKYCStore from '../../src/store/kycStore';
import API_CONFIG from '../../src/config/api';

export default function TabLayout() {
  const { colors, isDark } = useTheme();
  const { isDesktop } = useBreakpoints();
  const { kycStatus, loading, hasLoadedOnce, fetchKYCStatus } = useKYCStore();
  const insets = useSafeAreaInsets();

  // Fetch KYC status on mount - only once
  useEffect(() => {
    // Warm HTTP connection to backend (reduces first API call latency)
    const warmConnection = async () => {
      try {
        // Lightweight ping to establish TCP connection
        await fetch(API_CONFIG.API_BASE_URL, {
          method: 'HEAD',
          // Short timeout - this is just for connection warming
          signal: AbortSignal.timeout(3000)
        });
      } catch (error) {
        // Ignore errors - this is just for connection warming
        console.log('Connection warming completed (may have timed out, which is fine)');
      }
    };

    if (!hasLoadedOnce && !loading) {
      // Start connection warming and KYC fetch in parallel
      warmConnection();
      fetchKYCStatus();
    }
    // CRITICAL: Only run once on mount, don't depend on functions
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check if user can trade (KYC approved)
  // BEFORE first load: Optimistically show Trading, hide KYC (prevents flicker for approved users)
  // AFTER first load: Use actual KYC status (backend returns status: 'approved', not canTrade)
  const canTrade = !hasLoadedOnce ? true : (kycStatus?.status === 'approved');

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Hide tabBar on desktop, show clean anchored bar on mobile/tablet
        tabBarStyle: isDesktop ? {
          display: 'none',
        } : {
          // Tab bar anchored to actual bottom with safe area
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 60 + insets.bottom, // Base height + safe area bottom

          // Modern clean styling with subtle transparency
          backgroundColor: isDark ? 'rgba(24, 26, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          borderTopWidth: 1,
          borderTopColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',

          // Elegant shadow
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowRadius: 12,
          elevation: 16,

          // Padding with safe area inset for bottom
          paddingBottom: insets.bottom || 8, // Use actual safe area or fallback
          paddingTop: 12,
          paddingHorizontal: 16,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
        // Smooth animations
        animation: 'shift',
        animationDuration: 200,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size, focused }) => (
            <Home
              size={size || 24}
              color={color}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="trading"
        options={{
          title: 'Trading',
          tabBarIcon: ({ color, size, focused }) => (
            <TrendingUp
              size={size || 24}
              color={color}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
          // Always show trading tab - actions blocked at trade execution
          href: '/(tabs)/trading',
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color, size, focused }) => (
            <Wallet
              size={size || 24}
              color={color}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <User
              size={size || 24}
              color={color}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      {/* Hide KYC screens from tab bar but keep accessible via routing */}
      <Tabs.Screen
        name="kyc"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="kyc-status"
        options={{
          href: null, // Hide from tab bar
        }}
      />
    </Tabs>
  );
}