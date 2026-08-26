import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  updateEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup,
  GoogleAuthProvider,
  linkWithPhoneNumber,
  PhoneAuthProvider,
  linkWithCredential,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, ensureFirebaseAuthReady } from '../config/firebase';

// Firebase Auth Token Storage Key
const FIREBASE_AUTH_TOKEN_KEY = '@sikka_firebase_auth_token';

// Simulate realistic delays for consistent UX with mockAuth
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate password strength (Firebase requires minimum 6 characters)
const isValidPassword = (password) => {
  // Firebase minimum is 6 characters, but we'll use the same validation as mockAuth
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

/**
 * Maps Firebase error codes to user-friendly messages
 * @param {string} errorCode - Firebase error code
 * @returns {string} - User-friendly error message
 */
const mapFirebaseError = (errorCode) => {
  const errorMap = {
    // Authentication errors
    'auth/user-not-found': 'No account found with this email address',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-password': 'Incorrect password. Please try again.',
    'auth/email-already-in-use': 'An account with this email already exists',
    'auth/weak-password': 'Password must be at least 6 characters long',
    'auth/invalid-email': 'Please enter a valid email address',
    'auth/user-disabled': 'This account has been temporarily disabled',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
    'auth/operation-not-allowed': 'Email/password sign-in is not enabled',
    'auth/requires-recent-login': 'Please sign in again to complete this action',
    
    // Network and configuration errors
    'auth/network-request-failed': 'Network error. Please check your connection and try again.',
    'auth/timeout': 'Request timed out. Please try again.',
    'auth/internal-error': 'An internal error occurred. Please try again.',
    'auth/invalid-api-key': 'Firebase configuration error. Please contact support.',
    'auth/app-deleted': 'Firebase configuration error. Please contact support.',
    'auth/invalid-user-token': 'Your session has expired. Please sign in again.',
    'auth/user-token-expired': 'Your session has expired. Please sign in again.',
    
    // Registration specific errors
    'auth/missing-password': 'Password is required',
    'auth/missing-email': 'Email address is required',
    'auth/invalid-credential': 'Invalid credentials. Please check your email and password.',
    
    // Password reset errors
    'auth/user-not-found': 'No account found with this email address',
    'auth/missing-continue-uri': 'Password reset configuration error. Please contact support.',
    'auth/invalid-continue-uri': 'Password reset configuration error. Please contact support.',
  };

  return errorMap[errorCode] || 'An unexpected error occurred. Please try again.';
};

/**
 * Maps Firebase user data to our application's user structure
 * @param {Object} firebaseUser - Firebase user object
 * @returns {Object} - Mapped user object compatible with existing structure
 */
const mapFirebaseUserToAppUser = (firebaseUser) => {
  if (!firebaseUser) return null;

  return {
    id: firebaseUser.uid,
    email: firebaseUser.email,
    name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
    createdAt: firebaseUser.metadata.creationTime,
    verified: firebaseUser.emailVerified,
    lastLoginAt: firebaseUser.metadata.lastSignInTime,
    // Default user profile data (same as mockAuth structure)
    avatar: firebaseUser.photoURL || null,
    phone: firebaseUser.phoneNumber || '',
    address: '',
    city: '',
    country: 'India',
    occupation: '',
    dateOfBirth: '',
    totalBalance: 0,
    availableBalance: 0,
    lockedBalance: 0,
    portfolioValue: 0,
    totalPnL: 0,
    pnlPercentage: 0,
    kycStatus: 'pending',
    twoFactorEnabled: false,
    preferences: {
      pushNotifications: true,
      emailNotifications: true,
      tradingAlerts: true,
      priceAlerts: true,
      newsUpdates: false,
      marketingEmails: false,
      soundEnabled: true,
      hapticsEnabled: true,
      analyticsEnabled: true,
      crashReporting: true,
      currency: 'INR',
      language: 'English',
      compactMode: false,
    },
  };
};

/**
 * Get Firebase auth token and store it in AsyncStorage
 * @param {Object} user - Firebase user object
 * @returns {Promise<string>} - Firebase auth token
 */
const getAndStoreAuthToken = async (user) => {
  try {
    if (!user) return null;
    
    const token = await user.getIdToken();
    await AsyncStorage.setItem(FIREBASE_AUTH_TOKEN_KEY, token);
    return token;
  } catch (error) {
    console.log('Error getting/storing auth token:', error);
    return null;
  }
};

// Firebase Auth API - maintains same interface as mockAuth
export const firebaseAuth = {
  /**
   * Sign up with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {string} name - User display name
   * @returns {Promise<Object>} - Auth result with user and token
   */
  signup: async (email, password, name) => {
    await delay(1500); // Match mockAuth delay for consistent UX
    
    // Validate inputs (same validation as mockAuth)
    if (!email || !password || !name) {
      throw new Error('All fields are required');
    }
    
    if (!isValidEmail(email)) {
      throw new Error('Please enter a valid email address');
    }
    
    if (!isValidPassword(password)) {
      throw new Error('Password must be at least 8 characters with uppercase, lowercase, and number');
    }
    
    if (name.trim().length < 2) {
      throw new Error('Name must be at least 2 characters long');
    }

    try {
      // Ensure Firebase Auth is ready before proceeding (iOS compatibility)
      await ensureFirebaseAuthReady();
      
      // Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email.toLowerCase().trim(), password);
      const firebaseUser = userCredential.user;

      // Update user profile with display name
      await updateProfile(firebaseUser, {
        displayName: name.trim()
      });

      // Get fresh user data after profile update
      await firebaseUser.reload();
      const updatedUser = auth.currentUser;

      // Get auth token and store it
      const token = await getAndStoreAuthToken(updatedUser);

      // Map Firebase user to our app structure
      const appUser = mapFirebaseUserToAppUser(updatedUser);

      console.log('🔥 Firebase Signup Success:', appUser.email);
      
      return {
        user: appUser,
        token,
      };
    } catch (error) {
      console.log('🔥 Firebase Signup Error:', error.code, error.message);
      throw new Error(mapFirebaseError(error.code));
    }
  },

  /**
   * Sign in with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} - Auth result with user and token
   */
  login: async (email, password) => {
    await delay(1200); // Match mockAuth delay
    
    // Validate inputs (same validation as mockAuth)
    if (!email || !password) {
      throw new Error('Email and password are required');
    }
    
    if (!isValidEmail(email)) {
      throw new Error('Please enter a valid email address');
    }

    try {
      // Ensure Firebase Auth is ready before proceeding (iOS compatibility)
      await ensureFirebaseAuthReady();
      
      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email.toLowerCase().trim(), password);
      const firebaseUser = userCredential.user;

      // Get auth token and store it
      const token = await getAndStoreAuthToken(firebaseUser);

      // Map Firebase user to our app structure
      const appUser = mapFirebaseUserToAppUser(firebaseUser);

      console.log('🔥 Firebase Login Success:', appUser.email);

      return {
        user: appUser,
        token,
      };
    } catch (error) {
      console.log('🔥 Firebase Login Error:', error.code, error.message);
      throw new Error(mapFirebaseError(error.code));
    }
  },

  /**
   * Sign out user
   * @returns {Promise<Object>} - Success status
   */
  logout: async () => {
    await delay(500); // Match mockAuth delay
    
    try {
      // Ensure Firebase Auth is ready before proceeding (iOS compatibility)
      await ensureFirebaseAuthReady();
      
      await signOut(auth);
      await AsyncStorage.removeItem(FIREBASE_AUTH_TOKEN_KEY);
      
      console.log('🔥 Firebase Logout Success');
      return { success: true };
    } catch (error) {
      console.log('🔥 Firebase Logout Error:', error);
      throw new Error('Failed to sign out. Please try again.');
    }
  },

  /**
   * Check if user is authenticated
   * @returns {Promise<Object>} - Authentication status with user data
   */
  checkAuth: async () => {
    try {
      console.log('🔥 FirebaseAuth: Checking authentication...');
      
      // Ensure Firebase Auth is ready before setting up listener (iOS compatibility)
      await ensureFirebaseAuthReady();
      
      return new Promise((resolve) => {
        // Set up auth state listener (will fire once immediately)
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          try {
            if (firebaseUser) {
              console.log('🔥 FirebaseAuth: User is authenticated:', firebaseUser.email);
              
              // Get auth token and store it
              const token = await getAndStoreAuthToken(firebaseUser);
              
              // Map Firebase user to our app structure
              const appUser = mapFirebaseUserToAppUser(firebaseUser);
              
              resolve({
                isAuthenticated: true,
                user: appUser,
                token,
              });
            } else {
              console.log('🔥 FirebaseAuth: User is NOT authenticated');
              await AsyncStorage.removeItem(FIREBASE_AUTH_TOKEN_KEY);
              resolve({ isAuthenticated: false });
            }
          } catch (error) {
            console.log('❌ FirebaseAuth: Error in auth state change:', error);
            resolve({ isAuthenticated: false });
          } finally {
            // Clean up the listener after first check
            unsubscribe();
          }
        });
      });
    } catch (error) {
      console.log('❌ FirebaseAuth: Error checking auth:', error);
      return { isAuthenticated: false };
    }
  },

  /**
   * Reset password via email
   * @param {string} email - User email
   * @returns {Promise<Object>} - Success status and message
   */
  resetPassword: async (email) => {
    await delay(1000); // Match mockAuth delay
    
    if (!email || !isValidEmail(email)) {
      throw new Error('Please enter a valid email address');
    }

    try {
      // Ensure Firebase Auth is ready before proceeding (iOS compatibility)
      await ensureFirebaseAuthReady();
      
      await sendPasswordResetEmail(auth, email.toLowerCase().trim());
      
      console.log('🔥 Firebase Password Reset Email Sent:', email);
      
      return {
        success: true,
        message: 'Password reset instructions sent to your email',
      };
    } catch (error) {
      console.log('🔥 Firebase Password Reset Error:', error.code, error.message);
      throw new Error(mapFirebaseError(error.code));
    }
  },

  /**
   * Update user profile
   * @param {string} userId - Firebase user ID (for compatibility with mockAuth interface)
   * @param {Object} profileData - Updated profile data
   * @returns {Promise<Object>} - Updated user data
   */
  updateProfile: async (userId, profileData) => {
    await delay(800); // Match mockAuth delay
    
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      // Update Firebase user profile (only displayName and photoURL are supported)
      const firebaseProfileUpdates = {};
      if (profileData.name) firebaseProfileUpdates.displayName = profileData.name;
      if (profileData.avatar) firebaseProfileUpdates.photoURL = profileData.avatar;
      
      if (Object.keys(firebaseProfileUpdates).length > 0) {
        await updateProfile(currentUser, firebaseProfileUpdates);
      }

      // Update email if provided (requires recent authentication)
      if (profileData.email && profileData.email !== currentUser.email) {
        await updateEmail(currentUser, profileData.email);
      }

      // Refresh user data
      await currentUser.reload();
      const updatedFirebaseUser = auth.currentUser;

      // Map updated user data
      const updatedAppUser = mapFirebaseUserToAppUser(updatedFirebaseUser);
      
      // Merge with provided profile data (for fields not supported by Firebase Auth)
      const mergedUser = {
        ...updatedAppUser,
        ...profileData, // Include additional app-specific fields
        // Preserve Firebase-managed fields
        id: updatedAppUser.id,
        email: updatedAppUser.email,
        name: updatedAppUser.name,
        verified: updatedAppUser.verified,
        createdAt: updatedAppUser.createdAt,
        lastLoginAt: updatedAppUser.lastLoginAt,
      };

      console.log('🔥 Firebase Profile Update Success');

      return {
        user: mergedUser,
      };
    } catch (error) {
      console.log('🔥 Firebase Profile Update Error:', error.code, error.message);
      throw new Error(mapFirebaseError(error.code));
    }
  },

  /**
   * Get current auth token
   * @returns {Promise<string|null>} - Current auth token
   */
  getToken: async () => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        return await currentUser.getIdToken();
      }
      
      // Fallback to stored token
      return await AsyncStorage.getItem(FIREBASE_AUTH_TOKEN_KEY);
    } catch (error) {
      console.log('Error getting Firebase token:', error);
      return null;
    }
  },

  /**
   * Clear all auth data (for development/testing)
   * @returns {Promise<Object>} - Success status
   */
  clearAllAuthData: async () => {
    try {
      console.log('🚨 Emergency: Clearing all Firebase authentication data');
      
      // Sign out if user is signed in
      if (auth.currentUser) {
        await signOut(auth);
      }
      
      // Clear stored token
      await AsyncStorage.removeItem(FIREBASE_AUTH_TOKEN_KEY);
      
      console.log('🚨 Emergency: All Firebase authentication data cleared');
      return { success: true };
    } catch (error) {
      console.log('❌ Emergency: Error clearing Firebase auth data:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Set up real-time auth state listener
   * @param {Function} callback - Callback function for auth state changes
   * @returns {Function} - Unsubscribe function
   */
  onAuthStateChanged: (callback) => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const token = await getAndStoreAuthToken(firebaseUser);
        const appUser = mapFirebaseUserToAppUser(firebaseUser);
        callback({
          isAuthenticated: true,
          user: appUser,
          token,
        });
      } else {
        await AsyncStorage.removeItem(FIREBASE_AUTH_TOKEN_KEY);
        callback({ isAuthenticated: false });
      }
    });
  },

  /**
   * Change user password (requires current password for security)
   * @param {string} currentPassword - Current password for verification
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} - Success status
   */
  changePassword: async (currentPassword, newPassword) => {
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) {
      throw new Error('User not authenticated');
    }

    if (!isValidPassword(newPassword)) {
      throw new Error('Password must be at least 8 characters with uppercase, lowercase, and number');
    }

    try {
      // Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);

      // Update password
      await updatePassword(currentUser, newPassword);

      console.log('🔥 Firebase Password Change Success');
      return { success: true };
    } catch (error) {
      console.log('🔥 Firebase Password Change Error:', error.code, error.message);
      throw new Error(mapFirebaseError(error.code));
    }
  },

  /**
   * Send email verification to current user
   * @returns {Promise<Object>} - Success status
   */
  sendVerificationEmail: async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('No user signed in');
    }

    try {
      // Send verification email with custom action URL for deep linking
      await sendEmailVerification(currentUser, {
        url: 'sikka://auth/email-verified',
        handleCodeInApp: false,
        iOS: { bundleId: 'com.sikka.crypto' },
        android: { packageName: 'com.sikka.crypto', installApp: true }
      });

      console.log('🔥 Firebase Verification Email Sent:', currentUser.email);
      return { success: true };
    } catch (error) {
      console.log('🔥 Firebase Send Verification Error:', error.code, error.message);
      throw new Error(mapFirebaseError(error.code));
    }
  },

  /**
   * Reload user data and check email verification status
   * @returns {Promise<boolean>} - Email verification status
   */
  reloadUser: async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return false;

    try {
      await currentUser.reload();
      return auth.currentUser?.emailVerified || false;
    } catch (error) {
      console.log('🔥 Firebase Reload User Error:', error);
      return false;
    }
  },

  /**
   * Initialize reCAPTCHA verifier for phone authentication
   * @param {string} containerId - ID of the container element for reCAPTCHA
   * @returns {Object} - RecaptchaVerifier instance
   */
  initializeRecaptcha: (containerId = 'recaptcha-container') => {
    try {
      console.log('🔧 Initializing reCAPTCHA with container:', containerId);

      const recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: (response) => {
          console.log('✅ reCAPTCHA verified successfully');
        },
        'expired-callback': () => {
          console.warn('⚠️ reCAPTCHA expired - please retry');
        },
        'error-callback': (error) => {
          console.error('❌ reCAPTCHA error:', error);
        }
      });

      console.log('✅ reCAPTCHA verifier initialized');
      return recaptchaVerifier;
    } catch (error) {
      console.error('❌ reCAPTCHA initialization error:', error);
      throw new Error('Failed to initialize reCAPTCHA');
    }
  },

  /**
   * Send OTP to phone number
   * @param {string} phoneNumber - Phone number with country code (e.g., +919876543210)
   * @param {Object} appVerifier - RecaptchaVerifier instance (required)
   * @returns {Promise<Object>} - Confirmation result for OTP verification
   */
  sendPhoneOTP: async (phoneNumber, appVerifier) => {
    await delay(1000);

    if (!phoneNumber) {
      throw new Error('Phone number is required');
    }

    if (!appVerifier) {
      throw new Error('reCAPTCHA verifier is required');
    }

    try {
      await ensureFirebaseAuthReady();

      // Format phone number with country code if not present
      const formattedPhone = phoneNumber.startsWith('+')
        ? phoneNumber
        : `+91${phoneNumber}`;

      console.log('📱 Sending OTP to:', formattedPhone);

      const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      console.log('✅ OTP sent successfully');

      return confirmationResult;
    } catch (error) {
      console.error('❌ Send OTP Error:', error.code, error.message);

      // User-friendly error messages
      let errorMessage = 'An unexpected error occurred. Please try again.';

      if (error.code === 'auth/invalid-phone-number') {
        errorMessage = 'Invalid phone number format';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many attempts. Please try again later.';
      } else if (error.code === 'auth/captcha-check-failed') {
        errorMessage = 'Verification failed. Please refresh and try again.';
      } else if (error.message && error.message.includes('reCAPTCHA')) {
        errorMessage = 'Verification setup failed. Please refresh and try again.';
      }

      throw new Error(errorMessage);
    }
  },

  /**
   * Verify phone OTP
   * @param {Object} confirmationResult - Confirmation result from sendPhoneOTP
   * @param {string} otp - 6-digit OTP code
   * @returns {Promise<Object>} - Auth result with user and token
   */
  verifyPhoneOTP: async (confirmationResult, otp) => {
    await delay(1000);

    if (!otp || otp.length !== 6) {
      throw new Error('Please enter a valid 6-digit OTP');
    }

    try {
      console.log('🔑 Verifying OTP...');

      const result = await confirmationResult.confirm(otp);
      const firebaseUser = result.user;

      // Get auth token and store it
      const token = await getAndStoreAuthToken(firebaseUser);

      // Map Firebase user to our app structure
      const appUser = mapFirebaseUserToAppUser(firebaseUser);

      console.log('✅ Phone verified successfully:', appUser.id);

      return {
        user: appUser,
        token,
      };
    } catch (error) {
      console.error('❌ Verify OTP Error:', error.code, error.message);
      throw new Error('Invalid OTP. Please try again.');
    }
  },

  /**
   * Send OTP to phone number for LINKING to existing account
   * Use this when an email-authenticated user needs to add phone
   * @param {string} phoneNumber - Phone number with country code (e.g., +919876543210)
   * @param {Object} appVerifier - RecaptchaVerifier instance (required)
   * @returns {Promise<Object>} - Confirmation result for OTP verification
   */
  sendPhoneOTPForLinking: async (phoneNumber, appVerifier) => {
    await delay(1000);

    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('No user signed in. Please login first.');
    }

    if (!phoneNumber) {
      throw new Error('Phone number is required');
    }

    if (!appVerifier) {
      throw new Error('reCAPTCHA verifier is required');
    }

    try {
      await ensureFirebaseAuthReady();

      // Format phone number with country code if not present
      const formattedPhone = phoneNumber.startsWith('+')
        ? phoneNumber
        : `+91${phoneNumber}`;

      console.log('📱 Sending OTP for linking to:', formattedPhone);

      // Use linkWithPhoneNumber instead of signInWithPhoneNumber
      const confirmationResult = await linkWithPhoneNumber(currentUser, formattedPhone, appVerifier);
      console.log('✅ OTP sent for linking successfully');

      return confirmationResult;
    } catch (error) {
      console.error('❌ Send OTP for Linking Error:', error.code, error.message);

      // User-friendly error messages
      let errorMessage = 'An unexpected error occurred. Please try again.';

      if (error.code === 'auth/invalid-phone-number') {
        errorMessage = 'Invalid phone number format';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many attempts. Please try again later.';
      } else if (error.code === 'auth/captcha-check-failed') {
        errorMessage = 'Verification failed. Please refresh and try again.';
      } else if (error.code === 'auth/credential-already-in-use') {
        errorMessage = 'This phone number is already linked to another account.';
      } else if (error.code === 'auth/provider-already-linked') {
        errorMessage = 'A phone number is already linked to this account.';
      } else if (error.message && error.message.includes('reCAPTCHA')) {
        errorMessage = 'Verification setup failed. Please refresh and try again.';
      }

      throw new Error(errorMessage);
    }
  },

  /**
   * Verify phone OTP and link to existing account
   * Use this after sendPhoneOTPForLinking to complete the linking
   * @param {Object} confirmationResult - Confirmation result from sendPhoneOTPForLinking
   * @param {string} otp - 6-digit OTP code
   * @returns {Promise<Object>} - Success result with updated user
   */
  linkPhoneWithCredential: async (confirmationResult, otp) => {
    await delay(1000);

    if (!otp || otp.length !== 6) {
      throw new Error('Please enter a valid 6-digit OTP');
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('No user signed in');
    }

    try {
      console.log('🔗 Linking phone to account...');

      // Verify OTP using the confirmation result
      const result = await confirmationResult.confirm(otp);
      const firebaseUser = result.user;

      // Refresh token after linking
      const token = await getAndStoreAuthToken(firebaseUser);

      // Map updated user
      const appUser = mapFirebaseUserToAppUser(firebaseUser);

      console.log('✅ Phone linked successfully:', firebaseUser.phoneNumber);

      return {
        success: true,
        user: appUser,
        token,
        phoneNumber: firebaseUser.phoneNumber,
      };
    } catch (error) {
      console.error('❌ Link Phone Error:', error.code, error.message);

      let errorMessage = 'Invalid OTP. Please try again.';

      if (error.code === 'auth/credential-already-in-use') {
        errorMessage = 'This phone number is already linked to another account.';
      } else if (error.code === 'auth/provider-already-linked') {
        errorMessage = 'A phone number is already linked to this account.';
      } else if (error.code === 'auth/invalid-verification-code') {
        errorMessage = 'Invalid OTP code. Please check and try again.';
      } else if (error.code === 'auth/code-expired') {
        errorMessage = 'OTP has expired. Please request a new code.';
      }

      throw new Error(errorMessage);
    }
  },

  /**
   * Sign in with Google
   * @returns {Promise<Object>} - Auth result with user and token
   */
  signInWithGoogle: async () => {
    await delay(1000);

    try {
      await ensureFirebaseAuthReady();

      const provider = new GoogleAuthProvider();

      // Add scopes for profile and email access
      provider.addScope('profile');
      provider.addScope('email');

      console.log('🔐 Initiating Google Sign-In...');

      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      // Get auth token and store it
      const token = await getAndStoreAuthToken(firebaseUser);

      // Map Firebase user to our app structure
      const appUser = mapFirebaseUserToAppUser(firebaseUser);

      console.log('✅ Google Sign-In successful:', appUser.email);

      return {
        user: appUser,
        token,
        authMethod: 'google',
        googleId: firebaseUser.uid,
        profilePhotoUrl: firebaseUser.photoURL,
      };
    } catch (error) {
      console.error('❌ Google Sign-In Error:', error.code, error.message);

      // Handle specific Google Sign-In errors
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Sign-in cancelled. Please try again.');
      } else if (error.code === 'auth/popup-blocked') {
        throw new Error('Popup blocked. Please enable popups for this site.');
      }

      throw new Error(mapFirebaseError(error.code) || 'Google Sign-In failed. Please try again.');
    }
  }
};

export default firebaseAuth;