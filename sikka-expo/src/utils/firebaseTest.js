// Firebase Installation and Configuration Test
// This file tests Firebase SDK installation and configuration

import { auth, db, validateFirebaseConfig, checkFirebaseConnection } from '../config/firebase';

// Test function to validate Firebase installation
export const runFirebaseTests = async () => {
  console.log('🧪 Starting Firebase Installation Tests...');
  console.log('===================================');

  const results = {
    sdkInstalled: false,
    configValid: false,
    authInitialized: false,
    firestoreInitialized: false,
    connectionTest: false,
    errors: []
  };

  try {
    // Test 1: Check if Firebase SDK is properly imported
    console.log('📦 Test 1: Firebase SDK Import');
    if (auth && db) {
      results.sdkInstalled = true;
      console.log('✅ Firebase SDK imported successfully');
      console.log('   - Auth instance:', !!auth);
      console.log('   - Firestore instance:', !!db);
    } else {
      throw new Error('Firebase SDK import failed - auth or db is undefined');
    }

    // Test 2: Validate Firebase configuration
    console.log('\n⚙️ Test 2: Firebase Configuration');
    results.configValid = validateFirebaseConfig();
    if (results.configValid) {
      console.log('✅ Firebase configuration is valid');
    } else {
      throw new Error('Firebase configuration validation failed');
    }

    // Test 3: Check Auth initialization
    console.log('\n🔐 Test 3: Firebase Auth Initialization');
    if (auth && typeof auth.currentUser !== 'undefined') {
      results.authInitialized = true;
      console.log('✅ Firebase Auth initialized successfully');
      console.log('   - Current user:', auth.currentUser ? 'Authenticated' : 'Not authenticated');
      console.log('   - Auth ready:', !!auth);
    } else {
      throw new Error('Firebase Auth initialization failed');
    }

    // Test 4: Check Firestore initialization  
    console.log('\n🗄️ Test 4: Firestore Initialization');
    if (db && db._delegate) {
      results.firestoreInitialized = true;
      console.log('✅ Firestore initialized successfully');
      console.log('   - Database instance:', !!db);
    } else {
      throw new Error('Firestore initialization failed');
    }

    // Test 5: Connection test
    console.log('\n🌐 Test 5: Firebase Connection Test');
    const connectionResult = await checkFirebaseConnection();
    results.connectionTest = connectionResult.connected;
    
    if (connectionResult.connected) {
      console.log('✅ Firebase connection test passed');
      console.log('   - Project ID:', connectionResult.projectId);
      console.log('   - Auth ready:', connectionResult.auth);
      console.log('   - Firestore ready:', connectionResult.firestore);
    } else {
      throw new Error(`Firebase connection failed: ${connectionResult.error}`);
    }

  } catch (error) {
    console.error('❌ Firebase test error:', error);
    results.errors.push(error.message);
  }

  // Final results summary
  console.log('\n📊 Firebase Installation Test Results:');
  console.log('=====================================');
  console.log('✅ SDK Installed:', results.sdkInstalled);
  console.log('✅ Config Valid:', results.configValid);
  console.log('✅ Auth Initialized:', results.authInitialized);
  console.log('✅ Firestore Initialized:', results.firestoreInitialized);
  console.log('✅ Connection Test:', results.connectionTest);
  
  const allTestsPassed = results.sdkInstalled && 
                        results.configValid && 
                        results.authInitialized && 
                        results.firestoreInitialized && 
                        results.connectionTest;

  if (allTestsPassed) {
    console.log('\n🎉 All Firebase tests passed! Firebase is ready for authentication integration.');
  } else {
    console.log('\n❌ Some Firebase tests failed. Errors:', results.errors);
  }

  return {
    success: allTestsPassed,
    results,
    message: allTestsPassed 
      ? 'Firebase successfully installed and configured'
      : 'Firebase installation has issues that need to be resolved'
  };
};

// Quick test to verify imports work
export const quickImportTest = () => {
  try {
    console.log('🚀 Quick Firebase Import Test:');
    console.log('   - Firebase Auth:', !!auth);
    console.log('   - Firebase Firestore:', !!db);
    console.log('   - Import successful:', !!(auth && db));
    return true;
  } catch (error) {
    console.error('❌ Firebase import error:', error);
    return false;
  }
};

// Export for use in components/testing
export default {
  runFirebaseTests,
  quickImportTest
};