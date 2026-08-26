import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { CheckCircle } from 'lucide-react-native';
import AuthContainer from '../../src/components/auth/AuthContainer';
import Button from '../../src/components/ui/Button';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useAuth } from '../../src/hooks/useAuth';

/**
 * Email verification success screen
 * Deep link target after user clicks verification link in email
 */
export default function EmailVerifiedScreen() {
  const { colors, typography } = useTheme();
  const { checkAuthStatus } = useAuth();

  // Auto-refresh auth status when screen loads
  useEffect(() => {
    const refreshAuth = async () => {
      await checkAuthStatus();
    };
    refreshAuth();
  }, []);

  const handleContinue = () => {
    router.replace('/(tabs)');
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
          Email Verified!
        </Text>

        {/* Success Message */}
        <Text style={[styles.messageText, { color: colors.textSecondary, fontFamily: typography.fontFamily?.primary }]}>
          Your email has been successfully verified. You can now access all features of Sikkaa Exchange.
        </Text>

        {/* Continue Button */}
        <Button
          variant="primary"
          size="large"
          onPress={handleContinue}
          style={styles.button}
        >
          Continue to App
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
