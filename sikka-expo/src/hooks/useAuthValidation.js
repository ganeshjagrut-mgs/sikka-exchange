import { useState, useCallback, useMemo } from 'react';
import { validateForm, validateEmail, validatePassword, validateConfirmPassword, validateName, validatePhone, calculatePasswordStrength } from '../utils/validation';

/**
 * Custom hook for authentication form validation
 * Handles real-time validation, form state, and error management
 */
export const useAuthValidation = (initialValues = {}) => {
  const [values, setValues] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    ...initialValues,
  });
  
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isValidating, setIsValidating] = useState(false);

  // Update a specific field value
  const setValue = useCallback((field, value) => {
    setValues(prev => {
      // Only update if value actually changed
      if (prev[field] === value) return prev;
      return {
        ...prev,
        [field]: value,
      };
    });

    // Clear error when user starts typing (only if error exists)
    setErrors(prev => {
      if (!prev[field]) return prev; // No change if no error
      return {
        ...prev,
        [field]: null,
      };
    });
  }, []);

  // Mark a field as touched
  const markFieldAsTouched = useCallback((field) => {
    setTouched(prev => ({
      ...prev,
      [field]: true,
    }));
  }, []);

  // Validate a specific field
  const validateField = useCallback((field, value, passwordValue) => {
    let validation;

    switch (field) {
      case 'email':
        validation = validateEmail(value);
        break;
      case 'password':
        validation = validatePassword(value);
        break;
      case 'confirmPassword':
        // Use passwordValue param instead of dependency
        validation = validateConfirmPassword(passwordValue, value);
        break;
      case 'name':
        validation = validateName(value);
        break;
      case 'phone':
        validation = validatePhone(value);
        break;
      default:
        validation = { isValid: true, error: null };
    }

    return validation;
  }, []);

  // Validate single field and update errors
  const validateSingleField = useCallback((field) => {
    // Use functional update to get current values without adding to dependencies
    let isValid = false;
    setValues(currentValues => {
      const validation = validateField(field, currentValues[field], currentValues.password);

      setErrors(prev => ({
        ...prev,
        [field]: validation.error,
      }));

      isValid = validation.isValid;
      return currentValues;
    });

    return isValid;
  }, [validateField]);

  // Validate entire form
  const validateAll = useCallback(() => {
    setIsValidating(true);

    // Only validate fields that have values (exclude empty strings)
    const fieldsToValidate = Object.keys(values).filter(key => {
      const value = values[key];
      return value !== undefined && value !== null && value.toString().trim().length > 0;
    });
    const formData = {};

    fieldsToValidate.forEach(field => {
      formData[field] = values[field];
    });

    const validation = validateForm(formData);

    setErrors(validation.errors);

    // Mark all fields as touched
    const touchedFields = {};
    fieldsToValidate.forEach(field => {
      touchedFields[field] = true;
    });
    setTouched(touchedFields);

    setIsValidating(false);

    return validation.isValid;
  }, [values]);

  // Handle field blur (validation on blur)
  const handleBlur = useCallback((field) => {
    markFieldAsTouched(field);

    // Only validate if field has been touched and has a value
    // Use the latest value from state without adding it to dependencies
    setValues(currentValues => {
      if (currentValues[field]) {
        validateSingleField(field);
      }
      return currentValues;
    });
  }, [markFieldAsTouched, validateSingleField]);

  // Handle field change WITHOUT real-time validation
  // Validation only happens on blur to prevent re-renders while typing
  const handleChange = useCallback((field, value) => {
    setValue(field, value);
    // No real-time validation - only validate on blur
  }, [setValue]);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  // Clear all form data
  const clearForm = useCallback(() => {
    setValues({
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      phone: '',
      ...initialValues,
    });
    setErrors({});
    setTouched({});
  }, [initialValues]);

  // Reset form to initial state
  const resetForm = useCallback(() => {
    setValues({
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      phone: '',
      ...initialValues,
    });
    setErrors({});
    setTouched({});
    setIsValidating(false);
  }, [initialValues]);

  // Get password strength for current password
  const passwordStrength = values.password ? calculatePasswordStrength(values.password) : null;

  // Check if form is valid (no errors and all required fields filled with valid values)
  const isFormValid = (() => {
    // Check if we have any validation errors
    const hasErrors = Object.values(errors).some(error => error !== null);
    if (hasErrors) return false;
    
    // Check if all fields that have values are valid
    const fieldsWithValues = Object.entries(values).filter(([key, value]) => 
      value !== undefined && value !== null && value.toString().trim().length > 0
    );
    
    if (fieldsWithValues.length === 0) return false; // No fields filled
    
    // Validate all fields that have values
    for (const [field, value] of fieldsWithValues) {
      const validation = validateField(field, value, values.password);
      if (!validation.isValid) return false;
    }
    
    return true;
  })();

  // Check if form has any values
  const hasValues = Object.values(values).some(value => value && value.trim().length > 0);

  // Get field error only if field is touched
  const getFieldError = useCallback((field) => {
    return touched[field] ? errors[field] : null;
  }, [touched, errors]);

  // Memoize the return object to prevent unnecessary re-renders
  // Only recreate when the actual state values change
  return useMemo(() => ({
    // Form state
    values,
    errors,
    touched,
    isValidating,

    // Computed state
    isFormValid,
    hasValues,
    passwordStrength,

    // Field methods
    setValue,
    setTouched: markFieldAsTouched,
    handleChange,
    handleBlur,
    getFieldError,

    // Validation methods
    validateField,
    validateSingleField,
    validateAll,

    // Form methods
    clearErrors,
    clearForm,
    resetForm,
  }), [
    values,
    errors,
    touched,
    isValidating,
    isFormValid,
    hasValues,
    passwordStrength,
    setValue,
    markFieldAsTouched,
    handleChange,
    handleBlur,
    getFieldError,
    validateField,
    validateSingleField,
    validateAll,
    clearErrors,
    clearForm,
    resetForm,
  ]);
};

export default useAuthValidation;