/**
 * Compatibility Test Suite for Firebase Auth Service
 * Validates that firebaseAuth maintains same API interface as mockAuth
 */

import { mockAuth } from './mockAuth.backup';
import { firebaseAuth } from './firebaseAuth';

// Test configuration
const TEST_CONFIG = {
  runTests: true, // Set to false to disable tests
  logLevel: 'detailed', // 'minimal' | 'detailed'
};

/**
 * Validates that two auth service objects have the same API interface
 * @param {Object} serviceA - First auth service (mockAuth)
 * @param {Object} serviceB - Second auth service (firebaseAuth)
 * @returns {Object} - Test results
 */
const validateAPICompatibility = (serviceA, serviceB) => {
  const results = {
    compatible: true,
    missingMethods: [],
    extraMethods: [],
    methodDetails: [],
  };

  // Get method names from both services
  const serviceAMethods = Object.keys(serviceA).filter(key => typeof serviceA[key] === 'function');
  const serviceBMethods = Object.keys(serviceB).filter(key => typeof serviceB[key] === 'function');

  if (TEST_CONFIG.logLevel === 'detailed') {
    console.log('🔍 API Compatibility Test Starting...');
    console.log('📋 MockAuth methods:', serviceAMethods.sort());
    console.log('📋 FirebaseAuth methods:', serviceBMethods.sort());
  }

  // Check for missing methods in firebaseAuth
  serviceAMethods.forEach(method => {
    if (!serviceBMethods.includes(method)) {
      results.compatible = false;
      results.missingMethods.push(method);
    } else {
      results.methodDetails.push({
        method,
        status: 'compatible',
        mockArity: serviceA[method].length,
        firebaseArity: serviceB[method].length,
      });
    }
  });

  // Check for extra methods in firebaseAuth
  serviceBMethods.forEach(method => {
    if (!serviceAMethods.includes(method)) {
      results.extraMethods.push(method);
      results.methodDetails.push({
        method,
        status: 'extra',
        firebaseArity: serviceB[method].length,
      });
    }
  });

  return results;
};

/**
 * Test Firebase service method signatures and basic functionality
 * @returns {Promise<Object>} - Test results
 */
const testBasicFunctionality = async () => {
  const results = {
    passed: 0,
    failed: 0,
    errors: [],
    details: [],
  };

  const tests = [
    {
      name: 'firebaseAuth.signup method exists',
      test: () => typeof firebaseAuth.signup === 'function',
    },
    {
      name: 'firebaseAuth.login method exists',
      test: () => typeof firebaseAuth.login === 'function',
    },
    {
      name: 'firebaseAuth.logout method exists',
      test: () => typeof firebaseAuth.logout === 'function',
    },
    {
      name: 'firebaseAuth.checkAuth method exists',
      test: () => typeof firebaseAuth.checkAuth === 'function',
    },
    {
      name: 'firebaseAuth.resetPassword method exists',
      test: () => typeof firebaseAuth.resetPassword === 'function',
    },
    {
      name: 'firebaseAuth.updateProfile method exists',
      test: () => typeof firebaseAuth.updateProfile === 'function',
    },
    {
      name: 'firebaseAuth.getToken method exists',
      test: () => typeof firebaseAuth.getToken === 'function',
    },
    {
      name: 'firebaseAuth.clearAllAuthData method exists',
      test: () => typeof firebaseAuth.clearAllAuthData === 'function',
    },
    {
      name: 'signup method has correct parameter count (3)',
      test: () => firebaseAuth.signup.length === 3,
    },
    {
      name: 'login method has correct parameter count (2)',
      test: () => firebaseAuth.login.length === 2,
    },
    {
      name: 'updateProfile method has correct parameter count (2)',
      test: () => firebaseAuth.updateProfile.length === 2,
    },
  ];

  for (const test of tests) {
    try {
      const passed = test.test();
      if (passed) {
        results.passed++;
        results.details.push({ name: test.name, status: 'PASS' });
      } else {
        results.failed++;
        results.details.push({ name: test.name, status: 'FAIL' });
        results.errors.push(`Test failed: ${test.name}`);
      }
    } catch (error) {
      results.failed++;
      results.details.push({ name: test.name, status: 'ERROR', error: error.message });
      results.errors.push(`Test error: ${test.name} - ${error.message}`);
    }
  }

  return results;
};

/**
 * Run comprehensive compatibility test suite
 * @returns {Promise<Object>} - Complete test results
 */
