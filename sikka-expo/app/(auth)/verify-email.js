import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Mail, CheckCircle, RefreshCw } from 'lucide-react-native';
import AuthContainer from '../../src/components/auth/AuthContainer';
import AuthHeader from '../../src/components/auth/AuthHeader';
import Button from '../../src/components/ui/Button';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useAuth } from '../../src/hooks/useAuth';
import { firebaseAuth } from '../../src/services/firebaseAuth';

/**
 * Email verification pending screen
 * Shows after signup - requires user to verify email before accessing app
 */
export default function VerifyEmailScreen() {
  const { colors, typography } = useTheme();
  const { user, checkAuthStatus } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Start 60-second cooldown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResendEmail = async () => {
    if (countdown > 0) return;

    setIsResending(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await firebaseAuth.sendVerificationEmail();
      setSuccessMessage('Verification email sent! Check your inbox.');
      setCountdown(60); // Start 60-second cooldown
    } catch (err) {
      setError(err.message || 'Failed to send verification email');
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckVerification = async () => {
    setIsChecking(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const isVerified = await firebaseAuth.reloadUser();

      if (isVerified) {
        setSuccessMessage('Email verified successfully!');
        // Refresh auth state and navigate to app
        await checkAuthStatus();
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 1000);
      } else {
        setError('Email not verified yet. Please check your inbox and click the verification link.');
      }
    } catch (err) {
      setError(err.message || 'Failed to check verification status');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <AuthContainer scrollable={true}>
      <View style={styles.content}>
        {/* Header */}
        <AuthHeader
          title="Verify Your Email"
          subtitle="We've sent a verification link to your email address"
        />

        {/* Email Icon */}
        <View style={[styles.iconContainer, { backgroundColor: 'rgba(84, 194, 85, 0.1)' }]}>
          <Mail size={48} color="#54c255" />
        </View>

        {/* Email Address Display */}
        <Text style={[styles.emailText, { color: colors.text, fontFamily: typography.fontFamily?.primary }]}>
          {user?.email || 'your-email@example.com'}
        </Text>

        {/* Instructions */}
        <Text style={[styles.instructionText, { color: colors.textSecondary, fontFamily: typography.fontFamily?.primary }]}>
          Please check your email and click the verification link to continue. The email may take a few minutes to arrive.
        </Text>

        {/* Success Message */}
        {successMessage && (
          <View style={[styles.messageContainer, { backgroundColor: 'rgba(84, 194, 85, 0.1)' }]}>
            <CheckCircle size={16} color="#54c255" />
            <Text style={[styles.messageText, { color: '#54c255', fontFamily: typography.fontFamily?.primary }]}>
              {successMessage}
            </Text>
          </View>
        )}

        {/* Error Message */}
        {error && (
          <View style={[styles.messageContainer, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
            <Text style={[styles.messageText, { color: '#ef4444', fontFamily: typography.fontFamily?.primary }]}>
              {error}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {/* Check Verification Button */}
          <Button
            variant="primary"
            size="large"
            onPress={handleCheckVerification}
            loading={isChecking}
            disabled={isChecking}
            style={styles.button}
          >
            {isChecking ? 'Checking...' : "I've Verified My Email"}
          </Button>

          {/* Resend Email Button */}
          <TouchableOpacity
            style={styles.resendButton}
            onPress={handleResendEmail}
            disabled={countdown > 0 || isResending}
            activeOpacity={0.7}
          >
            <RefreshCw size={16} color={countdown > 0 ? colors.textSecondary : '#54c255'} />
            <Text style={[
              styles.resendText,
              {
                color: countdown > 0 ? colors.textSecondary : '#54c255',
                fontFamily: typography.fontFamily?.primary
              }
            ]}>
              {isResending
                ? 'Sending...'
                : countdown > 0
                ? `Resend Email (${countdown}s)`
                : 'Resend Verification Email'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Help Text */}
        <Text style={[styles.helpText, { color: colors.textSecondary, fontFamily: typography.fontFamily?.primary }]}>
          Didn't receive the email? Check your spam folder or click resend.
        </Text>
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
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emailText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
    gap: 8,
  },
  messageText: {
    fontSize: 14,
    flex: 1,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    width: '100%',
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 8,
  },
  resendText: {
    fontSize: 14,
    fontWeight: '500',
  },
  helpText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
  },
});
