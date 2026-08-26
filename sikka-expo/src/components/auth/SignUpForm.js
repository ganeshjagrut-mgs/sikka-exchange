import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { User, Mail, Lock, CheckCircle } from 'lucide-react-native'; // Phone removed
import { useTheme } from '../../theme/ThemeProvider';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import { useAuth } from '../../hooks/useAuth';
import { useAuthValidation } from '../../hooks/useAuthValidation';
import Button from '../ui/Button';
import FormField from './FormField';
import ValidationError from './ValidationError';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';
import LoadingOverlay from '../ui/LoadingOverlay';
import SignUpSuccessModal from './SignUpSuccessModal';

/**
 * Sign up form component with complete registration fields
 * Includes validation, password strength, and terms acceptance
 */
const SignUpForm = ({ onSuccess }) => {
  const { colors, typography } = useTheme();
  const { isMobile } = useBreakpoints();
  const { signup, isLoading, error, clearAuthError } = useAuth();
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Multi-step loading state
  const [loadingStep, setLoadingStep] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [signedUpUserName, setSignedUpUserName] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);

  const loadingSteps = [
    'Creating account...',
    'Setting up wallet...',
    'Generating addresses...',
    'Finalizing...',
  ];

  // Initialize validation with all signup fields
  const validation = useAuthValidation({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    // phone: '', // Commented out - not required for now
  });

  const handleSubmit = async () => {
    // Clear any existing auth errors
    clearAuthError();

    // Validate form
    if (!validation.validateAll()) {
      console.log('❌ SignUpForm: Validation failed');
      return;
    }

    // Check terms agreement
    if (!agreedToTerms) {
      // Could show error toast or alert here
      console.log('❌ Terms not agreed');
      return;
    }

    try {
      console.log('🚀 SignUpForm: Starting signup process...');

      // Step 1: Creating account (Firebase signup starts)
      setLoadingStep(0);

      // Call signup API
      const result = await signup(
        validation.values.email,
        validation.values.password,
        validation.values.name
      );

      if (result.success) {
        console.log('✅ SignUpForm: Signup successful');

        // Step 2: Setting up wallet
        setLoadingStep(1);
        await new Promise(resolve => setTimeout(resolve, 800));

        // Step 3: Generating addresses
        setLoadingStep(2);
        await new Promise(resolve => setTimeout(resolve, 800));

        // Step 4: Finalizing
        setLoadingStep(3);
        await new Promise(resolve => setTimeout(resolve, 500));

        // Show success modal
        setSignedUpUserName(validation.values.name);
        setShowSuccess(true);

        // Don't call onSuccess yet - let modal handle it
      } else {
        console.log('❌ SignUpForm: Signup failed:', result.error);
        setLoadingStep(0); // Reset loading step on error
      }
    } catch (err) {
      console.log('❌ SignUpForm: Signup error:', err);
      setLoadingStep(0); // Reset loading step on error
    }
  };

  const handleSuccessContinue = () => {
    setShowSuccess(false);
    // Set navigating state to keep loading visible during navigation
    setIsNavigating(true);
    // Navigate to dashboard
    onSuccess?.({ name: signedUpUserName });
  };

  const isFormReady = validation.isFormValid &&
                      validation.values.name &&
                      validation.values.email &&
                      // validation.values.phone && // Commented out - not required
                      validation.values.password &&
                      validation.values.confirmPassword &&
                      agreedToTerms;

  return (
    <>
      {/* Loading Overlay with Multi-Step Progress */}
      <LoadingOverlay
        visible={isLoading}
        steps={loadingSteps}
        currentStep={loadingStep}
      />

      {/* Success Modal */}
      <SignUpSuccessModal
        visible={showSuccess}
        userName={signedUpUserName}
        onContinue={handleSuccessContinue}
      />

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Full Name Field */}
        <FormField
          field="name"
          validation={validation}
          value={validation.values.name}
          onChange={validation.handleChange}
          onBlur={validation.handleBlur}
          placeholder="Enter your full name"
          autoCapitalize="words"
          leftIcon={<User size={20} color={colors.textSecondary} />}
        />

        {/* Helper text for name field */}
        <Text style={[
          styles.helperText,
          {
            color: '#9ca3af',
            fontFamily: typography.fontFamily?.primary,
          }
        ]}>
          Enter your full legal name as it appears on your government ID. This will be used for KYC verification.
        </Text>

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
          leftIcon={<Mail size={20} color={colors.textSecondary} />}
        />

        {/* Phone Number Field - Commented out for now */}
        {/* <FormField
          field="phone"
          validation={validation}
          value={validation.values.phone}
          onChange={validation.handleChange}
          onBlur={validation.handleBlur}
          placeholder="Enter your phone number (+91XXXXXXXXXX)"
          keyboardType="phone-pad"
          autoCapitalize="none"
          leftIcon={<Phone size={20} color={colors.textSecondary} />}
        /> */}

      {/* Password Field */}
      <FormField
        field="password"
        validation={validation}
        value={validation.values.password}
        onChange={validation.handleChange}
        onBlur={validation.handleBlur}
        placeholder="Create a password"
        secureTextEntry
        leftIcon={<Lock size={20} color={colors.textSecondary} />}
      />

      {/* Password Strength Indicator */}
      <PasswordStrengthIndicator passwordStrength={validation.passwordStrength} />

      {/* Confirm Password Field */}
      <FormField
        field="confirmPassword"
        validation={validation}
        value={validation.values.confirmPassword}
        onChange={validation.handleChange}
        onBlur={validation.handleBlur}
        placeholder="Confirm your password"
        secureTextEntry
        leftIcon={<CheckCircle size={20} color={colors.textSecondary} />}
      />

      {/* Terms and Conditions */}
      <TouchableOpacity
        style={styles.termsContainer}
        onPress={() => setAgreedToTerms(!agreedToTerms)}
        activeOpacity={0.7}
      >
        <View style={[
          styles.checkbox,
          {
            backgroundColor: agreedToTerms ? '#54c255' : 'transparent', // Match dashboard green
            borderColor: 'rgba(255, 255, 255, 0.2)', // Match dashboard border
          }
        ]}>
          {agreedToTerms && (
            <Text style={[styles.checkmark, { color: '#FFFFFF' }]}>✓</Text>
          )}
        </View>
        <View style={styles.termsTextContainer}>
          <Text style={[
            styles.termsText,
            {
              color: '#9ca3af', // Match dashboard textSecondary
              fontFamily: typography.fontFamily?.primary,
            }
          ]}>
            I agree to the{' '}
            <Text style={[styles.termsLink, { color: '#54c255' }]}> {/* Match dashboard green */}
              Terms of Service
            </Text>
            {' '}and{' '}
            <Text style={[styles.termsLink, { color: '#54c255' }]}> {/* Match dashboard green */}
              Privacy Policy
            </Text>
          </Text>
        </View>
      </TouchableOpacity>

      {/* Auth Error Display with Recovery Actions */}
      <ValidationError
        error={error}
        onRetry={error ? handleSubmit : undefined}
        onAction={error && error.includes('already') ? () => {
          // Navigate to login if email already exists
          clearAuthError();
        } : undefined}
        actionText={error && error.includes('already') ? 'Sign In Instead' : undefined}
      />

      {/* Sign Up Button */}
      <Button
        variant="primary"
        size={isMobile ? "medium" : "large"}
        onPress={handleSubmit}
        loading={isLoading || isNavigating}
        disabled={!isFormReady || isLoading || isNavigating}
        style={styles.signupButton}
      >
        {isLoading ? 'Creating Account...' : isNavigating ? 'Redirecting...' : 'Create Account'}
      </Button>

      {/* Login Link */}
      <View style={styles.loginContainer}>
        <Text style={[
          styles.loginPromptText,
          {
            color: '#9ca3af', // Match dashboard textSecondary
            fontFamily: typography.fontFamily?.primary,
          }
        ]}>
          Already have an account?{' '}
        </Text>
        <Link href="/(auth)/login" asChild>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={[
              styles.loginLinkText,
              {
                color: '#54c255', // Match dashboard green
                fontFamily: typography.fontFamily?.primary,
              }
            ]}>
              Sign In
            </Text>
          </TouchableOpacity>
        </Link>
      </View>
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flex: 1,
  },
  helperText: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: -16,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    marginRight: 12,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkmark: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  termsTextContainer: {
    flex: 1,
  },
  termsText: {
    fontSize: 14,
    lineHeight: 20,
  },
  termsLink: {
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  signupButton: {
    marginBottom: 24,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 20,
  },
  loginPromptText: {
    fontSize: 14,
  },
  loginLinkText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SignUpForm;