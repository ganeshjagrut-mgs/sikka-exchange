import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { Phone, ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useStore } from '../../src/store/useStore';
import { firebaseAuth } from '../../src/services/firebaseAuth';
import AuthContainer from '../../src/components/auth/AuthContainer';
import AuthHeader from '../../src/components/auth/AuthHeader';
import Button from '../../src/components/ui/Button';
import ValidationError from '../../src/components/auth/ValidationError';

/**
 * Phone login screen - user enters phone number to receive OTP
 */
export default function PhoneLoginScreen() {
  const { colors, typography } = useTheme();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const recaptchaVerifierRef = useRef(null);
  const recaptchaInitialized = useRef(false);
  const setPhoneConfirmation = useStore((state) => state.setPhoneConfirmation);

  // Initialize reCAPTCHA on mount (web only)
  useEffect(() => {
    if (Platform.OS === 'web' && !recaptchaInitialized.current) {
      // Create container manually to avoid React re-render issues
      const timer = setTimeout(async () => {
        try {
          console.log('🔧 Initializing reCAPTCHA on component mount...');

          // Check if container exists, create if not
          let container = document.getElementById('recaptcha-container');
          if (!container) {
            console.log('🔨 Creating reCAPTCHA container manually...');
            container = document.createElement('div');
            container.id = 'recaptcha-container';
            container.style.cssText = 'position: fixed; bottom: 0; left: 0; width: 1px; height: 1px; opacity: 0; overflow: hidden; z-index: -1;';
            document.body.appendChild(container);
          }

          console.log('✅ reCAPTCHA container ready:', container);

          // Create and render verifier
          const verifier = firebaseAuth.initializeRecaptcha('recaptcha-container');

          // CRITICAL: Render verifier before use
          await verifier.render();
          console.log('✅ reCAPTCHA verifier rendered');

          recaptchaVerifierRef.current = verifier;
          recaptchaInitialized.current = true;
          console.log('✅ reCAPTCHA initialized successfully on mount');
        } catch (error) {
          console.error('❌ reCAPTCHA initialization error:', error);
          setError('Verification setup failed. Please refresh the page.');
        }
      }, 500);

      return () => {
        clearTimeout(timer);
        // Clean up verifier on unmount
        if (recaptchaVerifierRef.current) {
          try {
            console.log('🧹 Cleaning up reCAPTCHA verifier');
            recaptchaVerifierRef.current.clear();
            recaptchaVerifierRef.current = null;
            recaptchaInitialized.current = false;
          } catch (e) {
            console.warn('⚠️ Error cleaning up reCAPTCHA:', e.message);
          }
        }
        // Remove container from DOM
        const container = document.getElementById('recaptcha-container');
        if (container && container.parentNode) {
          container.parentNode.removeChild(container);
        }
      };
    }
  }, []);

  /**
   * Validate phone number format
   */
  const validatePhoneNumber = (phone) => {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');

    // Check if it's a valid Indian mobile number (10 digits)
    if (cleaned.length === 10) {
      return { valid: true, formatted: cleaned };
    }

    // Check if it starts with +91 (13 digits total)
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return { valid: true, formatted: cleaned.substring(2) };
    }

    return { valid: false, formatted: cleaned };
  };

  /**
   * Handle send OTP button press
   */
  const handleSendOTP = async () => {
    setError('');

    // Validate phone number
    const validation = validatePhoneNumber(phoneNumber);

    if (!validation.valid) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    // Web requires reCAPTCHA
    if (Platform.OS === 'web' && !recaptchaVerifierRef.current) {
      setError('Verification not ready. Please refresh and try again.');
      return;
    }

    setLoading(true);

    try {
      console.log('📱 Sending OTP to:', validation.formatted);

      // Send OTP via Firebase with verifier from ref
      const confirmationResult = await firebaseAuth.sendPhoneOTP(
        `+91${validation.formatted}`,
        recaptchaVerifierRef.current
      );

      // Store confirmation result in state
      setPhoneConfirmation(confirmationResult);

      console.log('✅ OTP sent successfully');

      // Navigate to OTP verification screen
      router.push({
        pathname: '/(auth)/verify-otp',
        params: { phoneNumber: `+91${validation.formatted}` }
      });
    } catch (err) {
      console.error('❌ Send OTP failed:', err.message);
      setError(err.message);

      // Reset reCAPTCHA on error (web only)
      if (Platform.OS === 'web') {
        try {
          console.log('🔄 Resetting reCAPTCHA after error...');

          // Clear existing verifier
          if (recaptchaVerifierRef.current) {
            recaptchaVerifierRef.current.clear();
            recaptchaVerifierRef.current = null;
          }

          // Create new verifier
          const verifier = firebaseAuth.initializeRecaptcha('recaptcha-container');

          // Render it before storing
          await verifier.render();

          recaptchaVerifierRef.current = verifier;
          console.log('✅ reCAPTCHA reset and re-rendered successfully');
        } catch (recaptchaErr) {
          console.error('❌ reCAPTCHA reset failed:', recaptchaErr);
          setError('Verification reset failed. Please refresh the page.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Format phone number input with spaces for readability
   */
  const formatPhoneInput = (text) => {
    const cleaned = text.replace(/\D/g, '');
    const limited = cleaned.substring(0, 10);
    setPhoneNumber(limited);
  };

  const isPhoneValid = validatePhoneNumber(phoneNumber).valid;

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
            Back to Login
          </Text>
        </TouchableOpacity>

        {/* Header */}
        <AuthHeader
          title="Phone Sign-In"
          subtitle="Enter your mobile number to receive a verification code"
        />

        {/* Phone Input */}
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <View style={styles.countryCodeContainer}>
              <Text style={[
                styles.countryCode,
                {
                  color: '#FFFFFF',
                  fontFamily: typography.fontFamily?.primary,
                }
              ]}>
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

          <Text style={[
            styles.helperText,
            {
              color: '#9ca3af',
              fontFamily: typography.fontFamily?.primary,
            }
          ]}>
            We'll send a 6-digit verification code to this number
          </Text>

          {/* Error Display */}
          <ValidationError error={error} />

          {/* Send OTP Button */}
          <Button
            variant="primary"
            size="large"
            onPress={handleSendOTP}
            loading={loading}
            disabled={!isPhoneValid || loading}
            style={styles.sendButton}
          >
            {loading ? 'Sending OTP...' : 'Send OTP'}
          </Button>
        </View>

        {/* Web Platform Notice */}
        {Platform.OS === 'web' && (
          <View style={{
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 1,
            borderColor: '#3b82f6',
            borderRadius: 12,
            padding: 12,
            marginTop: 16,
          }}>
            <Text style={[
              {
                color: '#60a5fa',
                fontSize: 12,
                textAlign: 'center',
                fontFamily: typography.fontFamily?.primary,
              }
            ]}>
              Phone authentication works best on mobile devices. For testing on web, ensure popups are enabled.
            </Text>
          </View>
        )}
      </View>

      {/* reCAPTCHA Container - Created manually via DOM to avoid React re-render issues */}
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
  sendButton: {
    marginTop: 8,
  },
});
