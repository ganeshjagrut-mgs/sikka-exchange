import { create } from 'zustand';
import backendApi from '../services/backendApi';

/**
 * Error types for better error handling
 */
const ERROR_TYPES = {
  NETWORK: 'NETWORK',
  VALIDATION: 'VALIDATION',
  BACKEND: 'BACKEND',
  UNKNOWN: 'UNKNOWN',
};

/**
 * Enhanced error messages for different scenarios
 */
const ERROR_MESSAGES = {
  NETWORK: 'Network connection failed. Please check your internet connection and try again.',
  VALIDATION: 'Please check your input data and try again.',
  BACKEND: 'Server error occurred. Please try again later.',
  SUBMISSION_FAILED: 'KYC submission failed. Please try again.',
  RESUBMISSION_FAILED: 'KYC resubmission failed. Please try again.',
  STATUS_FETCH_FAILED: 'Unable to fetch KYC status. Please try again.',
  INVALID_DATA: 'Invalid data provided. Please check your information.',
  IMAGE_UPLOAD_FAILED: 'Image upload failed. Please ensure images are valid and try again.',
  DUPLICATE_SUBMISSION: 'KYC already submitted. Please check your status.',
};

/**
 * KYC Store - Manages KYC submission and status with enhanced error handling
 */
const useKYCStore = create((set, get) => ({
  // State
  kycStatus: null,
  loading: false,
  hasLoadedOnce: false, // Track if KYC status has been fetched at least once
  error: null,
  errorType: null,
  submitting: false,
  retryCount: 0,
  lastSubmissionTime: null,
  lastFetchTime: 0, // Track last fetch time for debouncing
  previousKYCStatus: null, // Track previous status to detect changes
  lastRefreshTime: 0, // Track manual refresh time
  isManualRefresh: false, // Flag to differentiate manual vs auto refresh

  /**
   * Determine error type from error object
   * @param {Error} error - Error object
   * @returns {string} Error type
   */
  getErrorType: (error) => {
    if (!error) return ERROR_TYPES.UNKNOWN;

    // Network errors
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network') || error.message?.includes('fetch')) {
      return ERROR_TYPES.NETWORK;
    }

    // Validation errors
    if (error.code === 'VALIDATION_ERROR' || error.status === 400) {
      return ERROR_TYPES.VALIDATION;
    }

    // Backend errors
    if (error.status >= 500) {
      return ERROR_TYPES.BACKEND;
    }

    return ERROR_TYPES.UNKNOWN;
  },

  /**
   * Get user-friendly error message
   * @param {Error} error - Error object
   * @param {string} operation - Operation that failed (submit, resubmit, fetch)
   * @returns {string} User-friendly error message
   */
  getErrorMessage: (error, operation = 'operation') => {
    const errorType = get().getErrorType(error);

    switch (errorType) {
      case ERROR_TYPES.NETWORK:
        return ERROR_MESSAGES.NETWORK;
      case ERROR_TYPES.VALIDATION:
        return error.message || ERROR_MESSAGES.VALIDATION;
      case ERROR_TYPES.BACKEND:
        return ERROR_MESSAGES.BACKEND;
      default:
        switch (operation) {
          case 'submit':
            return ERROR_MESSAGES.SUBMISSION_FAILED;
          case 'resubmit':
            return ERROR_MESSAGES.RESUBMISSION_FAILED;
          case 'fetch':
            return ERROR_MESSAGES.STATUS_FETCH_FAILED;
          default:
            return error.message || 'An error occurred. Please try again.';
        }
    }
  },

  /**
   * Fetch KYC status from backend with enhanced error handling
   * @returns {Promise<Object>} KYC status data
   */
  fetchKYCStatus: async () => {
    // Prevent multiple simultaneous fetches
    const currentState = get();
    if (currentState.loading) {
      console.log('⏭️ KYC fetch already in progress, skipping...');
      return currentState.kycStatus;
    }

    // CRITICAL: Debounce to prevent infinite loops
    // Only debounce if it's NOT the first load (allows fast initial load)
    const now = Date.now();
    const lastFetchTime = currentState.lastFetchTime || 0;
    const timeSinceLastFetch = now - lastFetchTime;

    if (currentState.hasLoadedOnce && timeSinceLastFetch < 2000) {
      console.log('⏭️ KYC fetch skipped - too soon since last fetch (', timeSinceLastFetch, 'ms)');
      return currentState.kycStatus;
    }

    set({ loading: true, error: null, errorType: null, lastFetchTime: now });
    try {
      console.log('🔍 Fetching KYC status...');
      const response = await backendApi.kyc.getStatus();

      console.log('✅ KYC status fetched:', response.data);

      // Backend returns: { success: true, data: { status, kucoin_sub_account_id, ... } }
      set({
        kycStatus: response.data,
        loading: false,
        hasLoadedOnce: true, // Mark as loaded
        error: null,
        errorType: null
      });

      return response.data;
    } catch (error) {
      console.error('❌ Error fetching KYC status:', error);
      const errorType = get().getErrorType(error);
      const errorMessage = get().getErrorMessage(error, 'fetch');

      set({
        error: errorMessage,
        errorType,
        loading: false,
        hasLoadedOnce: true // Mark as loaded even on error
      });
      throw error;
    }
  },

  /**
   * Manual refresh of KYC status with change detection
   * Used by refresh buttons in UI
   * @returns {Promise<Object>} { success, changed, previousStatus, newStatus, data, error }
   */
  refreshKYCStatus: async () => {
    const currentState = get();

    // Prevent rapid refresh (minimum 2 seconds between manual refreshes)
    const now = Date.now();
    const timeSinceLastRefresh = now - currentState.lastRefreshTime;

    if (timeSinceLastRefresh < 2000) {
      console.log('⏭️ Manual refresh skipped - too soon (', timeSinceLastRefresh, 'ms)');
      return {
        success: false,
        error: 'Please wait before refreshing again',
        changed: false
      };
    }

    // Store previous status before fetching
    const previousStatus = currentState.kycStatus?.status || null;

    // Set manual refresh flag
    set({ isManualRefresh: true, lastRefreshTime: now });

    try {
      console.log('🔄 Manual KYC status refresh initiated...');
      // Fetch new status
      const newStatus = await get().fetchKYCStatus();

      // Detect if status changed
      const newStatusValue = newStatus?.status || null;
      const changed = previousStatus !== newStatusValue;

      console.log(`📊 Refresh result - Previous: ${previousStatus}, New: ${newStatusValue}, Changed: ${changed}`);

      // Update previous status
      set({
        previousKYCStatus: previousStatus,
        isManualRefresh: false
      });

      return {
        success: true,
        changed,
        previousStatus,
        newStatus: newStatusValue,
        data: newStatus
      };
    } catch (error) {
      console.error('❌ Manual refresh failed:', error);
      set({ isManualRefresh: false });
      return {
        success: false,
        error: error.message || 'Failed to refresh status',
        changed: false
      };
    }
  },

  /**
   * Submit KYC data (first time submission) with enhanced error handling and retry logic
   * @param {Object} kycData - KYC form data
   * @param {string} kycData.fullName - Full name from user profile
   * @param {string} kycData.dateOfBirth - Date of birth (YYYY-MM-DD)
   * @param {string} kycData.addressLine1 - Address line 1
   * @param {string} kycData.city - City
   * @param {string} kycData.state - State
   * @param {string} kycData.postalCode - Postal code
   * @param {string} kycData.idProofType - ID proof type (PAN/AADHAR/PASSPORT/DRIVING_LICENSE)
   * @param {string} kycData.idProofNumber - ID proof number
   * @param {string} kycData.frontPhoto - Base64 encoded ID front image
   * @param {string} kycData.backPhoto - Base64 encoded ID back image
   * @param {string} kycData.facePhoto - Base64 encoded selfie image
   * @param {string} kycData.expireDate - ID expiry date (YYYY-MM-DD)
   * @returns {Promise<Object>} KYC submission response
   */
  submitKYC: async (kycData) => {
    set({ submitting: true, error: null, errorType: null });
    try {
      console.log('📤 Submitting KYC data...');

      // Validate required fields (removed firstName/lastName - using fullName from user profile)
      if (!kycData.fullName || !kycData.dateOfBirth ||
          !kycData.addressLine1 || !kycData.city || !kycData.state ||
          !kycData.postalCode || !kycData.idProofType || !kycData.idProofNumber ||
          !kycData.frontPhoto || !kycData.backPhoto || !kycData.facePhoto ||
          !kycData.expireDate) {
        throw new Error('Missing required fields');
      }

      // Split fullName into firstName and lastName for backend compatibility
      const nameParts = kycData.fullName.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0];

      // Prepare submission data - transform to match backend API expectations
      const submissionData = {
        firstName: firstName,
        lastName: lastName,
        dateOfBirth: kycData.dateOfBirth,
        address: `${kycData.addressLine1}, ${kycData.city}, ${kycData.state}, ${kycData.postalCode}, ${kycData.country || 'IN'}`, // Backend expects string, not object
        idType: kycData.idProofType,
        idNumber: kycData.idProofNumber,
        country: kycData.country || 'IN', // Required by backend
        expireDate: kycData.expireDate,
        facePhoto: kycData.facePhoto,
        frontPhoto: kycData.frontPhoto,
        backendPhoto: kycData.backPhoto, // Fix: backend expects 'backendPhoto', not 'backPhoto'
      };

      console.log('📋 Submission data prepared (base64 images omitted from log)');
      console.log('📤 KYC Submission Payload:', {
        fullName: kycData.fullName,
        firstName: submissionData.firstName,
        lastName: submissionData.lastName,
        dateOfBirth: submissionData.dateOfBirth,
        address: submissionData.address,
        idType: submissionData.idType,
        idNumber: submissionData.idNumber,
        country: submissionData.country,
        expireDate: submissionData.expireDate,
        facePhoto: submissionData.facePhoto ? '[BASE64_IMAGE_DATA_' + submissionData.facePhoto.length + '_CHARS]' : null,
        frontPhoto: submissionData.frontPhoto ? '[BASE64_IMAGE_DATA_' + submissionData.frontPhoto.length + '_CHARS]' : null,
        backendPhoto: submissionData.backendPhoto ? '[BASE64_IMAGE_DATA_' + submissionData.backendPhoto.length + '_CHARS]' : null,
      });

      const response = await backendApi.kyc.submit(submissionData);

      console.log('✅ KYC submitted successfully:', response.data);

      set({
        kycStatus: response.data,
        submitting: false,
        error: null,
        errorType: null,
        lastSubmissionTime: new Date().toISOString(),
        retryCount: 0
      });

      return response.data;
    } catch (error) {
      console.error('❌ Error submitting KYC:', error);
      const errorType = get().getErrorType(error);
      const errorMessage = get().getErrorMessage(error, 'submit');

      set({
        error: errorMessage,
        errorType,
        submitting: false,
        retryCount: get().retryCount + 1
      });
      throw error;
    }
  },

  /**
   * Resubmit KYC data (after rejection) with enhanced error handling and retry logic
   * @param {Object} kycData - KYC form data (same structure as submitKYC)
   * @param {string} kycData.fullName - Full name from user profile
   * @param {string} kycData.dateOfBirth - Date of birth (YYYY-MM-DD)
   * @param {string} kycData.addressLine1 - Address line 1
   * @param {string} kycData.city - City
   * @param {string} kycData.state - State
   * @param {string} kycData.postalCode - Postal code
   * @param {string} kycData.idProofType - ID proof type (PAN/AADHAR/PASSPORT/DRIVING_LICENSE)
   * @param {string} kycData.idProofNumber - ID proof number
   * @param {string} kycData.frontPhoto - Base64 encoded ID front image
   * @param {string} kycData.backPhoto - Base64 encoded ID back image
   * @param {string} kycData.facePhoto - Base64 encoded selfie image
   * @param {string} kycData.expireDate - ID expiry date (YYYY-MM-DD)
   * @returns {Promise<Object>} KYC resubmission response
   */
  resubmitKYC: async (kycData) => {
    set({ submitting: true, error: null, errorType: null });
    try {
      console.log('🔄 Resubmitting KYC data...');

      // Validate required fields (removed firstName/lastName - using fullName from user profile)
      if (!kycData.fullName || !kycData.dateOfBirth ||
          !kycData.addressLine1 || !kycData.city || !kycData.state ||
          !kycData.postalCode || !kycData.idProofType || !kycData.idProofNumber ||
          !kycData.frontPhoto || !kycData.backPhoto || !kycData.facePhoto ||
          !kycData.expireDate) {
        throw new Error('Missing required fields');
      }

      // Split fullName into firstName and lastName for backend compatibility
      const nameParts = kycData.fullName.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0];

      // Prepare submission data - transform to match backend API expectations
      const submissionData = {
        firstName: firstName,
        lastName: lastName,
        dateOfBirth: kycData.dateOfBirth,
        address: `${kycData.addressLine1}, ${kycData.city}, ${kycData.state}, ${kycData.postalCode}, ${kycData.country || 'IN'}`, // Backend expects string, not object
        idType: kycData.idProofType,
        idNumber: kycData.idProofNumber,
        country: kycData.country || 'IN', // Required by backend
        expireDate: kycData.expireDate,
        facePhoto: kycData.facePhoto,
        frontPhoto: kycData.frontPhoto,
        backendPhoto: kycData.backPhoto, // Fix: backend expects 'backendPhoto', not 'backPhoto'
      };

      console.log('📋 Resubmission data prepared (base64 images omitted from log)');
      console.log('🔄 KYC Resubmission Payload:', {
        fullName: kycData.fullName,
        firstName: submissionData.firstName,
        lastName: submissionData.lastName,
        dateOfBirth: submissionData.dateOfBirth,
        address: submissionData.address,
        idType: submissionData.idType,
        idNumber: submissionData.idNumber,
        country: submissionData.country,
        expireDate: submissionData.expireDate,
        facePhoto: submissionData.facePhoto ? '[BASE64_IMAGE_DATA_' + submissionData.facePhoto.length + '_CHARS]' : null,
        frontPhoto: submissionData.frontPhoto ? '[BASE64_IMAGE_DATA_' + submissionData.frontPhoto.length + '_CHARS]' : null,
        backendPhoto: submissionData.backendPhoto ? '[BASE64_IMAGE_DATA_' + submissionData.backendPhoto.length + '_CHARS]' : null,
      });

      const response = await backendApi.kyc.resubmit(submissionData);

      console.log('✅ KYC resubmitted successfully:', response.data);

      set({
        kycStatus: response.data,
        submitting: false,
        error: null,
        errorType: null,
        lastSubmissionTime: new Date().toISOString(),
        retryCount: 0
      });

      return response.data;
    } catch (error) {
      console.error('❌ Error resubmitting KYC:', error);
      const errorType = get().getErrorType(error);
      const errorMessage = get().getErrorMessage(error, 'resubmit');

      set({
        error: errorMessage,
        errorType,
        submitting: false,
        retryCount: get().retryCount + 1
      });
      throw error;
    }
  },

  /**
   * Clear error state
   */
  clearError: () => {
    set({ error: null, errorType: null });
  },

  /**
   * Check if user can retry submission
   * @returns {boolean} Whether retry is allowed
   */
  canRetry: () => {
    const state = get();
    return state.retryCount < 3; // Allow up to 3 retries
  },

  /**
   * Get retry delay based on retry count
   * @returns {number} Delay in milliseconds
   */
  getRetryDelay: () => {
    const state = get();
    // Exponential backoff: 1s, 2s, 4s
    return Math.pow(2, state.retryCount) * 1000;
  },

  /**
   * Reset retry count
   */
  resetRetryCount: () => {
    set({ retryCount: 0 });
  },

  /**
   * Reset KYC store
   */
  reset: () => {
    set({
      kycStatus: null,
      loading: false,
      error: null,
      errorType: null,
      submitting: false,
      retryCount: 0,
      lastSubmissionTime: null,
      previousKYCStatus: null,
      lastRefreshTime: 0,
      isManualRefresh: false,
    });
  },

  /**
   * Navigation helpers
   */
  navigateToKYCStatus: () => {
    // This will be used by components to navigate to KYC status screen
    // Implementation depends on navigation setup
    console.log('Navigate to KYC status screen');
  },

  navigateToKYCForm: () => {
    // This will be used by components to navigate to KYC form
    // Implementation depends on navigation setup
    console.log('Navigate to KYC form');
  },

  /**
   * Status-based navigation helpers
   */
  getNavigationPath: () => {
    const state = get();
    if (!state.kycStatus) {
      return '/(tabs)/kyc'; // No status, go to form
    }

    switch (state.kycStatus.status) {
      case 'approved':
        return '/(tabs)/'; // Dashboard
      case 'pending':
        return '/(tabs)/kyc-status'; // Status screen
      case 'rejected':
        return '/(tabs)/kyc'; // Resubmit form
      default:
        return '/(tabs)/kyc'; // Default to form
    }
  },

  shouldRedirectToDashboard: () => {
    const state = get();
    return state.kycStatus?.status === 'approved';
  },

  shouldShowKYCModal: () => {
    const state = get();
    // Don't show modal while loading KYC status (prevents flash on app launch)
    if (state.loading) return false;
    // Show modal only if KYC is not approved
    return !state.kycStatus || state.kycStatus.status !== 'approved';
  },

  /**
   * Status-based helpers
   */
  isKYCApproved: () => {
    const state = get();
    return state.kycStatus?.status === 'approved';
  },

  isKYCRejected: () => {
    const state = get();
    return state.kycStatus?.status === 'rejected';
  },

  isKYCPending: () => {
    const state = get();
    return state.kycStatus?.status === 'pending';
  },

  canUserTrade: () => {
    const state = get();
    return state.kycStatus?.canTrade === true;
  },

  shouldShowKYCUI: () => {
    const state = get();
    return !state.kycStatus || state.kycStatus.status !== 'approved';
  },
}));

export default useKYCStore;
