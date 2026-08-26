import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/theme/ThemeProvider';
import { User, MapPin, Calendar, CreditCard } from 'lucide-react-native';
import Input from '../../src/components/ui/Input';
import Button from '../../src/components/ui/Button';
import KYCImagePicker from '../../src/components/kyc/ImagePicker';
import useKYCStore from '../../src/store/kycStore';
import { useStore } from '../../src/store/useStore';
import Layout from '../../src/components/Layout';
// Note: test_images.json was removed - test functionality disabled

// Indian states list
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

// ID proof types
const ID_PROOF_TYPES = [
  { label: 'Aadhar Card', value: 'AADHAR' },
  { label: 'Passport', value: 'PASSPORT' },
  { label: 'Driving License', value: 'DRIVERS_LICENSE' },
];

/**
 * Split full name into first and last name
 * Handles edge cases:
 * - Single word: "Madonna" -> firstName="Madonna", lastName=""
 * - Multiple words: "Juan Carlos Silva" -> firstName="Juan Carlos", lastName="Silva"
 * - Empty: "" -> firstName="", lastName=""
 */
const splitFullName = (fullName) => {
  if (!fullName || !fullName.trim()) {
    return { firstName: '', lastName: '' };
  }

  const nameParts = fullName.trim().split(/\s+/);

  if (nameParts.length === 1) {
    // Single word name
    return { firstName: nameParts[0], lastName: '' };
  } else {
    // Multiple words: last word is lastName, rest is firstName
    const lastName = nameParts[nameParts.length - 1];
    const firstName = nameParts.slice(0, -1).join(' ');
    return { firstName, lastName };
  }
};

/**
 * KYC Form Screen
 * Complete KYC submission form with validation
 */
