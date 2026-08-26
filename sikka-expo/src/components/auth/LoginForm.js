import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Link, router } from 'expo-router';
import { Mail, Lock } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import { useAuth } from '../../hooks/useAuth';
import { useAuthValidation } from '../../hooks/useAuthValidation';
import Button from '../ui/Button';
import FormField from './FormField';
import ValidationError from './ValidationError';
// import AuthSocialButtons from './AuthSocialButtons'; // Commented out - not needed

/**
 * Login form component with email/password fields
 * Includes validation, loading states, and navigation
 */
const LoginForm = ({ onSuccess }) => {
  const { colors, typography } = useTheme();
  const { isMobile } = useBreakpoints();
  const { login, isLoading, error, clearAuthError } = useAuth();
  const [rememberMe, setRememberMe] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Initialize validation with login fields only
  const validation = useAuthValidation({
    email: '',
    password: '',
    // Don't initialize confirmPassword or name for login form
  });

  const handleSubmit = async () => {
    console.log('🚀 LoginForm: handleSubmit called');
    console.log('🚀 LoginForm: Form values:', validation.values);
    console.log('🚀 LoginForm: isFormReady:', isFormReady);
    console.log('🚀 LoginForm: isLoading:', isLoading);
    
    // Clear any existing auth errors
    clearAuthError();

    // Validate form - only validate login fields (email and password)
    const emailValidation = validation.validateField('email', validation.values.email, validation.values.password);
    const passwordValidation = validation.validateField('password', validation.values.password, validation.values.password);
    const isValid = emailValidation.isValid && passwordValidation.isValid;
    
    console.log('🚀 LoginForm: Email validation:', emailValidation);
    console.log('🚀 LoginForm: Password validation:', passwordValidation);
    console.log('🚀 LoginForm: Form validation result:', isValid);
    
    if (!isValid) {
      console.log('❌ LoginForm: Form validation failed');
      // Trigger validation for individual fields to show errors
      validation.validateSingleField('email');
      validation.validateSingleField('password');
      return;
    }

    try {
      console.log('🚀 LoginForm: Attempting login with:', {
        email: validation.values.email,
        password: '***masked***'
      });
      
      const result = await login(validation.values.email, validation.values.password);
      console.log('🚀 LoginForm: Login result:', { success: result.success, hasUser: !!result.user });
      
      if (result.success) {
        console.log('✅ LoginForm: Login successful, setting navigation state');
        // Set navigating state to keep loading spinner visible during navigation
        setIsNavigating(true);
        // TODO: Handle remember me functionality with AsyncStorage
        onSuccess?.(result.user);
      } else {
        console.log('❌ LoginForm: Login failed:', result.error);
      }
    } catch (err) {
      console.log('❌ LoginForm: Login error:', err);
    }
  };

  // Memoized form readiness check - simple checks without expensive validation
  // Full validation happens on submit, this just enables/disables the button
  const isFormReady = useMemo(() => {
    const { email, password } = validation.values;

    // Simple format checks without running full validation engine
    const hasValidEmail = email && email.includes('@') && email.includes('.') && email.length > 5;
    const hasValidPassword = password && password.length >= 8;

    const ready = hasValidEmail && hasValidPassword;

    console.log('🔍 LoginForm: Form readiness check:', {
      email: email,
      password: password ? '***masked***' : '',
      hasValidEmail,
      hasValidPassword,
      isFormReady: ready
    });

    return ready;
  }, [validation.values.email, validation.values.password]);


  return (
    <View style={styles.container}>
      {/* Hide form during navigation to prevent flash */}
      {isNavigating ? (
        <View style={styles.navigationContainer}>
          <Text style={[styles.navigationText, { color: colors.textSecondary }]}>
            Taking you to your dashboard...
          </Text>
        </View>
      ) : (
        <>
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

      {/* Password Field */}
      <FormField
        field="password"
        validation={validation}
        value={validation.values.password}
        onChange={validation.handleChange}
        onBlur={validation.handleBlur}
        placeholder="Enter your password"
        secureTextEntry
        leftIcon={<Lock size={20} color={colors.textSecondary} />}
      />

      {/* Remember Me & Forgot Password */}
      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={styles.rememberMeContainer}
          onPress={() => setRememberMe(!rememberMe)}
          activeOpacity={0.7}
        >
          <View style={[
            styles.checkbox,
            {
              backgroundColor: rememberMe ? '#54c255' : 'transparent', // Match dashboard green
              borderColor: 'rgba(255, 255, 255, 0.2)', // Match dashboard border
            }
          ]}>
            {rememberMe && (
              <Text style={[styles.checkmark, { color: '#FFFFFF' }]}>✓</Text>
            )}
          </View>
          <Text style={[
            styles.rememberMeText,
            {
              color: '#9ca3af', // Match dashboard textSecondary
              fontFamily: typography.fontFamily?.primary,
            }
          ]}>
            Remember me
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.forgotPasswordButton}
          onPress={() => router.push('/(auth)/forgot-password')}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.forgotPasswordText,
            {
              color: '#54c255', // Match dashboard green
              fontFamily: typography.fontFamily?.primary,
            }
          ]}>
            Forgot Password?
          </Text>
        </TouchableOpacity>
      </View>

      {/* Auth Error Display */}
      <ValidationError error={error} />

      {/* Login Button */}
      <Button
        variant="primary"
        size={isMobile ? "medium" : "large"}
        onPress={handleSubmit}
        loading={isLoading || isNavigating}
        disabled={!isFormReady || isLoading || isNavigating}
        style={styles.loginButton}
      >
        {isLoading ? 'Signing In...' : isNavigating ? 'Redirecting...' : 'Sign In'}
      </Button>

      {/* Social Sign-In Buttons - Commented out for now */}
      {/* <AuthSocialButtons onSuccess={onSuccess} /> */}

      {/* Sign Up Link */}
      <View style={styles.signupContainer}>
        <Text style={[
          styles.signupPromptText,
          {
            color: '#9ca3af', // Match dashboard textSecondary
            fontFamily: typography.fontFamily?.primary,
          }
        ]}>
          Don't have an account?{' '}
        </Text>
        <Link href="/(auth)/signup" asChild>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={[
              styles.signupLinkText,
              {
                color: '#54c255', // Match dashboard green
                fontFamily: typography.fontFamily?.primary,
              }
            ]}>
              Create Account
            </Text>
          </TouchableOpacity>
        </Link>
      </View>
      </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  navigationContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigationText: {
    fontSize: 16,
    textAlign: 'center',
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  rememberMeText: {
    fontSize: 14,
  },
  forgotPasswordButton: {
    padding: 4,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    marginBottom: 24,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupPromptText: {
    fontSize: 14,
  },
  signupLinkText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default LoginForm;