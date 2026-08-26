import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Mail, ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuthValidation } from '../../hooks/useAuthValidation';
import { firebaseAuth } from '../../services/firebaseAuth';
import Button from '../ui/Button';
import FormField from './FormField';
import ValidationError from './ValidationError';

/**
 * Forgot password form component
 * Handles email input and password reset request
 */
const ForgotPasswordForm = ({ onSuccess }) => {
  const { colors, typography } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize validation with email field only
  const validation = useAuthValidation({
    email: '',
  });

  // Memoize icons to prevent re-creating on every render
  const mailIcon = useMemo(() => <Mail size={20} color={colors.textSecondary} />, [colors.textSecondary]);
  const arrowIcon = useMemo(() => <ArrowLeft size={16} color="#54c255" />, []);

  const handleResetPassword = async () => {
    setError(null);

    // Validate email
    const emailValidation = validation.validateField('email', validation.values.email, validation.values.password);
    if (!emailValidation.isValid) {
      validation.validateSingleField('email');
      return;
    }

    setIsLoading(true);

    try {
      await firebaseAuth.resetPassword(validation.values.email);
      onSuccess?.(validation.values.email);
    } catch (err) {
      setError(err.message || 'Failed to send password reset email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      {/* Email Field */}
      <FormField
        field="email"
        validation={validation}
        value={validation.values.email}
        onChange={validation.handleChange}
        onBlur={validation.handleBlur}
        placeholder="Enter your email address"
        keyboardType="email-address"
        autoCapitalize="none"
        leftIcon={mailIcon}
      />

      {/* Error Display */}
      <ValidationError error={error} />

      {/* Reset Password Button */}
      <Button
        variant="primary"
        size="large"
        onPress={handleResetPassword}
        loading={isLoading}
        disabled={!validation.values.email || isLoading}
        style={styles.button}
      >
        {isLoading ? 'Sending...' : 'Send Reset Link'}
      </Button>

      {/* Back to Login Link */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleBackToLogin}
        activeOpacity={0.7}
      >
        {arrowIcon}
        <Text style={[styles.backText, { color: '#54c255', fontFamily: typography.fontFamily?.primary }]}>
          Back to Login
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  button: {
    width: '100%',
    marginBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
    justifyContent: 'center',
  },
  backText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ForgotPasswordForm;
