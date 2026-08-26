import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useSegments } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../theme/ThemeProvider';
import Layout from '../Layout';
import { seedTestUser } from '../../utils/seedTestUser';
import { firebaseAuth } from '../../services/firebaseAuth';
import { auth } from '../../config/firebase';

/**
 * Authentication wrapper component
 * Handles authentication state and routing logic
 */
const AuthWrapper = ({ children }) => {
  const { isAuthenticated, isLoading, checkAuthStatus } = useAuth();
  const { colors } = useTheme();
  const segments = useSegments();
  const [isInitializing, setIsInitializing] = useState(true);

  // Check authentication status on app start
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('🚀 AuthWrapper: Initializing authentication...');
      try {
        // Seed test user for development
        console.log('🌱 AuthWrapper: Seeding test user...');
        await seedTestUser();
        
        const result = await checkAuthStatus();
        console.log('🚀 AuthWrapper: Auth check result:', result);
      } catch (error) {
        console.log('❌ AuthWrapper: Error checking auth status:', error);
      } finally {
        console.log('🚀 AuthWrapper: Authentication initialization complete');
        setIsInitializing(false);
      }
    };

    initializeAuth();
  }, []);

  // Set up Firebase auth state listener to handle token expiration
  useEffect(() => {
    console.log('🔥 AuthWrapper: Setting up Firebase auth state listener...');
    
    const unsubscribe = firebaseAuth.onAuthStateChanged((authState) => {
      console.log('🔥 AuthWrapper: Firebase auth state changed:', authState);
      
      if (!authState.isAuthenticated && isAuthenticated && !isInitializing) {
        console.warn('🚨 AuthWrapper: Firebase detected user signed out, updating app state...');
        // Firebase detected sign out (possibly due to token expiration)
        // The useStore should already be updated by the firebaseAuth listener,
        // but we can force a re-check if needed
      }
    });

    return () => {
      console.log('🔥 AuthWrapper: Cleaning up Firebase auth listener');
      unsubscribe();
    };
  }, [isAuthenticated, isInitializing]);

  // Handle authentication routing
  useEffect(() => {
    if (isInitializing || isLoading) {
      console.log('⏳ AuthWrapper: Still initializing or loading, skipping navigation');
      return; // Don't navigate while initializing or during auth operations
    }

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';
    const isEmptySegments = segments.length === 0;

    console.log('🧭 AuthWrapper: Navigation check -', {
      isAuthenticated,
      segments,
      inAuthGroup,
      inTabsGroup,
      isEmptySegments
    });

    // Ignore empty segments - this happens during internal navigations/transitions
    if (isEmptySegments) {
      console.log('⏳ AuthWrapper: Empty segments detected, skipping navigation (likely internal transition)');
      return;
    }

    if (!isAuthenticated && !inAuthGroup) {
      // User is not authenticated and not in auth screens, redirect to login
      console.log('🔄 AuthWrapper: Redirecting to login - user not authenticated');
      router.replace('/login');
    } else if (isAuthenticated && inAuthGroup) {
      // User is authenticated but in auth screens
      // Check if email-authenticated user needs to verify phone
      const currentUser = auth.currentUser;
      const hasPhone = currentUser?.phoneNumber;
      const isEmailProvider = currentUser?.providerData?.some(p => p.providerId === 'password');

      console.log('🔍 AuthWrapper: Checking phone verification:', {
        hasPhone,
        isEmailProvider,
        providersData: currentUser?.providerData?.map(p => p.providerId),
      });

      // If user logged in with email but has no phone, force phone verification
      // But skip if already on verify-phone-link screen
      if (isEmailProvider && !hasPhone && segments[1] !== 'verify-phone-link' && segments[1] !== 'onboarding-profile') {
        console.log('🔄 AuthWrapper: Email user missing phone - redirecting to phone verification');
        router.replace('/(auth)/verify-phone-link');
      } else {
        // User has both email and phone (or just phone) - proceed to dashboard
        console.log('🔄 AuthWrapper: Redirecting to main app - user authenticated');
        router.replace('/(tabs)');
      }
    } else {
      console.log('✅ AuthWrapper: No navigation needed');
    }
  }, [isAuthenticated, segments, isInitializing, isLoading]);

  // Show loading spinner while initializing or during auth checks
  if (isInitializing || isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Show auth screens without Layout wrapper
  if (!isAuthenticated) {
    return children;
  }

  // Show main app with Layout wrapper
  return (
    <Layout>
      {children}
    </Layout>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AuthWrapper;