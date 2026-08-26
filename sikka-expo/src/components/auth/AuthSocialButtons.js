import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Phone } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { router } from 'expo-router';
import { useStore } from '../../store/useStore';
import { firebaseAuth } from '../../services/firebaseAuth';
import { backendApi } from '../../services/backendApi';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Social authentication buttons component
 * Provides Phone OTP and Google Sign-In options
 */
const AuthSocialButtons = ({ onSuccess, showPhoneButton = true, showGoogleButton = true }) => {
  const { colors, typography } = useTheme();
  const [loading, setLoading] = useState(false);
  const setRecaptchaVerifier = useStore((state) => state.setRecaptchaVerifier);
  const setPhoneConfirmation = useStore((state) => state.setPhoneConfirmation);

  /**
   * Handle Phone Sign-In button press
   * Navigates to phone input screen
   */
  const handlePhoneSignIn = () => {
    console.log('📱 Phone Sign-In button pressed');
    router.push('/(auth)/phone-login');
  };

  /**
   * Handle Google Sign-In button press
   * Initiates Google OAuth popup flow
   */
  const handleGoogleSignIn = async () => {
    setLoading(true);

    try {
      console.log('🔐 Starting Google Sign-In...');

      // Sign in with Google via Firebase
      const result = await firebaseAuth.signInWithGoogle();
      console.log('✅ Google Sign-In successful:', result.user.email);

      // Register/login user in backend
      const backendResponse = await backendApi.registerUser({
        fullName: result.user.name || result.user.email?.split('@')[0] || 'User',
        phone: result.user.phone || '',
      });

      console.log('✅ Backend registration successful');

      // Store auth token
      await AsyncStorage.setItem('auth_token', result.token);

      // Check if user needs to complete profile (missing phone)
      if (!backendResponse.user.phone) {
        console.log('ℹ️ User needs to complete profile - navigating to onboarding');
        router.replace('/(auth)/onboarding-profile');
      } else {
        console.log('✅ User profile complete - navigating to dashboard');
        onSuccess?.(result.user);
      }
    } catch (error) {
      console.error('❌ Google Sign-In failed:', error.message);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!showPhoneButton && !showGoogleButton) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.dividerContainer}>
        <View style={[styles.dividerLine, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]} />
        <Text style={[
          styles.dividerText,
          {
            color: '#9ca3af',
            fontFamily: typography.fontFamily?.primary,
          }
        ]}>
          Or continue with
        </Text>
        <View style={[styles.dividerLine, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]} />
      </View>

      <View style={styles.buttonsContainer}>
        {showPhoneButton && (
          <TouchableOpacity
            style={[
              styles.socialButton,
              {
                backgroundColor: 'rgba(84, 194, 85, 0.1)',
                borderColor: 'rgba(84, 194, 85, 0.3)',
              }
            ]}
            onPress={handlePhoneSignIn}
            activeOpacity={0.7}
            disabled={loading}
          >
            <Phone size={20} color="#54c255" />
            <Text style={[
              styles.socialButtonText,
              {
                color: '#54c255',
                fontFamily: typography.fontFamily?.primary,
              }
            ]}>
              Phone Number
            </Text>
          </TouchableOpacity>
        )}

        {showGoogleButton && Platform.OS === 'web' && (
          <TouchableOpacity
            style={[
              styles.socialButton,
              {
                backgroundColor: 'rgba(234, 67, 53, 0.1)',
                borderColor: 'rgba(234, 67, 53, 0.3)',
              }
            ]}
            onPress={handleGoogleSignIn}
            activeOpacity={0.7}
            disabled={loading}
          >
            <View style={styles.googleIcon}>
              <Text style={styles.googleIconText}>G</Text>
            </View>
            <Text style={[
              styles.socialButtonText,
              {
                color: '#ea4335',
                fontFamily: typography.fontFamily?.primary,
              }
            ]}>
              {loading ? 'Signing in...' : 'Google'}
            </Text>
          </TouchableOpacity>
        )}

        {showGoogleButton && Platform.OS !== 'web' && (
          <View style={styles.mobileNotice}>
            <Text style={[
              styles.mobileNoticeText,
              {
                color: '#9ca3af',
                fontFamily: typography.fontFamily?.primary,
              }
            ]}>
              Google Sign-In is available on web only
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 24,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 14,
    marginHorizontal: 12,
  },
  buttonsContainer: {
    gap: 12,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  socialButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  googleIcon: {
    width: 20,
    height: 20,
    backgroundColor: '#ea4335',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  mobileNotice: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
  },
  mobileNoticeText: {
    fontSize: 12,
    textAlign: 'center',
  },
});

export default AuthSocialButtons;
