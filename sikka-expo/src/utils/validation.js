// Validation utility functions for authentication forms

// Email validation
export const validateEmail = (email) => {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }
  
  if (typeof email !== 'string') {
    return { isValid: false, error: 'Email must be a string' };
  }
  
  const trimmedEmail = email.trim();
  
  if (trimmedEmail.length === 0) {
    return { isValid: false, error: 'Email is required' };
  }
  
  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(trimmedEmail)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  if (trimmedEmail.length > 254) {
    return { isValid: false, error: 'Email is too long' };
  }
  
  return { isValid: true, error: null };
};

// Password validation
export const validatePassword = (password) => {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }
  
  if (typeof password !== 'string') {
    return { isValid: false, error: 'Password must be a string' };
  }
  
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters' };
  }
  
  if (password.length > 128) {
    return { isValid: false, error: 'Password is too long' };
  }
  
  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter' };
  }
  
  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one lowercase letter' };
  }
  
  // Check for at least one number
  if (!/\d/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one number' };
  }
  
  return { isValid: true, error: null };
};

// Confirm password validation
export const validateConfirmPassword = (password, confirmPassword) => {
  if (!confirmPassword) {
    return { isValid: false, error: 'Please confirm your password' };
  }
  
  if (password !== confirmPassword) {
    return { isValid: false, error: 'Passwords do not match' };
  }
  
  return { isValid: true, error: null };
};

// Phone validation
export const validatePhone = (phone) => {
  if (!phone) {
    return { isValid: false, error: 'Phone number is required' };
  }

  if (typeof phone !== 'string') {
    return { isValid: false, error: 'Phone number must be a string' };
  }

  const trimmedPhone = phone.trim();

  if (trimmedPhone.length === 0) {
    return { isValid: false, error: 'Phone number is required' };
  }

  // Remove all non-digit characters for validation
  const digitsOnly = trimmedPhone.replace(/\D/g, '');

  // Check if it starts with +91 or has 10-13 digits
  if (trimmedPhone.startsWith('+91')) {
    // Indian format with country code
    if (digitsOnly.length !== 12) { // +91 + 10 digits = 12 total
      return { isValid: false, error: 'Indian phone numbers must be 10 digits after +91' };
    }
  } else if (trimmedPhone.startsWith('+')) {
    // International format
    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      return { isValid: false, error: 'International phone numbers must be 10-15 digits' };
    }
  } else {
    // Assume Indian number without country code
    if (digitsOnly.length !== 10) {
      return { isValid: false, error: 'Indian phone numbers must be 10 digits' };
    }
  }

  // Check for valid phone number format
  const phoneRegex = /^(\+91[\-\s]?)?[6-9]\d{9}$|^(\+91[\-\s]?)?[6-9]\d{2}[\-\s]?\d{3}[\-\s]?\d{4}$|^(\+\d{1,3}[\-\s]?)?\d{10,15}$/;
  if (!phoneRegex.test(trimmedPhone)) {
    return { isValid: false, error: 'Please enter a valid phone number' };
  }

  return { isValid: true, error: null };
};

// Name validation
export const validateName = (name) => {
  if (!name) {
    return { isValid: false, error: 'Name is required' };
  }

  if (typeof name !== 'string') {
    return { isValid: false, error: 'Name must be a string' };
  }

  const trimmedName = name.trim();

  if (trimmedName.length === 0) {
    return { isValid: false, error: 'Name is required' };
  }

  if (trimmedName.length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters' };
  }

  if (trimmedName.length > 50) {
    return { isValid: false, error: 'Name is too long' };
  }

  // Check for valid characters (letters, spaces, hyphens, apostrophes)
  if (!/^[a-zA-Z\s'-]+$/.test(trimmedName)) {
    return { isValid: false, error: 'Name can only contain letters, spaces, hyphens, and apostrophes' };
  }

  return { isValid: true, error: null };
};

// Generic form validation
export const validateForm = (fields) => {
  const errors = {};
  let isValid = true;

  Object.entries(fields).forEach(([fieldName, fieldValue]) => {
    let validation;

    switch (fieldName) {
      case 'email':
        validation = validateEmail(fieldValue);
        break;
      case 'password':
        validation = validatePassword(fieldValue);
        break;
      case 'confirmPassword':
        validation = validateConfirmPassword(fields.password, fieldValue);
        break;
      case 'name':
        validation = validateName(fieldValue);
        break;
      case 'phone':
        validation = validatePhone(fieldValue);
        break;
      default:
        validation = { isValid: true, error: null };
    }

    if (!validation.isValid) {
      errors[fieldName] = validation.error;
      isValid = false;
    }
  });

  return { isValid, errors };
};

// Password strength calculation
export const calculatePasswordStrength = (password) => {
  if (!password || typeof password !== 'string') {
    return { strength: 0, label: 'No password', color: '#94a3b8' };
  }
  
  let score = 0;
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    numbers: /\d/.test(password),
    symbols: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    longLength: password.length >= 12,
  };
  
  // Calculate score
  Object.values(checks).forEach(check => {
    if (check) score++;
  });
  
  // Return strength level
  if (score <= 2) {
    return { strength: 1, label: 'Weak', color: '#ef4444' };
  } else if (score <= 4) {
    return { strength: 2, label: 'Medium', color: '#f59e0b' };
  } else if (score <= 5) {
    return { strength: 3, label: 'Strong', color: '#10b981' };
  } else {
    return { strength: 4, label: 'Very Strong', color: '#059669' };
  }
};

// Real-time validation (debounced)
export const createDebouncedValidator = (validator, delay = 300) => {
  let timeoutId;
  
  return (value, callback) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      const result = validator(value);
      callback(result);
    }, delay);
  };
};

export default {
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  validateName,
  validatePhone,
  validateForm,
  calculatePasswordStrength,
  createDebouncedValidator,
};