import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { router, Link } from 'expo-router';
import { Phone, Mail } from 'lucide-react-native';
import AuthContainer from '../../src/components/auth/AuthContainer';
import AuthHeader from '../../src/components/auth/AuthHeader';
import LoginForm from '../../src/components/auth/LoginForm';
import Button from '../../src/components/ui/Button';
import ValidationError from '../../src/components/auth/ValidationError';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useStore } from '../../src/store/useStore';
import { firebaseAuth } from '../../src/services/firebaseAuth';

/**
 * Login screen with phone/email toggle
 * Phone is primary (default), email is secondary for legacy users
 */
export default function LoginScreen() {
  const { colors, typography } = useTheme();
  const [loginMode, setLoginMode] = useState('phone'); // 'phone' | 'email'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const recaptchaVerifierRef = useRef(null);
  const recaptchaInitialized = useRef(false);
  const setPhoneConfirmation = useStore((state) => state.setPhoneConfirmation);

  // Initialize reCAPTCHA on mount (web only)
  // For mobile (Expo Go/EAS), we use FirebaseRecaptchaVerifierModal instead
  useEffect(() => {
    if (Platform.OS === 'web' && loginMode === 'phone' && !recaptchaInitialized.current) {
      const timer = setTimeout(async () => {
        try {
          console.log('🔧 Initializing reCAPTCHA on login screen (web)...');

          let container = document.getElementById('recaptcha-container-login');
          if (!container) {
            container = document.createElement('div');
            container.id = 'recaptcha-container-login';
            container.style.cssText = 'position: fixed; bottom: 0; left: 0; width: 1px; height: 1px; opacity: 0; overflow: hidden; z-index: -1;';
            document.body.appendChild(container);
          }

          const verifier = firebaseAuth.initializeRecaptcha('recaptcha-container-login');
          await verifier.render();
          recaptchaVerifierRef.current = verifier;
          recaptchaInitialized.current = true;
          console.log('✅ reCAPTCHA initialized on login screen');
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
        const container = document.getElementById('recaptcha-container-login');
        if (container && container.parentNode) {
          container.parentNode.removeChild(container);
        }
      };
    }
  }, [loginMode]);

  const handleLoginSuccess = async (user) => {
    console.log('Login successful:', user);
    // AuthWrapper will handle navigation
  };

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
      console.log('📱 Sending OTP to:', validation.formatted);
      const confirmationResult = await firebaseAuth.sendPhoneOTP(
        `+91${validation.formatted}`,
        recaptchaVerifierRef.current
      );
      setPhoneConfirmation(confirmationResult);
      console.log('✅ OTP sent successfully');

      // Navigate to OTP verification screen
      router.push({
        pathname: '/(auth)/verify-otp',
        params: { phoneNumber: `+91${validation.formatted}`, isLogin: 'true' }
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
          const verifier = firebaseAuth.initializeRecaptcha('recaptcha-container-login');
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
    <AuthContainer scrollable={true}>
        <View style={styles.content}>
          {/* Header */}
        <AuthHeader
          title="Welcome Back"
          subtitle="Sign in to your Sikkaa Exchange account"
        />

        {/* Login Mode Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              loginMode === 'phone' && styles.tabActive,
              { borderColor: loginMode === 'phone' ? '#54c255' : 'rgba(255,255,255,0.2)' }
            ]}
            onPress={() => setLoginMode('phone')}
            activeOpacity={0.7}
          >
            <Phone size={18} color={loginMode === 'phone' ? '#54c255' : '#9ca3af'} />
            <Text style={[
              styles.tabText,
              { color: loginMode === 'phone' ? '#54c255' : '#9ca3af', fontFamily: typography.fontFamily?.primary }
            ]}>
              Phone
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              loginMode === 'email' && styles.tabActive,
              { borderColor: loginMode === 'email' ? '#54c255' : 'rgba(255,255,255,0.2)' }
            ]}
            onPress={() => setLoginMode('email')}
            activeOpacity={0.7}
          >
            <Mail size={18} color={loginMode === 'email' ? '#54c255' : '#9ca3af'} />
            <Text style={[
              styles.tabText,
              { color: loginMode === 'email' ? '#54c255' : '#9ca3af', fontFamily: typography.fontFamily?.primary }
            ]}>
              Email
            </Text>
          </TouchableOpacity>
        </View>

        {/* Phone Login Mode */}
        {loginMode === 'phone' && (
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
              style={styles.loginButton}
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </Button>

            {/* Sign Up Link */}
            <View style={styles.signupContainer}>
              <Text style={[styles.signupPromptText, { color: '#9ca3af', fontFamily: typography.fontFamily?.primary }]}>
                Don't have an account?{' '}
              </Text>
              <Link href="/(auth)/signup" asChild>
                <TouchableOpacity activeOpacity={0.7}>
                  <Text style={[styles.signupLinkText, { color: '#54c255', fontFamily: typography.fontFamily?.primary }]}>
                    Create Account
                  </Text>
                </TouchableOpacity>
              </Link>
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
        )}

        {/* Email Login Mode */}
        {loginMode === 'email' && (
          <LoginForm onSuccess={handleLoginSuccess} />
        )}
      </View>
    </AuthContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
    width: '100%',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    gap: 8,
  },
  tabActive: {
    backgroundColor: 'rgba(84, 194, 85, 0.1)',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  formContainer: {
    width: '100%',
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
  loginButton: {
    marginBottom: 24,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupPromptText: {
    fontSize: 14,
  },
  signupLinkText: {
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