export const runCompatibilityTests = async () => {
  if (!TEST_CONFIG.runTests) {
    console.log('🚨 Compatibility tests are disabled');
    return { disabled: true };
  }

  console.log('🧪 Starting Firebase Auth Compatibility Tests...');
  
  const results = {
    timestamp: new Date().toISOString(),
    apiCompatibility: null,
    basicFunctionality: null,
    overallCompatible: false,
    summary: '',
  };

  try {
    // Test API compatibility
    results.apiCompatibility = validateAPICompatibility(mockAuth, firebaseAuth);
    
    // Test basic functionality
    results.basicFunctionality = await testBasicFunctionality();

    // Determine overall compatibility
    results.overallCompatible = results.apiCompatibility.compatible && 
                               results.basicFunctionality.failed === 0;

    // Generate summary
    if (results.overallCompatible) {
      results.summary = '✅ Firebase Auth service is fully compatible with mockAuth API';
    } else {
      const issues = [];
      if (!results.apiCompatibility.compatible) {
        issues.push(`Missing methods: ${results.apiCompatibility.missingMethods.length}`);
        issues.push(`Extra methods: ${results.apiCompatibility.extraMethods.length}`);
      }
      if (results.basicFunctionality.failed > 0) {
        issues.push(`Failed tests: ${results.basicFunctionality.failed}`);
      }
      results.summary = `❌ Compatibility issues found: ${issues.join(', ')}`;
    }

    // Log detailed results
    if (TEST_CONFIG.logLevel === 'detailed') {
      console.log('\n📊 API Compatibility Results:');
      console.log(`   Compatible: ${results.apiCompatibility.compatible}`);
      if (results.apiCompatibility.missingMethods.length > 0) {
        console.log(`   Missing methods: ${results.apiCompatibility.missingMethods.join(', ')}`);
      }
      if (results.apiCompatibility.extraMethods.length > 0) {
        console.log(`   Extra methods: ${results.apiCompatibility.extraMethods.join(', ')}`);
      }

      console.log('\n📊 Basic Functionality Results:');
      console.log(`   Passed: ${results.basicFunctionality.passed}`);
      console.log(`   Failed: ${results.basicFunctionality.failed}`);
      
      if (results.basicFunctionality.errors.length > 0) {
        console.log('   Errors:');
        results.basicFunctionality.errors.forEach(error => console.log(`     - ${error}`));
      }
    }

    console.log(`\n${results.summary}`);
    return results;

  } catch (error) {
    console.error('❌ Compatibility test suite failed:', error);
    return {
      ...results,
      error: error.message,
      overallCompatible: false,
      summary: `❌ Test suite failed: ${error.message}`,
    };
  }
};

/**
 * Quick compatibility check (minimal logging)
 * @returns {Promise<boolean>} - True if compatible
 */
export const isCompatible = async () => {
  const originalLogLevel = TEST_CONFIG.logLevel;
  TEST_CONFIG.logLevel = 'minimal';
  
  try {
    const results = await runCompatibilityTests();
    return results.overallCompatible;
  } finally {
    TEST_CONFIG.logLevel = originalLogLevel;
  }
};

/**
 * Migration helper - validates that store integration will work
 * @returns {Promise<Object>} - Migration readiness results
 */
export const validateMigrationReadiness = async () => {
  console.log('🔄 Validating migration readiness...');
  
  const results = {
    ready: false,
    issues: [],
    recommendations: [],
  };

  try {
    // Check Firebase configuration
    const { validateFirebaseConfig } = await import('../config/firebase');
    const firebaseConfigValid = validateFirebaseConfig();
    
    if (!firebaseConfigValid) {
      results.issues.push('Firebase configuration is invalid');
      results.recommendations.push('Check Firebase project configuration in firebase.js');
    }

    // Check API compatibility
    const compatibilityResults = await runCompatibilityTests();
    if (!compatibilityResults.overallCompatible) {
      results.issues.push('Firebase auth service is not API compatible');
      results.recommendations.push('Review and fix API compatibility issues');
    }

    // Check that Firebase services are available
    try {
      await firebaseAuth.checkAuth();
      console.log('✅ Firebase auth service is functional');
    } catch (error) {
      results.issues.push(`Firebase auth service test failed: ${error.message}`);
      results.recommendations.push('Check Firebase configuration and network connectivity');
    }

    results.ready = results.issues.length === 0;

    if (results.ready) {
      console.log('✅ Migration readiness: READY');
      results.recommendations.push('You can safely migrate from mockAuth to firebaseAuth');
    } else {
      console.log('❌ Migration readiness: NOT READY');
      console.log('Issues found:');
      results.issues.forEach(issue => console.log(`  - ${issue}`));
      console.log('Recommendations:');
      results.recommendations.forEach(rec => console.log(`  - ${rec}`));
    }

    return results;
  } catch (error) {
    console.error('❌ Migration readiness check failed:', error);
    return {
      ready: false,
      issues: [error.message],
      recommendations: ['Review Firebase setup and try again'],
    };
  }
};

// Auto-run compatibility tests when imported (only in development)
if (__DEV__ && TEST_CONFIG.runTests) {
  // Run tests after a short delay to avoid blocking app startup
  setTimeout(async () => {
    try {
      await runCompatibilityTests();
    } catch (error) {
      console.error('Auto compatibility test failed:', error);
    }
  }, 2000);
}

export default {
  runCompatibilityTests,
  isCompatible,
  validateMigrationReadiness,
};