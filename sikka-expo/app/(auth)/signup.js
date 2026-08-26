import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { router, Link } from 'expo-router';
import { Phone, ArrowLeft } from 'lucide-react-native';

import AuthContainer from '../../src/components/auth/AuthContainer';
import AuthHeader from '../../src/components/auth/AuthHeader';
import Button from '../../src/components/ui/Button';
import ValidationError from '../../src/components/auth/ValidationError';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useStore } from '../../src/store/useStore';
import { firebaseAuth } from '../../src/services/firebaseAuth';


/**
 * Sign up screen - Phone-first signup flow
 * User enters phone → OTP verification → Onboarding profile (collect email + name)
 */
export default function SignUpScreen() {
  const { colors, typography } = useTheme();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const recaptchaVerifierRef = useRef(null);
  const recaptchaInitialized = useRef(false);
  const setPhoneConfirmation = useStore((state) => state.setPhoneConfirmation);

  // Initialize reCAPTCHA on mount (web only)
  // For mobile (Expo Go/EAS), we use FirebaseRecaptchaVerifierModal instead
  useEffect(() => {
    if (Platform.OS === 'web' && !recaptchaInitialized.current) {
      const timer = setTimeout(async () => {
        try {
          console.log('🔧 Initializing reCAPTCHA on signup screen (web)...');

          let container = document.getElementById('recaptcha-container-signup');
          if (!container) {
            container = document.createElement('div');
            container.id = 'recaptcha-container-signup';
            container.style.cssText = 'position: fixed; bottom: 0; left: 0; width: 1px; height: 1px; opacity: 0; overflow: hidden; z-index: -1;';
            document.body.appendChild(container);
          }

          const verifier = firebaseAuth.initializeRecaptcha('recaptcha-container-signup');
          await verifier.render();
          recaptchaVerifierRef.current = verifier;
          recaptchaInitialized.current = true;
          console.log('✅ reCAPTCHA initialized on signup screen (web)');
        } catch (error) {
          console.error('❌ reCAPTCHA initialization error:', error);
          setError('Verification setup failed. Please refresh the page.');
        }
      }, 500);

      return () => {
        clearTimeout(timer);
        if (recaptchaVerifierRef.current) {
          try {
            recaptchaVerifierRef.current.clear();
            recaptchaVerifierRef.current = null;
            recaptchaInitialized.current = false;
          } catch (e) {
            console.warn('⚠️ Error cleaning up reCAPTCHA:', e.message);
          }
        }
        const container = document.getElementById('recaptcha-container-signup');
        if (container && container.parentNode) {
          container.parentNode.removeChild(container);
        }
      };
    }
  }, []);

  // Validate phone number format
  const validatePhoneNumber = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return { valid: true, formatted: cleaned };
    }
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return { valid: true, formatted: cleaned.substring(2) };
    }
    return { valid: false, formatted: cleaned };
  };

  // Handle send OTP
  const handleSendOTP = async () => {
    setError('');
    const validation = validatePhoneNumber(phoneNumber);

    if (!validation.valid) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    // Check reCAPTCHA verifier is ready
    if (!recaptchaVerifierRef.current) {
      if (Platform.OS === 'web') {
        setError('Verification not ready. Please refresh and try again.');
      } else {
        setError('Verification not ready. Please try again.');
      }
      return;
    }

    setLoading(true);

    try {
      console.log('📱 Sending OTP for signup to:', validation.formatted);
      const confirmationResult = await firebaseAuth.sendPhoneOTP(
        `+91${validation.formatted}`,
        recaptchaVerifierRef.current
      );
      setPhoneConfirmation(confirmationResult);
      console.log('✅ OTP sent successfully for signup');

      // Navigate to OTP verification screen with signup flag
      router.push({
        pathname: '/(auth)/verify-otp',
        params: { phoneNumber: `+91${validation.formatted}`, isSignup: 'true' }
      });
    } catch (err) {
      console.error('❌ Send OTP failed:', err.message);
      setError(err.message);

      // Reset reCAPTCHA on error (web only)
      if (Platform.OS === 'web') {
        try {
          if (recaptchaVerifierRef.current) {
            recaptchaVerifierRef.current.clear();
            recaptchaVerifierRef.current = null;
          }
          const verifier = firebaseAuth.initializeRecaptcha('recaptcha-container-signup');
          await verifier.render();
          recaptchaVerifierRef.current = verifier;
        } catch (recaptchaErr) {
          console.error('❌ reCAPTCHA reset failed:', recaptchaErr);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneInput = (text) => {
    const cleaned = text.replace(/\D/g, '');
    const limited = cleaned.substring(0, 10);
    setPhoneNumber(limited);
  };

  const isPhoneValid = validatePhoneNumber(phoneNumber).valid;

  return (
    <AuthContainer scrollable={true} keyboardOffset={50} style={styles.container}>
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
            { color: '#54c255', fontFamily: typography.fontFamily?.primary }
          ]}>
            Back to Login
          </Text>
        </TouchableOpacity>

        {/* Header */}
        <AuthHeader
          title="Create Account"
          subtitle="Enter your mobile number to get started with Sikkaa Exchange"
        />

        {/* Phone Input */}
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <View style={styles.countryCodeContainer}>
              <Text style={[styles.countryCode, { color: '#FFFFFF', fontFamily: typography.fontFamily?.primary }]}>
                +91
              </Text>
            </View>

            <TextInput
              value={phoneNumber}
              onChangeText={formatPhoneInput}
              placeholder="9876543210"
              placeholderTextColor="#6b7280"
              keyboardType="phone-pad"
              maxLength={10}
              style={[
                styles.phoneInput,
                {
                  color: '#FFFFFF',
                  fontFamily: typography.fontFamily?.primary,
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                }
              ]}
              autoFocus
            />
          </View>

          <Text style={[styles.helperText, { color: '#9ca3af', fontFamily: typography.fontFamily?.primary }]}>
            We'll send a 6-digit verification code to this number
          </Text>

          <ValidationError error={error} />

          <Button
            variant="primary"
            size="large"
            onPress={handleSendOTP}
            loading={loading}
            disabled={!isPhoneValid || loading}
            style={styles.signupButton}
          >
            {loading ? 'Sending OTP...' : 'Send OTP'}
          </Button>

          {/* Terms notice */}
          <Text style={[styles.termsText, { color: '#6b7280', fontFamily: typography.fontFamily?.primary }]}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={[styles.loginPromptText, { color: '#9ca3af', fontFamily: typography.fontFamily?.primary }]}>
              Already have an account?{' '}
            </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={[styles.loginLinkText, { color: '#54c255', fontFamily: typography.fontFamily?.primary }]}>
                  Sign In
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>

        {/* Web Platform Notice */}
        {Platform.OS === 'web' && (
          <View style={styles.webNotice}>
            <Text style={[styles.webNoticeText, { color: '#60a5fa', fontFamily: typography.fontFamily?.primary }]}>
              Phone authentication works best on mobile devices.
            </Text>
          </View>
        )}
      </View>
    </AuthContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 600,
  },
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  countryCodeContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  helperText: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  signupButton: {
    marginBottom: 16,
  },
  termsText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginPromptText: {
    fontSize: 14,
  },
  loginLinkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  webNotice: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  webNoticeText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
