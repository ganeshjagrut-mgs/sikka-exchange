import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useStore } from '../../src/store/useStore';
import { firebaseAuth } from '../../src/services/firebaseAuth';
import { backendApi } from '../../src/services/backendApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthContainer from '../../src/components/auth/AuthContainer';
import AuthHeader from '../../src/components/auth/AuthHeader';
import Button from '../../src/components/ui/Button';
import ValidationError from '../../src/components/auth/ValidationError';

/**
 * OTP verification screen - user enters 6-digit code received via SMS
 * Handles both login and signup flows
 */
export default function VerifyOTPScreen() {
  const { colors, typography } = useTheme();
  const { phoneNumber, isSignup, isLogin } = useLocalSearchParams();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const phoneConfirmation = useStore((state) => state.phoneConfirmation);
  const signupWithPhone = useStore((state) => state.signupWithPhone);

  // Redirect back if no confirmation result
  useEffect(() => {
    if (!phoneConfirmation) {
      console.warn('⚠️ No confirmation result, redirecting to login');
      router.replace('/(auth)/login');
    }
  }, [phoneConfirmation]);

  /**
   * Handle OTP verification
   */
  const handleVerifyOTP = async () => {
    setError('');

    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    if (!phoneConfirmation) {
      setError('Verification session expired. Please request a new code.');
      router.replace('/(auth)/login');
      return;
    }

    setLoading(true);

    try {
      console.log('🔑 Verifying OTP...');

      // For signup flow, always go to onboarding to collect email + name
      if (isSignup === 'true') {
        console.log('📱 Processing signup flow...');

        // Verify OTP with Firebase
        const result = await firebaseAuth.verifyPhoneOTP(phoneConfirmation, otp);
        const user = result.user;
        const token = result.token;

        console.log('✅ OTP verified for signup:', user.id);

        // Store auth token
        await AsyncStorage.setItem('auth_token', token);

        // Navigate to onboarding to collect email and name
        console.log('📝 Navigating to onboarding to collect email and name');
        router.replace({
          pathname: '/(auth)/onboarding-profile',
          params: { phoneNumber: phoneNumber, isNewUser: 'true' }
        });
      } else {
        // Login flow - verify and check if user has complete profile
        console.log('📱 Processing login flow...');

        // Verify OTP with Firebase
        const result = await firebaseAuth.verifyPhoneOTP(phoneConfirmation, otp);
        const user = result.user;
        const token = result.token;

        console.log('✅ OTP verified for login:', user.id);

        // Store auth token
        await AsyncStorage.setItem('auth_token', token);

        // Try to login with backend
        try {
          console.log('📝 Verifying with backend...');
          const backendResponse = await backendApi.login();
          const backendUser = backendResponse.data || backendResponse.user || backendResponse;

          console.log('✅ Backend login successful:', backendUser);

          // Check if user needs to complete profile (missing name/email)
          if (!backendUser.full_name || !backendUser.email) {
            console.log('📝 User needs to complete profile - navigating to onboarding');
            router.replace({
              pathname: '/(auth)/onboarding-profile',
              params: { phoneNumber: phoneNumber }
            });
          } else {
            console.log('✅ User profile complete - navigating to dashboard');
            router.replace('/(tabs)');
          }
        } catch (backendError) {
          console.error('⚠️ Backend login failed:', backendError.message);

          // User might not exist in backend yet - go to onboarding
          console.log('📝 Redirecting to onboarding');
          router.replace({
            pathname: '/(auth)/onboarding-profile',
            params: { phoneNumber: phoneNumber }
          });
        }
      }
    } catch (err) {
      console.error('❌ OTP verification failed:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle resend OTP
   */
  const handleResendOTP = () => {
    console.log('📱 Resending OTP...');
    // Navigate back to phone login screen
    router.back();
  };

  /**
   * Format OTP input (only digits)
   */
  const formatOTPInput = (text) => {
    const cleaned = text.replace(/\D/g, '');
    const limited = cleaned.substring(0, 6);
    setOtp(limited);
  };

  const isOTPValid = otp.length === 6;

  return (
    <AuthContainer scrollable={true}>
      <View style={styles.content}>
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color="#54c255" />
          <Text style={[
            styles.backButtonText,
            {
              color: '#54c255',
              fontFamily: typography.fontFamily?.primary,
            }
          ]}>
            Change Number
          </Text>
        </TouchableOpacity>

        {/* Header */}
        <AuthHeader
          title="Enter Verification Code"
          subtitle={`We've sent a 6-digit code to ${phoneNumber}`}
        />

        {/* OTP Input */}
        <View style={styles.formContainer}>
          <TextInput
            value={otp}
            onChangeText={formatOTPInput}
            placeholder="000000"
            placeholderTextColor="#6b7280"
            keyboardType="number-pad"
            maxLength={6}
            style={[
              styles.otpInput,
              {
                color: '#FFFFFF',
                fontFamily: typography.fontFamily?.primary,
                borderColor: isOTPValid ? '#54c255' : 'rgba(255, 255, 255, 0.2)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
              }
            ]}
            autoFocus
          />

          {/* Error Display */}
          <ValidationError error={error} />

          {/* Verify Button */}
          <TouchableOpacity
            onPress={handleVerifyOTP}
            disabled={!isOTPValid || loading}
            style={[
              styles.verifyButton,
              {
                backgroundColor: !isOTPValid || loading ? '#4B5563' : '#54c255',
              }
            ]}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[
                styles.verifyButtonText,
                {
                  color: '#FFFFFF',
                  fontFamily: typography.fontFamily?.primary,
                }
              ]}>
                Verify & Continue
              </Text>
            )}
          </TouchableOpacity>

          {/* Resend OTP Link */}
          <View style={styles.resendContainer}>
            <Text style={[
              styles.resendPromptText,
              {
                color: '#9ca3af',
                fontFamily: typography.fontFamily?.primary,
              }
            ]}>
              Didn't receive the code?{' '}
            </Text>
            <TouchableOpacity
              onPress={handleResendOTP}
              activeOpacity={0.7}
              disabled={loading}
            >
              <Text style={[
                styles.resendLinkText,
                {
                  color: '#54c255',
                  fontFamily: typography.fontFamily?.primary,
                }
              ]}>
                Resend
              </Text>
            </TouchableOpacity>
          </View>

          {/* Helper Text */}
          <Text style={[
            styles.helperText,
            {
              color: '#6b7280',
              fontFamily: typography.fontFamily?.primary,
            }
          ]}>
            Please check your SMS messages for the verification code
          </Text>
        </View>
      </View>
    </AuthContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 20,
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  formContainer: {
    width: '100%',
    marginTop: 8,
  },
  otpInput: {
    padding: 20,
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 12,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 24,
  },
  verifyButton: {
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  resendPromptText: {
    fontSize: 14,
  },
  resendLinkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});
