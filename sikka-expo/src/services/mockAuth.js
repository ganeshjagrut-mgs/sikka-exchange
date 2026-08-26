import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock user database - simulating Firebase Auth
const MOCK_USERS_KEY = '@sikka_mock_users';
const MOCK_AUTH_TOKEN_KEY = '@sikka_auth_token';

// Simulate realistic delays for better UX
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Generate mock JWT token
const generateMockToken = (userId) => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    sub: userId,
    iat: Date.now() / 1000,
    exp: (Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    iss: 'sikka-exchange'
  }));
  const signature = btoa(`signature_${userId}_${Date.now()}`);
  
  return `${header}.${payload}.${signature}`;
};

// Parse mock JWT token
const parseMockToken = (token) => {
  try {
    if (!token || typeof token !== 'string') return null;
    
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    
    // Check if token is expired
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return null;
    }
    
    return payload;
  } catch (error) {
    console.log('Error parsing token:', error);
    return null;
  }
};

// Get mock users from storage
const getMockUsers = async () => {
  try {
    const usersData = await AsyncStorage.getItem(MOCK_USERS_KEY);
    return usersData ? JSON.parse(usersData) : {};
  } catch (error) {
    console.log('Error getting mock users:', error);
    return {};
  }
};

// Save mock users to storage
const saveMockUsers = async (users) => {
  try {
    await AsyncStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
  } catch (error) {
    console.log('Error saving mock users:', error);
  }
};

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate password strength
const isValidPassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

// Mock Firebase Auth API
export const mockAuth = {
  // Sign up with email and password
  signup: async (email, password, name) => {
    await delay(1500); // Simulate network delay
    
    // Validate inputs
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
    
    // Check if user already exists
    const users = await getMockUsers();
    const normalizedEmail = email.toLowerCase().trim();
    
    if (users[normalizedEmail]) {
      throw new Error('An account with this email already exists');
    }
    
    // Create new user
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newUser = {
      id: userId,
      email: normalizedEmail,
      name: name.trim(),
      createdAt: new Date().toISOString(),
      verified: false,
      lastLoginAt: new Date().toISOString(),
      // Default user profile data (minimal version of existing user)
      avatar: null,
      phone: '',
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
    
    // Save user
    users[normalizedEmail] = {
      ...newUser,
      passwordHash: btoa(password), // In real app, use proper hashing
    };
    
    await saveMockUsers(users);
    
    // Generate token
    const token = generateMockToken(userId);
    await AsyncStorage.setItem(MOCK_AUTH_TOKEN_KEY, token);
    
    return {
      user: newUser,
      token,
    };
  },
  
  // Sign in with email and password
  login: async (email, password) => {
    await delay(1200); // Simulate network delay
    
    // Validate inputs
    if (!email || !password) {
      throw new Error('Email and password are required');
    }
    
    if (!isValidEmail(email)) {
      throw new Error('Please enter a valid email address');
    }
    
    // Check if user exists
    const users = await getMockUsers();
    const normalizedEmail = email.toLowerCase().trim();
    const userData = users[normalizedEmail];
    
    if (!userData) {
      throw new Error('No account found with this email address');
    }
    
    // Validate password (in real app, compare hashed passwords)
    if (userData.passwordHash !== btoa(password)) {
      throw new Error('Incorrect password. Please try again.');
    }
    
    // Update last login
    userData.lastLoginAt = new Date().toISOString();
    await saveMockUsers(users);
    
    // Generate new token
    const token = generateMockToken(userData.id);
    await AsyncStorage.setItem(MOCK_AUTH_TOKEN_KEY, token);
    
    // Remove password hash from returned user data
    const { passwordHash, ...userWithoutPassword } = userData;
    
    return {
      user: userWithoutPassword,
      token,
    };
  },
  
  // Sign out
  logout: async () => {
    await delay(500); // Simulate network delay
    
    try {
      await AsyncStorage.removeItem(MOCK_AUTH_TOKEN_KEY);
      return { success: true };
    } catch (error) {
      console.log('Error during logout:', error);
      throw new Error('Failed to sign out. Please try again.');
    }
  },
  
  // Check if user is authenticated
  checkAuth: async () => {
    try {
      console.log('🔐 MockAuth: Checking authentication...');
      const token = await AsyncStorage.getItem(MOCK_AUTH_TOKEN_KEY);
      console.log('🔐 MockAuth: Token from storage:', token ? 'EXISTS' : 'NOT_FOUND');
      
      if (!token) {
        console.log('🔐 MockAuth: No token found - not authenticated');
        return { isAuthenticated: false };
      }
      
      const tokenData = parseMockToken(token);
      console.log('🔐 MockAuth: Token data:', tokenData ? 'VALID' : 'INVALID');
      
      if (!tokenData) {
        console.log('🔐 MockAuth: Invalid token - removing and returning not authenticated');
        await AsyncStorage.removeItem(MOCK_AUTH_TOKEN_KEY);
        return { isAuthenticated: false };
      }
      
      // Get user data
      const users = await getMockUsers();
      const user = Object.values(users).find(u => u.id === tokenData.sub);
      console.log('🔐 MockAuth: User found:', user ? user.email : 'NOT_FOUND');
      
      if (!user) {
        console.log('🔐 MockAuth: User not found - removing token and returning not authenticated');
        await AsyncStorage.removeItem(MOCK_AUTH_TOKEN_KEY);
        return { isAuthenticated: false };
      }
      
      // Remove password hash from returned user data
      const { passwordHash, ...userWithoutPassword } = user;
      
      console.log('🔐 MockAuth: Authentication successful for:', userWithoutPassword.email);
      return {
        isAuthenticated: true,
        user: userWithoutPassword,
        token,
      };
    } catch (error) {
      console.log('❌ MockAuth: Error checking auth:', error);
      return { isAuthenticated: false };
    }
  },
  
  // Reset password (mock)
  resetPassword: async (email) => {
    await delay(1000);
    
    if (!email || !isValidEmail(email)) {
      throw new Error('Please enter a valid email address');
    }
    
    const users = await getMockUsers();
    const normalizedEmail = email.toLowerCase().trim();
    
    if (!users[normalizedEmail]) {
      throw new Error('No account found with this email address');
    }
    
    // In real app, would send password reset email
    return {
      success: true,
      message: 'Password reset instructions sent to your email',
    };
  },
  
  // Update user profile
  updateProfile: async (userId, profileData) => {
    await delay(800);
    
    const users = await getMockUsers();
    const userEntry = Object.entries(users).find(([_, user]) => user.id === userId);
    
    if (!userEntry) {
      throw new Error('User not found');
    }
    
    const [email, userData] = userEntry;
    
    // Update user data
    users[email] = {
      ...userData,
      ...profileData,
      updatedAt: new Date().toISOString(),
    };
    
    await saveMockUsers(users);
    
    // Remove password hash from returned user data
    const { passwordHash, ...userWithoutPassword } = users[email];
    
    return {
      user: userWithoutPassword,
    };
  },
  
  // Get current auth token
  getToken: async () => {
    try {
      return await AsyncStorage.getItem(MOCK_AUTH_TOKEN_KEY);
    } catch (error) {
      console.log('Error getting token:', error);
      return null;
    }
  },
  
  // Clear all auth data (for development/testing)
  clearAllAuthData: async () => {
    try {
      await AsyncStorage.removeItem(MOCK_USERS_KEY);
      await AsyncStorage.removeItem(MOCK_AUTH_TOKEN_KEY);
      return { success: true };
    } catch (error) {
      console.log('Error clearing auth data:', error);
      return { success: false };
    }
  }
};

export default mockAuth;