export default function KYCFormScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { submitKYC, resubmitKYC, submitting, error, errorType, clearError, canRetry, getRetryDelay, kycStatus } = useKYCStore();
  const { user } = useStore();

  // Form state
  const [formData, setFormData] = useState({
    // firstName: '',
    // lastName: '',
    dateOfBirth: '',
    addressLine1: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'IN', // India
    idProofType: '',
    idProofNumber: '',
    expireDate: '',
    facePhoto: null, // selfie with ID
    frontPhoto: null, // front of ID
    backPhoto: null, // back of ID
  });

  // Validation errors
  const [errors, setErrors] = useState({});

  // Dropdown visibility
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [showIdTypeDropdown, setShowIdTypeDropdown] = useState(false);

  // Pre-populate name fields from user profile
  useEffect(() => {
    if (user?.name) {
      // Name fields commented out - no longer needed
      // const { firstName, lastName } = splitFullName(user.name);
      // console.log('📝 Pre-populating KYC name from user profile:', {
      //   fullName: user.name,
      //   firstName,
      //   lastName
      // });
      // setFormData(prev => ({
      //   ...prev,
      //   firstName,
      //   lastName,
      // }));
    }
  }, [user?.name]);

  // Update form field
  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Validate PAN format (ABCDE1234F)
  const validatePAN = (pan) => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan);
  };

  // Validate Aadhar format (12 digits)
  const validateAadhar = (aadhar) => {
    const aadharRegex = /^[0-9]{12}$/;
    return aadharRegex.test(aadhar.replace(/\s/g, ''));
  };

  // Parse DD-MM-YYYY format to Date object
  const parseDateDDMMYYYY = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    const [day, month, year] = parts;
    // Month is 0-indexed in JavaScript Date
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  };

  // Convert DD-MM-YYYY to YYYY-MM-DD for backend
  const convertToISODate = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  // Validate date of birth (must be 18+)
  const validateDOB = (dob) => {
    if (!dob) return false;

    const birthDate = parseDateDDMMYYYY(dob);
    if (!birthDate || isNaN(birthDate.getTime())) return false;

    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1 >= 18;
    }

    return age >= 18;
  };

  // Validate postal code (6 digits)
  const validatePostalCode = (code) => {
    return /^[0-9]{6}$/.test(code);
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    // First Name - commented out
    // if (!formData.firstName.trim()) {
    //   newErrors.firstName = 'First name is required';
    // } else if (formData.firstName.trim().length < 2) {
    //   newErrors.firstName = 'First name must be at least 2 characters';
    // }

    // Last Name - commented out
    // if (!formData.lastName.trim()) {
    //   newErrors.lastName = 'Last name is required';
    // } else if (formData.lastName.trim().length < 2) {
    //   newErrors.lastName = 'Last name must be at least 2 characters';
    // }

    // Date of Birth
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
    } else {
      const parsedDOB = parseDateDDMMYYYY(formData.dateOfBirth);
      if (!parsedDOB || isNaN(parsedDOB.getTime())) {
        newErrors.dateOfBirth = 'Invalid date format (use DD-MM-YYYY)';
      } else if (!validateDOB(formData.dateOfBirth)) {
        newErrors.dateOfBirth = 'You must be at least 18 years old';
      }
    }

    // Address
    if (!formData.addressLine1.trim()) {
      newErrors.addressLine1 = 'Address is required';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!formData.state) {
      newErrors.state = 'State is required';
    }

    if (!formData.postalCode) {
      newErrors.postalCode = 'Postal code is required';
    } else if (!validatePostalCode(formData.postalCode)) {
      newErrors.postalCode = 'Invalid postal code (6 digits required)';
    }

    // ID Proof Type
    if (!formData.idProofType) {
      newErrors.idProofType = 'ID proof type is required';
    }

    // ID Proof Number
    if (!formData.idProofNumber.trim()) {
      newErrors.idProofNumber = 'ID proof number is required';
    } else {
      // Validate based on ID type
      if (formData.idProofType === 'PAN' && !validatePAN(formData.idProofNumber)) {
        newErrors.idProofNumber = 'Invalid PAN format (e.g., ABCDE1234F)';
      } else if (formData.idProofType === 'AADHAR' && !validateAadhar(formData.idProofNumber)) {
        newErrors.idProofNumber = 'Invalid Aadhar format (12 digits)';
      }
    }

    // Images
    if (!formData.frontPhoto) {
      newErrors.frontPhoto = 'Front of ID proof image is required';
    }

    if (!formData.backPhoto) {
      newErrors.backPhoto = 'Back of ID proof image is required';
    }

    if (!formData.facePhoto) {
      newErrors.facePhoto = 'Selfie with ID proof is required';
    }

    // Expire Date
    if (!formData.expireDate) {
      newErrors.expireDate = 'ID expire date is required';
    } else {
      const expiry = parseDateDDMMYYYY(formData.expireDate);
      const today = new Date();
      if (!expiry || isNaN(expiry.getTime())) {
        newErrors.expireDate = 'Invalid date format (use DD-MM-YYYY)';
      } else if (expiry <= today) {
        newErrors.expireDate = 'ID must not be expired';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission with enhanced error handling and retry options
  const handleSubmit = async () => {
    clearError();

    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill all required fields correctly');
      return;
    }

    try {
      const isResubmission = kycStatus?.status === 'rejected';
      console.log(isResubmission ? '🔄 Resubmitting KYC form...' : '📤 Submitting KYC form...');

      // Add fullName from user profile to formData
      // Convert dates from DD-MM-YYYY to YYYY-MM-DD for backend
      const submissionData = {
        ...formData,
        fullName: user?.name || 'Unknown User', // Use name from user profile
        dateOfBirth: convertToISODate(formData.dateOfBirth),
        expireDate: convertToISODate(formData.expireDate),
      };

      if (isResubmission) {
        await resubmitKYC(submissionData);
      } else {
        await submitKYC(submissionData);
      }

      Alert.alert(
        'KYC Submitted',
        'Your KYC application has been submitted successfully and is under review.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(tabs)/kyc-status'),
          },
        ]
      );
    } catch (err) {
      console.error('❌ KYC submission error:', err);

      // Enhanced error handling with retry options
      const errorMessage = error || err.message || 'Failed to submit KYC. Please try again.';

      // Show different options based on error type and retry availability
      const alertButtons = [];

      if (canRetry() && errorType !== 'VALIDATION') {
        alertButtons.push({
          text: 'Retry',
          onPress: () => {
            // Clear error and retry submission after delay
            clearError();
            const delay = getRetryDelay();
            setTimeout(() => {
              handleSubmit();
            }, delay);
          },
          style: 'default',
        });
      }

      alertButtons.push({
        text: 'OK',
        style: 'cancel',
      });

      Alert.alert(
        'Submission Failed',
        errorMessage,
        alertButtons
      );
    }
  };

  // Check if form is ready to submit
  const isFormReady =
    // formData.firstName &&
    // formData.lastName &&
    formData.dateOfBirth &&
    formData.addressLine1 &&
    formData.city &&
    formData.state &&
    formData.postalCode &&
    formData.country &&
    formData.idProofType &&
    formData.idProofNumber &&
    formData.expireDate &&
    formData.frontPhoto &&
    formData.backPhoto &&
    formData.facePhoto;

  // Note: Test KYC submission functionality was removed because test_images.json no longer exists.
  // To test KYC submission, use the regular form with actual images from the device.

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 68 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Complete KYC Verification
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Please provide your details to verify your identity
          </Text>
        </View>

        {/* Note: Test button removed - test_images.json no longer exists */}

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Personal Information
          </Text>

          {/* Name fields commented out */}
          {/* <Input
            label="First Name"
            value={formData.firstName}
            onChangeText={(text) => updateField('firstName', text)}
            placeholder="Enter your first name"
            error={errors.firstName}
            leftIcon={<User size={20} color={colors.textSecondary} />}
            autoCapitalize="words"
            editable={false}
          />

          <Input
            label="Last Name"
            value={formData.lastName}
            onChangeText={(text) => updateField('lastName', text)}
            placeholder="Enter your last name"
            error={errors.lastName}
            leftIcon={<User size={20} color={colors.textSecondary} />}
            autoCapitalize="words"
            editable={false}
          /> */}

          {/* Helper text for name fields */}
          {/* <Text style={[styles.helperText, { color: colors.textSecondary }]}>
            Name from your profile. This must match your government ID.
          </Text> */}

          <Input
            label="Date of Birth"
            value={formData.dateOfBirth}
            onChangeText={(text) => updateField('dateOfBirth', text)}
            placeholder="DD-MM-YYYY"
            error={errors.dateOfBirth}
            leftIcon={<Calendar size={20} color={colors.textSecondary} />}
            keyboardType="default"
            autoComplete="off"
          />
        </View>

        {/* Address */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Address
          </Text>

          <Input
            label="Address Line 1"
            value={formData.addressLine1}
            onChangeText={(text) => updateField('addressLine1', text)}
            placeholder="House/Flat No., Street"
            error={errors.addressLine1}
            leftIcon={<MapPin size={20} color={colors.textSecondary} />}
            autoComplete="off"
          />

          <Input
            label="City"
            value={formData.city}
            onChangeText={(text) => updateField('city', text)}
            placeholder="Enter city"
            error={errors.city}
            autoComplete="off"
          />

          {/* State Dropdown */}
          <View style={styles.inputWrapper}>
            <Text style={[styles.label, { color: colors.text }]}>State</Text>
            <TouchableOpacity
              style={[
                styles.dropdown,
                {
                  backgroundColor: colors.surface,
                  borderColor: errors.state ? colors.error : colors.border,
                },
              ]}
              onPress={() => setShowStateDropdown(true)}
            >
              <Text style={[styles.dropdownText, { color: formData.state ? colors.text : colors.textSecondary }]}>
                {formData.state || 'Select state'}
              </Text>
            </TouchableOpacity>
            {errors.state && (
              <Text style={[styles.errorText, { color: colors.error }]}>{errors.state}</Text>
            )}
          </View>

          <Input
            label="Postal Code"
            value={formData.postalCode}
            onChangeText={(text) => updateField('postalCode', text)}
            placeholder="6-digit postal code"
            error={errors.postalCode}
            keyboardType="numeric"
            maxLength={6}
            autoComplete="off"
          />

          <Input
            label="Country"
            value={formData.country}
            onChangeText={(text) => updateField('country', text)}
            placeholder="Country (e.g., IN)"
            error={errors.country}
            maxLength={2}
            autoCapitalize="characters"
            autoComplete="off"
          />
        </View>

        {/* ID Proof */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            ID Proof
          </Text>

          {/* ID Type Dropdown */}
          <View style={styles.inputWrapper}>
            <Text style={[styles.label, { color: colors.text }]}>ID Proof Type</Text>
            <TouchableOpacity
              style={[
                styles.dropdown,
                {
                  backgroundColor: colors.surface,
                  borderColor: errors.idProofType ? colors.error : colors.border,
                },
              ]}
              onPress={() => setShowIdTypeDropdown(!showIdTypeDropdown)}
            >
              <CreditCard size={20} color={colors.textSecondary} style={styles.dropdownIcon} />
              <Text style={[styles.dropdownText, { color: formData.idProofType ? colors.text : colors.textSecondary }]}>
                {ID_PROOF_TYPES.find(t => t.value === formData.idProofType)?.label || 'Select ID type'}
              </Text>
            </TouchableOpacity>
            {errors.idProofType && (
              <Text style={[styles.errorText, { color: colors.error }]}>{errors.idProofType}</Text>
            )}

            {/* ID Type Options */}
            {showIdTypeDropdown && (
              <View style={[styles.dropdownOptions, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {ID_PROOF_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={styles.dropdownOption}
                    onPress={() => {
                      updateField('idProofType', type.value);
                      setShowIdTypeDropdown(false);
                    }}
                  >
                    <Text style={[styles.dropdownOptionText, { color: colors.text }]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <Input
            label="ID Proof Number"
            value={formData.idProofNumber}
            onChangeText={(text) => updateField('idProofNumber', text.toUpperCase())}
            placeholder={
              formData.idProofType === 'PAN' ? 'ABCDE1234F' :
              formData.idProofType === 'AADHAR' ? '12 digits' :
              'Enter ID number'
            }
            error={errors.idProofNumber}
            autoCapitalize="characters"
            autoComplete="off"
          />

          <Input
            label="ID Expiry Date"
            value={formData.expireDate}
            onChangeText={(text) => updateField('expireDate', text)}
            placeholder="DD-MM-YYYY"
            error={errors.expireDate}
            keyboardType="default"
            autoComplete="off"
          />
        </View>

        {/* Document Upload */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Document Upload
          </Text>

          <KYCImagePicker
            label="Front of ID Proof"
            value={formData.frontPhoto}
            onChange={(base64) => updateField('frontPhoto', base64)}
            required
          />
          {errors.frontPhoto && (
            <Text style={[styles.errorText, { color: colors.error, marginTop: -12, marginBottom: 12 }]}>
              {errors.frontPhoto}
            </Text>
          )}

          <KYCImagePicker
            label="Back of ID Proof"
            value={formData.backPhoto}
            onChange={(base64) => updateField('backPhoto', base64)}
            required
          />
          {errors.backPhoto && (
            <Text style={[styles.errorText, { color: colors.error, marginTop: -12, marginBottom: 12 }]}>
              {errors.backPhoto}
            </Text>
          )}

          <KYCImagePicker
            label="Selfie with ID Proof"
            value={formData.facePhoto}
            onChange={(base64) => updateField('facePhoto', base64)}
            required
          />
          {errors.facePhoto && (
            <Text style={[styles.errorText, { color: colors.error, marginTop: -12, marginBottom: 12 }]}>
              {errors.facePhoto}
            </Text>
          )}
        </View>

        {/* Error Message with enhanced display */}
        {error && (
          <View style={[styles.errorContainer, { backgroundColor: colors.error + '20' }]}>
            <View style={styles.errorHeader}>
              <Text style={[styles.errorTitle, { color: colors.error }]}>
                Submission Error
              </Text>
              {errorType === 'NETWORK' && (
                <Text style={[styles.errorType, { color: colors.error }]}>
                  Network Issue
                </Text>
              )}
              {errorType === 'VALIDATION' && (
                <Text style={[styles.errorType, { color: colors.error }]}>
                  Validation Error
                </Text>
              )}
              {errorType === 'BACKEND' && (
                <Text style={[styles.errorType, { color: colors.error }]}>
                  Server Error
                </Text>
              )}
            </View>
            <Text style={[styles.errorMessage, { color: colors.error }]}>
              {error}
            </Text>
            {errorType === 'NETWORK' && (
              <Text style={[styles.errorSuggestion, { color: colors.textSecondary }]}>
                Check your internet connection and try again.
              </Text>
            )}
          </View>
        )}

        {/* Submit Button */}
        <Button
          variant="primary"
          onPress={handleSubmit}
          loading={submitting}
          disabled={!isFormReady || submitting}
          style={styles.submitButton}
        >
          {submitting ? 'Submitting...' : 'Submit KYC'}
        </Button>

        {/* Bottom Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* State Selection Modal */}
      <Modal
        visible={showStateDropdown}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowStateDropdown(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select State</Text>
              <TouchableOpacity onPress={() => setShowStateDropdown(false)}>
                <Text style={{ color: colors.primary, fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={INDIAN_STATES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => {
                    updateField('state', item);
                    setShowStateDropdown(false);
                  }}
                >
                  <Text style={[styles.modalOptionText, {
                    color: formData.state === item ? colors.primary : colors.text
                  }]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  helperText: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: -12,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  inputWrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    minHeight: 56,
  },
  dropdownIcon: {
    marginRight: 12,
  },
  dropdownText: {
    fontSize: 16,
    flex: 1,
  },
  dropdownOptions: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  dropdownOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  dropdownOptionText: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  errorContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorType: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.8,
  },
  errorMessage: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSuggestion: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  submitButton: {
    marginBottom: 16,
  },
  // Modal styles for State picker
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalOptionText: {
    fontSize: 16,
  },
});
