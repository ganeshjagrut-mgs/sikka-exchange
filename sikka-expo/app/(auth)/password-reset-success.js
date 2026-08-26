import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { CheckCircle } from 'lucide-react-native';
import AuthContainer from '../../src/components/auth/AuthContainer';
import Button from '../../src/components/ui/Button';
import { useTheme } from '../../src/theme/ThemeProvider';

/**
 * Password reset success screen
 * Deep link target after user successfully resets password via email link
 */
export default function PasswordResetSuccessScreen() {
  const { colors, typography } = useTheme();

  const handleBackToLogin = () => {
    router.replace('/(auth)/login');
  };

  return (
    <AuthContainer scrollable={false}>
      <View style={styles.content}>
        {/* Success Icon */}
        <View style={[styles.iconContainer, { backgroundColor: 'rgba(84, 194, 85, 0.1)' }]}>
          <CheckCircle size={64} color="#54c255" strokeWidth={2} />
        </View>

        {/* Success Title */}
        <Text style={[styles.titleText, { color: colors.text, fontFamily: typography.fontFamily?.primary }]}>
          Password Reset Successful!
        </Text>

        {/* Success Message */}
        <Text style={[styles.messageText, { color: colors.textSecondary, fontFamily: typography.fontFamily?.primary }]}>
          Your password has been successfully reset. You can now sign in to your account with your new password.
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
