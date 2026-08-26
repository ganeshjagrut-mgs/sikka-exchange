// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Get Firebase configuration from environment variables
// This allows different configs for local/dev/prod environments
const getFirebaseConfig = () => {
  // Try to get from expo-constants extra config first (for EAS builds)
  const extra = Constants.expoConfig?.extra || {};

  return {
    apiKey: extra.EXPO_PUBLIC_FIREBASE_API_KEY || process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: extra.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: extra.EXPO_PUBLIC_FIREBASE_PROJECT_ID || process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: extra.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: extra.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: extra.EXPO_PUBLIC_FIREBASE_APP_ID || process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    measurementId: extra.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
  };
};

const firebaseConfig = getFirebaseConfig();

// Validate Firebase config (but don't throw - just warn)
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('❌ Firebase configuration is missing required fields');
  console.error('Make sure .env file is present with all EXPO_PUBLIC_FIREBASE_* variables');
  console.warn('⚠️ Firebase will not work without proper configuration');
}

console.log('🔥 Firebase Config loaded:', {
  projectId: firebaseConfig.projectId,
  env: process.env.EXPO_PUBLIC_ENV || 'unknown'
});

// Initialize Firebase with error handling
let app;
let auth;

try {
  app = initializeApp(firebaseConfig);
  console.log('✅ Firebase app initialized');
} catch (error) {
  console.error('❌ Firebase app initialization error:', error.message);
  // Create a dummy app object to prevent crashes
  app = null;
}

// Initialize Firebase Authentication with proper React Native persistence
// This ensures auth state persists across app sessions using AsyncStorage

// Platform-specific initialization to resolve iOS AsyncStorage issues
if (!app) {
  console.error('❌ Cannot initialize Firebase Auth - app is null');
  auth = null;
} else if (Platform.OS === 'web') {
  // For web, use standard getAuth
  try {
    auth = getAuth(app);
    console.log('🔥 Firebase Auth initialized for web platform');
  } catch (error) {
    console.error('❌ Firebase Auth (web) initialization error:', error.message);
    auth = null;
  }
} else {
  // For React Native (iOS/Android), use initializeAuth with AsyncStorage persistence
  try {
    // Ensure AsyncStorage is properly initialized before Firebase auth
    if (!AsyncStorage) {
      throw new Error('AsyncStorage is not available');
    }

    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
    console.log('🔥 Firebase Auth initialized with AsyncStorage persistence for React Native');
  } catch (error) {
    // If auth is already initialized, get the existing instance
    if (error.code === 'auth/already-initialized') {
      console.log('🔥 Firebase Auth already initialized, getting existing instance');
      try {
        auth = getAuth(app);
      } catch (e) {
        console.error('❌ Failed to get existing auth instance:', e.message);
        auth = null;
      }
    } else {
      console.error('❌ Firebase Auth initialization error:', error.message);
      // Fallback to standard auth without persistence
      try {
        console.log('🔥 Falling back to standard Firebase Auth (no persistence)');
        auth = getAuth(app);
      } catch (e) {
        console.error('❌ Fallback Firebase Auth also failed:', e.message);
        auth = null;
      }
    }
  }
}

// Verify auth is properly initialized (but don't throw)
if (!auth) {
  console.error('❌ Firebase Auth initialization failed completely');
  console.warn('⚠️ Authentication features will not work');
} else {
  console.log('✅ Firebase Auth is ready:', !!auth);
  console.log('✅ Platform:', Platform.OS);
  console.log('✅ AsyncStorage available:', !!AsyncStorage);
}

// Initialize Cloud Firestore
let db;
try {
  if (app) {
    db = getFirestore(app);
    console.log('✅ Firestore initialized');
  } else {
    console.error('❌ Cannot initialize Firestore - app is null');
    db = null;
  }
} catch (error) {
  console.error('❌ Firestore initialization error:', error.message);
  db = null;
}

// Export the authentication and database instances
export { auth, db };
export default app;

// Export Firebase app instance for any additional configurations
export const firebaseApp = app;

// Configuration validation helper
export const validateFirebaseConfig = () => {
  const requiredFields = [
    'apiKey',
    'authDomain', 
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId'
  ];
  
  const missingFields = requiredFields.filter(field => !firebaseConfig[field]);
  
  if (missingFields.length > 0) {
    console.error('Firebase Configuration Error: Missing required fields:', missingFields);
    return false;
  }
  
  console.log('✅ Firebase configuration validated successfully');
  console.log('🔥 Firebase project:', firebaseConfig.projectId);
  return true;
};

// Firebase Auth Readiness Check for iOS Compatibility
let authReadyPromise = null;

// Ensure Firebase Auth is fully initialized before use
export const ensureFirebaseAuthReady = async () => {
  if (authReadyPromise) {
    return authReadyPromise;
  }

  authReadyPromise = new Promise(async (resolve, reject) => {
    try {
      // Wait a brief moment for AsyncStorage to be fully available on React Native
      if (Platform.OS !== 'web') {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Verify auth instance is available
      if (!auth) {
        throw new Error('Firebase auth is not initialized');
      }

      // Test auth instance by checking its configuration
      const authSettings = auth.config;
      if (!authSettings) {
        throw new Error('Firebase auth config is not available');
      }

      console.log('✅ Firebase Auth readiness check passed');
      resolve(auth);
    } catch (error) {
      console.error('❌ Firebase Auth readiness check failed:', error);
      reject(error);
    }
  });

  return authReadyPromise;
};

// Helper to check Firebase connection status
export const checkFirebaseConnection = async () => {
  try {
    // Ensure auth is ready first
    await ensureFirebaseAuthReady();
    
    // This will throw an error if Firebase is not properly configured
    const testAuth = getAuth(app);
    console.log('🔥 Firebase Auth initialized:', !!testAuth);
    
    const testDb = getFirestore(app);
    console.log('🔥 Firestore initialized:', !!testDb);
    
    return {
      connected: true,
      auth: !!testAuth,
      firestore: !!testDb,
      projectId: firebaseConfig.projectId,
      platform: Platform.OS,
      asyncStorageAvailable: !!AsyncStorage
    };
  } catch (error) {
    console.error('❌ Firebase connection check failed:', error);
    return {
      connected: false,
      error: error.message,
      platform: Platform.OS,
      asyncStorageAvailable: !!AsyncStorage
    };
  }
};