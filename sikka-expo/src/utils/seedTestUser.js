import { mockAuth } from '../services/mockAuth';

/**
 * Seeds test user for development and testing
 * Only runs if no users exist or if explicitly requested
 */
export const seedTestUser = async (force = false) => {
  try {
    console.log('🌱 Checking if test user needs to be seeded...');
    
    // Try to login with test credentials first
    if (!force) {
      try {
        const result = await mockAuth.login('test@example.com', 'Password123');
        console.log('✅ Test user already exists:', result.user.email);
        return result;
      } catch (e) {
        console.log('ℹ️ Test user does not exist, creating...');
      }
    }
    
    // Create test user
    const signupResult = await mockAuth.signup(
      'test@example.com',
      'Password123',
      'Test User'
    );
    
    console.log('✅ Test user seeded successfully:', signupResult.user.email);
    console.log('🔑 Credentials: test@example.com / Password123');
    
    return signupResult;
    
  } catch (error) {
    console.log('❌ Error seeding test user:', error.message);
    
    // If user already exists, try to login
    if (error.message.includes('already exists')) {
      try {
        const loginResult = await mockAuth.login('test@example.com', 'Password123');
        console.log('✅ Test user already exists, login successful');
        return loginResult;
      } catch (loginError) {
        console.log('❌ Login failed for existing user:', loginError.message);
        throw loginError;
      }
    }
    
    throw error;
  }
};

/**
 * Seeds additional demo users for testing
 */
export const seedDemoUsers = async () => {
  const demoUsers = [
    {
      email: 'demo@sikka.com',
      password: 'Demo123!',
      name: 'Demo User'
    },
    {
      email: 'arjun.sharma@example.com',
      password: 'Arjun123!',
      name: 'Arjun Sharma'
    }
  ];
  
  const results = [];
  
  for (const user of demoUsers) {
    try {
      // Try login first
      try {
        const result = await mockAuth.login(user.email, user.password);
        console.log(`✅ Demo user ${user.email} already exists`);
        results.push(result);
        continue;
      } catch (e) {
        // User doesn't exist, create them
      }
      
      const result = await mockAuth.signup(user.email, user.password, user.name);
      console.log(`✅ Demo user ${user.email} created`);
      results.push(result);
      
    } catch (error) {
      console.log(`❌ Error with demo user ${user.email}:`, error.message);
    }
  }
  
  return results;
};

/**
 * Development helper to clear all auth data and reseed
 */
export const reseedAuthData = async () => {
  try {
    console.log('🚨 Clearing all auth data...');
    await mockAuth.clearAllAuthData();
    
    console.log('🌱 Reseeding test users...');
    await seedTestUser(true);
    await seedDemoUsers();
    
    console.log('✅ Auth data reseeded successfully');
    
  } catch (error) {
    console.log('❌ Error reseeding auth data:', error.message);
    throw error;
  }
};

export default seedTestUser;