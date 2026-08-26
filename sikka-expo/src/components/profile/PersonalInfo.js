import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useStore } from '../../store/useStore';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import { backendApi } from '../../services/backendApi';
import GlassContainer from '../ui/GlassContainer';
import Input from '../ui/Input';
import Button from '../ui/Button';
import {
  User,
  Mail,
  Phone,
  Edit,
  Save,
  X,
  AlertCircle,
  Info,
  LogOut,
} from 'lucide-react-native';

/**
 * FormField Component (moved outside to prevent re-creation on every render)
 * This prevents keyboard collapse issue when typing
 */
const FormField = ({
  icon: IconComponent,
  label,
  value,
  onChangeText,
  placeholder,
  error,
  editable = true,
  keyboardType = 'default',
  infoText = null,
  colors,
  typography,
  responsive,
  isEditing,
}) => (
  <View style={[styles.fieldContainer, { marginBottom: responsive.spacing }]}>
    <Text style={[
      styles.fieldLabel,
      {
        color: colors.text,
        fontFamily: typography.fontFamily?.primary,
        fontSize: responsive.fontSize.label,
        marginBottom: 8,
      }
    ]}>
      <IconComponent size={16} color={colors.textSecondary} strokeWidth={1.5} />
      {'  ' + label}
    </Text>

    <Input
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      editable={editable && isEditing}
      keyboardType={keyboardType}
      style={[
        styles.input,
        {
          backgroundColor: (editable && isEditing)
            ? colors.surface
            : colors.surfaceVariant + '40',
          borderColor: error
            ? colors.error
            : (editable && isEditing)
              ? colors.border
              : 'transparent',
          opacity: (editable && isEditing) ? 1 : 0.8,
        }
      ]}
      placeholderTextColor={colors.textSecondary}
    />

    {error && (
      <View style={styles.errorContainer}>
        <AlertCircle size={14} color={colors.error} strokeWidth={1.5} />
        <Text style={[
          styles.errorText,
          {
            color: colors.error,
            fontFamily: typography.fontFamily?.primary,
            fontSize: responsive.fontSize.label - 2,
          }
        ]}>
          {error}
        </Text>
      </View>
    )}

    {infoText && !error && (
      <View style={styles.infoContainer}>
        <Info size={14} color={colors.textSecondary} strokeWidth={1.5} />
        <Text style={[
          styles.infoText,
          {
            color: colors.textSecondary,
            fontFamily: typography.fontFamily?.primary,
            fontSize: responsive.fontSize.label - 2,
          }
        ]}>
          {infoText}
        </Text>
      </View>
    )}
  </View>
);

/**
 * PersonalInfo Component
 *
 * Simplified personal information form matching backend schema
 * Fields: Full Name (read-only), Email (read-only), Phone (editable, optional)
 * Backend schema: id, firebase_uid, email, phone, full_name, kyc_status, created_at, updated_at
 *
 * Features:
 * - Minimal form with only backend-supported fields
 * - Name and Email are read-only (cannot be changed after signup)
 * - Only Phone number can be edited
 * - Form validation with error handling
 * - Responsive design for all screen sizes
 */
