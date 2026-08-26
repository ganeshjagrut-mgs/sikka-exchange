import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Mail } from 'lucide-react-native';
import AuthContainer from '../../src/components/auth/AuthContainer';
import AuthHeader from '../../src/components/auth/AuthHeader';
import Button from '../../src/components/ui/Button';
import ForgotPasswordForm from '../../src/components/auth/ForgotPasswordForm';
import { useTheme } from '../../src/theme/ThemeProvider';

/**
 * Forgot password screen
 * Allows users to request password reset email
 */
export default function ForgotPasswordScreen() {
  const { colors, typography } = useTheme();
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const handleResetSuccess = (email) => {
    setSentEmail(email);
    setEmailSent(true);
  };

  const handleBackToLogin = () => {
    // Navigate back to login screen
    router.push('/login');
  };

  if (emailSent) {
    // Show success message
    return (
      <AuthContainer scrollable={false}>
        <View style={styles.content}>
          {/* Success Icon */}
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(84, 194, 85, 0.1)' }]}>
            <Mail size={48} color="#54c255" />
          </View>

          {/* Success Title */}
          <Text style={[styles.titleText, { color: colors.text, fontFamily: typography.fontFamily?.primary }]}>
            Check Your Email
          </Text>

          {/* Success Message */}
          <Text style={[styles.messageText, { color: colors.textSecondary, fontFamily: typography.fontFamily?.primary }]}>
            We've sent password reset instructions to{' '}
            <Text style={{ color: colors.text, fontWeight: '600' }}>
              {sentEmail}
            </Text>
            . Please check your inbox and follow the link to reset your password.
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

          {/* Help Text */}
          <Text style={[styles.helpText, { color: colors.textSecondary, fontFamily: typography.fontFamily?.primary }]}>
            Didn't receive the email? Check your spam folder.
          </Text>
        </View>
      </AuthContainer>
    );
  }

  return (
    <AuthContainer scrollable={true}>
      <View style={styles.content}>
        {/* Header */}
        <AuthHeader
          title="Forgot Password"
          subtitle="Enter your email address and we'll send you instructions to reset your password"
        />

        {/* Forgot Password Form */}
        <ForgotPasswordForm onSuccess={handleResetSuccess} />
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
  titleText: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  button: {
    width: '100%',
    marginBottom: 16,
  },
  helpText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
  },
});
