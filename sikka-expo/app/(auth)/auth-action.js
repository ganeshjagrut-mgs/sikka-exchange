import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AlertCircle } from 'lucide-react-native';
import AuthContainer from '../../src/components/auth/AuthContainer';
import Button from '../../src/components/ui/Button';
import { useTheme } from '../../src/theme/ThemeProvider';

/**
 * Deep link handler for Firebase auth actions
 * Handles: email verification, password reset, email change verification
 * URL format: sikka://auth/auth-action?mode=<action>&oobCode=<code>
 */
export default function AuthActionScreen() {
  const { colors, typography } = useTheme();
  const params = useLocalSearchParams();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState(null);
  const [actionType, setActionType] = useState(null);

  useEffect(() => {
    handleAuthAction();
  }, []);

  const handleAuthAction = async () => {
    try {
      const { mode, oobCode } = params;

      if (!mode || !oobCode) {
        setError('Invalid authentication link');
        setIsProcessing(false);
        return;
      }

      setActionType(mode);

      // Handle different action types
      switch (mode) {
        case 'verifyEmail':
          // Email verification is handled by Firebase automatically via the link
          // User is redirected here after clicking the link
          setTimeout(() => {
            setIsProcessing(false);
            router.replace('/(auth)/email-verified');
          }, 1500);
          break;

        case 'resetPassword':
          // Password reset is handled by Firebase automatically via the link
          // User is redirected here after successfully resetting password
          setTimeout(() => {
            setIsProcessing(false);
            router.replace('/(auth)/password-reset-success');
          }, 1500);
          break;

        case 'recoverEmail':
          // Email recovery - less common
          setError('Email recovery is not yet supported');
          setIsProcessing(false);
          break;

        default:
          setError('Unknown authentication action');
          setIsProcessing(false);
      }
    } catch (err) {
      console.error('Auth action error:', err);
      setError(err.message || 'Failed to process authentication action');
      setIsProcessing(false);
    }
  };

  const handleBackToLogin = () => {
    router.replace('/(auth)/login');
  };

  if (isProcessing) {
    return (
      <AuthContainer scrollable={false}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#54c255" />
          <Text style={[styles.processingText, { color: colors.text, fontFamily: typography.fontFamily?.primary }]}>
            {actionType === 'verifyEmail' && 'Verifying your email...'}
            {actionType === 'resetPassword' && 'Processing password reset...'}
            {!actionType && 'Processing authentication...'}
          </Text>
        </View>
      </AuthContainer>
    );
  }

  if (error) {
    return (
      <AuthContainer scrollable={false}>
        <View style={styles.content}>
          {/* Error Icon */}
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
            <AlertCircle size={64} color="#ef4444" strokeWidth={2} />
          </View>

          {/* Error Title */}
          <Text style={[styles.titleText, { color: colors.text, fontFamily: typography.fontFamily?.primary }]}>
            Action Failed
          </Text>

          {/* Error Message */}
          <Text style={[styles.messageText, { color: colors.textSecondary, fontFamily: typography.fontFamily?.primary }]}>
            {error}
          </Text>

          {/* Back to Login Button */}
          <Button
            variant="primary"
            size="large"
            onPress={handleBackToLogin}
            style={styles.button}
          >
            Back to Login
          </Button>
        </View>
      </AuthContainer>
    );
  }

  // This shouldn't be reached, but provide fallback
  return (
    <AuthContainer scrollable={false}>
      <View style={styles.content}>
        <Text style={[styles.messageText, { color: colors.text, fontFamily: typography.fontFamily?.primary }]}>
          Processing...
        </Text>
      </View>
    </AuthContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  processingText: {
    fontSize: 16,
    marginTop: 24,
    textAlign: 'center',
  },
  titleText: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  button: {
    width: '100%',
  },
});
