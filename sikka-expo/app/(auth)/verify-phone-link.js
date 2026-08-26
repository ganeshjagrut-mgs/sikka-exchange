import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Phone, Shield } from 'lucide-react-native';

import { useTheme } from '../../src/theme/ThemeProvider';
import { useStore } from '../../src/store/useStore';
import { firebaseAuth } from '../../src/services/firebaseAuth';

import AuthContainer from '../../src/components/auth/AuthContainer';
import AuthHeader from '../../src/components/auth/AuthHeader';
import Button from '../../src/components/ui/Button';
import ValidationError from '../../src/components/auth/ValidationError';

/**
 * Phone verification screen for existing email users
 * Links phone number to their Firebase account
 */
export default function VerifyPhoneLinkScreen() {
  const { colors, typography } = useTheme();
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const recaptchaVerifierRef = useRef(null);
  const recaptchaInitialized = useRef(false);

  const user = useStore((state) => state.user);
  const setPhoneConfirmation = useStore((state) => state.setPhoneConfirmation);
  const phoneConfirmation = useStore((state) => state.phoneConfirmation);
  const linkPhone = useStore((state) => state.linkPhone);

  // Initialize reCAPTCHA on mount (web only)
  // For mobile (Expo Go/EAS), we use FirebaseRecaptchaVerifierModal instead
  useEffect(() => {
    if (Platform.OS === 'web' && !recaptchaInitialized.current) {
      const timer = setTimeout(async () => {
        try {
          console.log('🔧 Initializing reCAPTCHA for phone linking (web)...');

          let container = document.getElementById('recaptcha-container-link');
          if (!container) {
            container = document.createElement('div');
            container.id = 'recaptcha-container-link';
            container.style.cssText = 'position: fixed; bottom: 0; left: 0; width: 1px; height: 1px; opacity: 0; overflow: hidden; z-index: -1;';
            document.body.appendChild(container);
          }

          const verifier = firebaseAuth.initializeRecaptcha('recaptcha-container-link');
          await verifier.render();
          recaptchaVerifierRef.current = verifier;
          recaptchaInitialized.current = true;
          console.log('✅ reCAPTCHA initialized for phone linking');
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
        const container = document.getElementById('recaptcha-container-link');
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

  // Handle send OTP for linking
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
      console.log('📱 Sending OTP for linking to:', validation.formatted);

      // Use sendPhoneOTPForLinking instead of regular sendPhoneOTP
      const confirmationResult = await firebaseAuth.sendPhoneOTPForLinking(
        `+91${validation.formatted}`,
        recaptchaVerifierRef.current
      );

      setPhoneConfirmation(confirmationResult);
      console.log('✅ OTP sent for linking');
      setStep('otp');
    } catch (err) {
      console.error('❌ Send OTP for linking failed:', err.message);
      setError(err.message);

      // Reset reCAPTCHA on error (web only)
      if (Platform.OS === 'web') {
        try {
          if (recaptchaVerifierRef.current) {
            recaptchaVerifierRef.current.clear();
            recaptchaVerifierRef.current = null;
          }
          const verifier = firebaseAuth.initializeRecaptcha('recaptcha-container-link');
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

  // Handle verify OTP and link phone
  const handleVerifyAndLink = async () => {
    setError('');

    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    if (!phoneConfirmation) {
      setError('Verification session expired. Please request a new code.');
      setStep('phone');
      return;
    }

    setLoading(true);

    try {
      console.log('🔗 Verifying OTP and linking phone...');

      const formattedPhone = `+91${validatePhoneNumber(phoneNumber).formatted}`;
      const result = await linkPhone(phoneConfirmation, otp, formattedPhone);

      if (result.success) {
        console.log('✅ Phone linked successfully');
        // Navigate to dashboard
        router.replace('/(tabs)');
      } else {
        setError(result.error || 'Failed to link phone number');
      }
    } catch (err) {
      console.error('❌ Phone linking failed:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneInput = (text) => {
    const cleaned = text.replace(/\D/g, '');
    const limited = cleaned.substring(0, 10);
    setPhoneNumber(limited);
  };

  const formatOTPInput = (text) => {
    const cleaned = text.replace(/\D/g, '');
    const limited = cleaned.substring(0, 6);
    setOtp(limited);
  };

  const isPhoneValid = validatePhoneNumber(phoneNumber).valid;
  const isOTPValid = otp.length === 6;

  return (
      <AuthContainer scrollable={true}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.iconContainer}>
          <Shield size={48} color="#54c255" />
        </View>

        <AuthHeader
          title="Verify Your Phone"
          subtitle={step === 'phone'
            ? "To continue using Sikkaa, please verify your mobile number"
            : `Enter the code sent to +91 ${phoneNumber}`
          }
        />

        {/* User info */}
        {user?.email && (
          <View style={styles.userInfo}>
            <Text style={[styles.userInfoText, { color: '#9ca3af', fontFamily: typography.fontFamily?.primary }]}>
              Logged in as: {user.email}
            </Text>
          </View>
        )}

        {/* Phone Input Step */}
        {step === 'phone' && (
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
              This phone number will be linked to your account for future logins
            </Text>

            <ValidationError error={error} />

            <Button
              variant="primary"
              size="large"
              onPress={handleSendOTP}
              loading={loading}
              disabled={!isPhoneValid || loading}
              style={styles.button}
            >
              {loading ? 'Sending OTP...' : 'Send Verification Code'}
            </Button>
          </View>
        )}

        {/* OTP Verification Step */}
        {step === 'otp' && (
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

            <ValidationError error={error} />

            <Button
              variant="primary"
              size="large"
              onPress={handleVerifyAndLink}
              loading={loading}
              disabled={!isOTPValid || loading}
              style={styles.button}
            >
              {loading ? 'Verifying...' : 'Verify & Link Phone'}
            </Button>

            {/* Resend OTP */}
            <View style={styles.resendContainer}>
              <Text style={[styles.resendPromptText, { color: '#9ca3af', fontFamily: typography.fontFamily?.primary }]}>
                Didn't receive the code?{' '}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setOtp('');
                  setStep('phone');
                }}
                activeOpacity={0.7}
                disabled={loading}
              >
                <Text style={[styles.resendLinkText, { color: '#54c255', fontFamily: typography.fontFamily?.primary }]}>
                  Change Number
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Web Platform Notice */}
        {Platform.OS === 'web' && (
          <View style={styles.webNotice}>
            <Text style={[styles.webNoticeText, { color: '#60a5fa', fontFamily: typography.fontFamily?.primary }]}>
              Phone verification works best on mobile devices.
            </Text>
          </View>
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
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(84, 194, 85, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  userInfo: {
    marginBottom: 24,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
  },
  userInfoText: {
    fontSize: 13,
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
  helperText: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    marginBottom: 24,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendPromptText: {
    fontSize: 14,
  },
  resendLinkText: {
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
