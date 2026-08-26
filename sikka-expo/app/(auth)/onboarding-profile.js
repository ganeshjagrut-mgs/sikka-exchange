import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { User, Mail, Phone } from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useStore } from '../../src/store/useStore';
import { backendApi } from '../../src/services/backendApi';
import { auth } from '../../src/config/firebase';
import AuthContainer from '../../src/components/auth/AuthContainer';
import AuthHeader from '../../src/components/auth/AuthHeader';
import Button from '../../src/components/ui/Button';
import ValidationError from '../../src/components/auth/ValidationError';

/**
 * Onboarding profile screen - collects missing user information
 * For phone signup users: Full name and email are REQUIRED
 * For other auth methods: Shows appropriate fields
 */
export default function OnboardingProfileScreen() {
  const { colors, typography } = useTheme();
  const { phoneNumber, isNewUser } = useLocalSearchParams();
  const user = useStore((state) => state.user);
  const signupWithPhone = useStore((state) => state.signupWithPhone);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Determine which fields to show based on current user data
  const [needsFullName, setNeedsFullName] = useState(false);
  const [needsEmail, setNeedsEmail] = useState(false);
  const [needsPhone, setNeedsPhone] = useState(false);
  const [emailRequired, setEmailRequired] = useState(false);

  useEffect(() => {
    // Check Firebase user data to determine what fields are needed
    const currentUser = auth.currentUser;

    if (currentUser) {
      const hasName = currentUser.displayName && currentUser.displayName.trim().length > 0;
      const hasEmail = currentUser.email && currentUser.email.trim().length > 0;
      const hasPhone = currentUser.phoneNumber && currentUser.phoneNumber.trim().length > 0;

      setNeedsFullName(!hasName);
      setNeedsEmail(!hasEmail);
      setNeedsPhone(!hasPhone);

      // For phone signup users, email is REQUIRED (not optional)
      if (hasPhone && !hasEmail) {
        setEmailRequired(true);
      }

      console.log('📋 Onboarding field requirements:', {
        needsFullName: !hasName,
        needsEmail: !hasEmail,
        needsPhone: !hasPhone,
        emailRequired: hasPhone && !hasEmail,
        isNewUser: isNewUser,
      });
    }
  }, [isNewUser]);

  /**
   * Validate email format
   */
  const validateEmail = (emailValue) => {
    if (!emailValue && !emailRequired) return true; // Email is optional unless required
    if (!emailValue && emailRequired) return false; // Required but empty
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailValue);
  };

  /**
   * Validate phone number format
   */
  const validatePhone = (phone) => {
    if (!phone) return true; // Phone is optional
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 10;
  };

  /**
   * Handle complete profile button press
   */
  const handleCompleteProfile = async () => {
    setError('');

    // Validate required fields
    if (needsFullName && (!fullName || fullName.trim().length < 2)) {
      setError('Please enter your full name (at least 2 characters)');
      return;
    }

    // Email is required for phone signup users
    if (emailRequired && (!email || !validateEmail(email))) {
      setError('Please enter a valid email address');
      return;
    }

    if (email && !validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (phone && !validatePhone(phone)) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);

    try {
      console.log('📝 Completing user profile...');

      // Prepare registration/update data
      const userData = {};

      if (needsFullName && fullName) {
        userData.fullName = fullName.trim();
      }

      if (email) {
        userData.email = email.toLowerCase().trim();
      }

      // Include phone from params if available
      if (phoneNumber) {
        userData.phone = phoneNumber;
      } else if (needsPhone && phone) {
        const cleaned = phone.replace(/\D/g, '');
        userData.phone = `+91${cleaned}`;
      }

      console.log('📝 User data:', userData);

      // Try to register first (for new users), then update
      try {
        console.log('📝 Registering user in backend...');
        await backendApi.registerUser(userData);
        console.log('✅ User registered successfully');
      } catch (registerError) {
        console.log('📝 User may already exist, trying update:', registerError.message);
        // User might already exist, try to update instead
        await backendApi.updateUserProfile(userData);
        console.log('✅ Profile updated successfully');
      }

      // Navigate to dashboard
      router.replace('/(tabs)');
    } catch (err) {
      console.error('❌ Profile completion failed:', err.message);
      setError(err.message || 'Failed to complete profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle skip button press
   */
  const handleSkip = () => {
    console.log('⏭️ User skipped profile completion');
    router.replace('/(tabs)');
  };

  // Check if all required fields are filled
  const hasRequiredName = needsFullName ? fullName.trim().length >= 2 : true;
  const hasRequiredEmail = emailRequired ? email.trim().length > 0 && validateEmail(email) : true;
  const canProceed = hasRequiredName && hasRequiredEmail;

  return (
    <AuthContainer scrollable={true}>
      <View style={styles.content}>
        {/* Header */}
        <AuthHeader
          title="Complete Your Profile"
          subtitle="Help us personalize your experience by completing your profile"
        />

        {/* Form */}
        <View style={styles.formContainer}>
          {needsFullName && (
            <View style={styles.inputGroup}>
              <Text style={[
                styles.label,
                {
                  color: '#FFFFFF',
                  fontFamily: typography.fontFamily?.primary,
                }
              ]}>
                Full Name *
              </Text>
              <View style={styles.inputContainer}>
                <User size={20} color="#9ca3af" />
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter your full name"
                  placeholderTextColor="#6b7280"
                  style={[
                    styles.input,
                    {
                      color: '#FFFFFF',
                      fontFamily: typography.fontFamily?.primary,
                    }
                  ]}
                  autoCapitalize="words"
                />
              </View>
            </View>
          )}

          {needsEmail && (
            <View style={styles.inputGroup}>
              <Text style={[
                styles.label,
                {
                  color: '#FFFFFF',
                  fontFamily: typography.fontFamily?.primary,
                }
              ]}>
                Email Address {emailRequired ? '*' : '(Optional)'}
              </Text>
              <View style={styles.inputContainer}>
                <Mail size={20} color="#9ca3af" />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your.email@example.com"
                  placeholderTextColor="#6b7280"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[
                    styles.input,
                    {
                      color: '#FFFFFF',
                      fontFamily: typography.fontFamily?.primary,
                    }
                  ]}
                />
              </View>
            </View>
          )}

          {needsPhone && (
            <View style={styles.inputGroup}>
              <Text style={[
                styles.label,
                {
                  color: '#FFFFFF',
                  fontFamily: typography.fontFamily?.primary,
                }
              ]}>
                Phone Number (Optional)
              </Text>
              <View style={styles.inputContainer}>
                <Phone size={20} color="#9ca3af" />
                <Text style={[
                  styles.countryCode,
                  {
                    color: '#9ca3af',
                    fontFamily: typography.fontFamily?.primary,
                  }
                ]}>
                  +91
                </Text>
                <TextInput
                  value={phone}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/\D/g, '');
                    setPhone(cleaned.substring(0, 10));
                  }}
                  placeholder="9876543210"
                  placeholderTextColor="#6b7280"
                  keyboardType="phone-pad"
                  maxLength={10}
                  style={[
                    styles.input,
                    {
                      color: '#FFFFFF',
                      fontFamily: typography.fontFamily?.primary,
                    }
                  ]}
                />
              </View>
            </View>
          )}

          {/* Helper Text */}
          <Text style={[
            styles.helperText,
            {
              color: '#9ca3af',
              fontFamily: typography.fontFamily?.primary,
            }
          ]}>
            {emailRequired
              ? 'Your name and email are required to complete registration'
              : needsFullName
                ? 'Your name is required to complete registration'
                : 'Optional information helps us serve you better'}
          </Text>

          {/* Error Display */}
          <ValidationError error={error} />

          {/* Complete Profile Button */}
          <Button
            variant="primary"
            size="large"
            onPress={handleCompleteProfile}
            loading={loading}
            disabled={!canProceed || loading}
            style={styles.completeButton}
          >
            {loading ? 'Saving...' : 'Complete Profile'}
          </Button>

          {/* Skip Button (only when all fields are optional) */}
          {!needsFullName && !emailRequired && (
            <TouchableOpacity
              onPress={handleSkip}
              activeOpacity={0.7}
              disabled={loading}
              style={styles.skipButton}
            >
              <Text style={[
                styles.skipButtonText,
                {
                  color: '#9ca3af',
                  fontFamily: typography.fontFamily?.primary,
                }
              ]}>
                Skip for now
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </AuthContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    alignItems: 'center',
  },
  formContainer: {
    width: '100%',
    marginTop: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 13,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  completeButton: {
    marginBottom: 16,
  },
  skipButton: {
    padding: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
