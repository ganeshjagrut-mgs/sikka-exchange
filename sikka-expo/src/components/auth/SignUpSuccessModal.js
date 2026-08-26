import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { CheckCircle } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import Button from '../ui/Button';

/**
 * Success modal shown after signup completion
 * Shows welcome message and navigates to dashboard
 */
const SignUpSuccessModal = ({ visible, userName, onContinue }) => {
  const { colors, typography } = useTheme();

  // Auto-dismiss after 3 seconds if user doesn't click
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onContinue?.();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [visible, onContinue]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          {/* Success icon */}
          <View style={[styles.iconContainer, { backgroundColor: colors.success + '15' }]}>
            <CheckCircle size={64} color={colors.success} strokeWidth={2} />
          </View>

          {/* Welcome message */}
          <Text
            style={[
              styles.title,
              {
                color: colors.text,
                fontFamily: typography.fontFamily?.primary,
              },
            ]}
          >
            Welcome to Sikkaa!
          </Text>

          <Text
            style={[
              styles.message,
              {
                color: colors.textSecondary,
                fontFamily: typography.fontFamily?.primary,
              },
            ]}
          >
            {userName ? `Hi ${userName}! ` : ''}Your account has been created successfully.
            Let's get you started on your crypto journey.
          </Text>

          {/* Continue button */}
          <Button
            variant="primary"
            size="large"
            onPress={onContinue}
            style={styles.continueButton}
          >
            Get Started
          </Button>

          {/* Auto-dismiss hint */}
          <Text
            style={[
              styles.autoHint,
              {
                color: colors.textSecondary,
                fontFamily: typography.fontFamily?.primary,
              },
            ]}
          >
            Continuing automatically in 3 seconds...
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 32,
  },
  continueButton: {
    width: '100%',
    marginBottom: 16,
  },
  autoHint: {
    fontSize: 13,
    fontStyle: 'italic',
  },
});

export default SignUpSuccessModal;