export default function PersonalInfo() {
  const { colors, typography } = useTheme();
  const { user, updateUser, logout } = useStore();
  const { isMobile, isTablet } = useBreakpoints();

  // Form state management
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  // Fetch profile from backend on mount (ONCE)
  useEffect(() => {
    const fetchProfile = async () => {
      console.log('📱 PersonalInfo: Fetching profile from backend...');
      setIsLoading(true);

      try {
        const profileData = await backendApi.getUserProfile();
        console.log('✅ PersonalInfo: Profile fetched:', profileData);

        // Update form data with backend profile
        const profileUser = profileData.data || profileData.user || {};
        setFormData({
          name: profileUser.full_name || '',
          email: profileUser.email || '',
          phone: profileUser.phone_number || '',
        });

        // DON'T update Zustand store here - prevents infinite loop
        // Store already has user data from login

        setIsLoading(false);
      } catch (error) {
        console.error('❌ PersonalInfo: Failed to fetch profile:', error.message);

        // Fallback to local user data
        setFormData({
          name: user?.name || '',
          email: user?.email || '',
          phone: user?.phone || '',
        });

        setIsLoading(false);
      }
    };

    // Only fetch if user is loaded
    if (user) {
      fetchProfile();
    } else {
      setIsLoading(false);
    }

    // CRITICAL: Empty dependency array - fetch ONCE on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Responsive styling
  const getResponsiveStyles = () => {
    if (isMobile) {
      return {
        padding: 16,
        fontSize: {
          title: 20,
          subtitle: 14,
          label: 14,
          input: 16,
        },
        spacing: 12,
      };
    } else if (isTablet) {
      return {
        padding: 20,
        fontSize: {
          title: 24,
          subtitle: 16,
          label: 16,
          input: 18,
        },
        spacing: 16,
      };
    } else {
      return {
        padding: 24,
        fontSize: {
          title: 28,
          subtitle: 18,
          label: 18,
          input: 20,
        },
        spacing: 20,
      };
    }
  };

  const responsive = getResponsiveStyles();

  // Form validation (currently no editable fields - name, email, phone are all read-only)
  const validateForm = () => {
    const newErrors = {};
    // All fields are read-only after signup, no validation needed
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form field changes
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors and try again.');
      return;
    }

    setIsSaving(true);
    console.log('💾 PersonalInfo: Saving profile to backend...');

    try {
      // Call backend API to update profile
      // Note: Name, email, and phone are all read-only after signup
      // This save function is kept for future editable fields
      const updateData = {};

      const response = await backendApi.updateUserProfile(updateData);
      console.log('✅ PersonalInfo: Profile updated successfully:', response);

      // Update Zustand store with BACKEND RESPONSE
      const responseData = response.data || response.user || {};
      updateUser({
        name: responseData.full_name,
        email: responseData.email,
        phone: responseData.phone_number || '',
      });

      // Update form state with BACKEND RESPONSE (source of truth)
      setFormData({
        name: responseData.full_name || '',
        email: responseData.email || '',
        phone: responseData.phone_number || '',
      });

      setIsEditing(false);
      Alert.alert('Success', 'Your phone number has been updated successfully!');
    } catch (error) {
      console.error('❌ PersonalInfo: Failed to update profile:', error.message);
      Alert.alert('Error', error.message || 'Failed to update phone number. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    });
    setErrors({});
    setIsEditing(false);
  };

  // Handle logout
  const handleLogout = async () => {
    // Use native confirm on web, Alert.alert on native
    const confirmed = Platform.OS === 'web'
      ? window.confirm('Are you sure you want to sign out from your Sikkaa Exchange account?')
      : await new Promise((resolve) => {
          Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out from your Sikkaa Exchange account?',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              {
                text: 'Sign Out',
                style: 'destructive',
                onPress: () => resolve(true)
              }
            ]
          );
        });

    if (confirmed) {
      try {
        await logout();
        // Navigation will be handled automatically by AuthWrapper
      } catch (error) {
        if (Platform.OS === 'web') {
          window.alert('Failed to sign out. Please try again.');
        } else {
          Alert.alert('Error', 'Failed to sign out. Please try again.');
        }
      }
    }
  };

  // Show loading state while fetching profile
  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading profile...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingBottom: Platform.OS === 'ios' ? 105 : 85, // Account for bottom tab bar
      }}
    >
      <GlassContainer style={[styles.formContainer, { padding: responsive.padding }]}>

        {/* Section Header */}
        <View style={styles.header}>
          <View>
            <Text style={[
              styles.title,
              {
                color: colors.text,
                fontFamily: typography.fontFamily?.primary,
                fontSize: responsive.fontSize.title,
              }
            ]}>
              Personal Information
            </Text>
            <Text style={[
              styles.subtitle,
              {
                color: colors.textSecondary,
                fontFamily: typography.fontFamily?.primary,
                fontSize: responsive.fontSize.subtitle,
              }
            ]}>
              Manage your basic account details
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.editButton,
              {
                backgroundColor: isEditing ? colors.error + '20' : colors.primary + '20',
              }
            ]}
            onPress={isEditing ? handleCancel : () => setIsEditing(true)}
            activeOpacity={0.7}
          >
            {isEditing ? (
              <X size={20} color={colors.error} strokeWidth={1.5} />
            ) : (
              <Edit size={20} color={colors.primary} strokeWidth={1.5} />
            )}
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <View style={[styles.formFields, { marginTop: responsive.spacing * 1.5 }]}>

          {/* Full Name (Read-Only) */}
          <FormField
            icon={User}
            label="Full Name"
            value={formData.name}
            onChangeText={(value) => handleFieldChange('name', value)}
            placeholder="Enter your full name"
            error={errors.name}
            editable={false}
            infoText="Full name cannot be changed after signup"
            colors={colors}
            typography={typography}
            responsive={responsive}
            isEditing={isEditing}
          />

          {/* Email Address (Read-Only) */}
          <FormField
            icon={Mail}
            label="Email Address"
            value={formData.email}
            onChangeText={(value) => handleFieldChange('email', value)}
            placeholder="Email address"
            error={errors.email}
            keyboardType="email-address"
            editable={false}
            infoText="Email is tied to your account and cannot be changed here"
            colors={colors}
            typography={typography}
            responsive={responsive}
            isEditing={isEditing}
          />

          {/* Phone Number (Read-Only) */}
          <FormField
            icon={Phone}
            label="Phone Number"
            value={formData.phone}
            onChangeText={(value) => handleFieldChange('phone', value)}
            placeholder="Phone number"
            error={errors.phone}
            keyboardType="phone-pad"
            editable={false}
            infoText="Phone number cannot be changed after signup"
            colors={colors}
            typography={typography}
            responsive={responsive}
            isEditing={isEditing}
          />
        </View>

        {/* Save Button */}
        {isEditing && (
          <View style={[styles.saveSection, { marginTop: responsive.spacing * 1.5 }]}>
            <Button
              onPress={handleSave}
              loading={isSaving}
              disabled={isSaving}
              style={styles.saveButton}
            >
              <View style={styles.saveButtonContent}>
                <Save size={20} color={colors.background} strokeWidth={1.5} />
                <Text style={[
                  styles.saveButtonText,
                  {
                    color: colors.background,
                    fontFamily: typography.fontFamily?.primary,
                    fontSize: responsive.fontSize.input,
                  }
                ]}>
                  Save Changes
                </Text>
              </View>
            </Button>
          </View>
        )}

        {/* Sign Out Button */}
        {!isEditing && (
          <View style={[styles.logoutSection, { marginTop: responsive.spacing * 2 }]}>
            <TouchableOpacity
              style={[
                styles.logoutButton,
                {
                  backgroundColor: colors.error + '15',
                  borderColor: colors.error + '30',
                }
              ]}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <LogOut size={20} color={colors.error} strokeWidth={1.5} />
              <Text style={[
                styles.logoutButtonText,
                {
                  color: colors.error,
                  fontFamily: typography.fontFamily?.primary,
                  fontSize: responsive.fontSize.input,
                }
              ]}>
                Sign Out
              </Text>
            </TouchableOpacity>
            <Text style={[
              styles.logoutHint,
              {
                color: colors.textSecondary,
                fontFamily: typography.fontFamily?.primary,
                fontSize: responsive.fontSize.label - 2,
              }
            ]}>
              You'll be signed out from your Sikkaa Exchange account
            </Text>
          </View>
        )}
      </GlassContainer>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  formContainer: {
    borderRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    opacity: 0.8,
    lineHeight: 20,
  },
  editButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  formFields: {
    flex: 1,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontWeight: '500',
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  errorText: {
    marginLeft: 4,
    flex: 1,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  infoText: {
    marginLeft: 4,
    flex: 1,
    opacity: 0.7,
  },
  saveSection: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 16,
  },
  saveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    marginLeft: 8,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  logoutSection: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  logoutButtonText: {
    marginLeft: 8,
    fontWeight: '600',
  },
  logoutHint: {
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 18,
  },
});
