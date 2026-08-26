import { create } from 'zustand'
import { firebaseAuth } from '../services/firebaseAuth'
import { backendApi } from '../services/backendApi'

// Store imports for reset on logout
import useWalletStore from './walletStore'
import useKYCStore from './kycStore'
import useTradingStore from './tradingStore'
import useBankAccountStore from './bankAccountStore'
import useTransferStore from './transferStore'
import useWithdrawalStore from './withdrawalStore'
import useMarketStore from './marketStore'

// For easy rollback: import { mockAuth as firebaseAuth } from '../services/mockAuth'

// Temporary: Remove persist to test import.meta issue
const extractBackendData = (response) => {
  if (!response) {
    return {}
  }

  if (response.data) {
    return response.data
  }

  if (response.user) {
    return response.user
  }

  return response
}

const buildCompleteUser = (defaultUser, firebaseUserData = {}, backendUserData = {}) => {
  const mergedUser = {
    ...defaultUser,
    ...firebaseUserData,
    ...backendUserData,
  }

  if (backendUserData.full_name) {
    mergedUser.name = backendUserData.full_name
  }

  if (backendUserData.phone_number) {
    mergedUser.phone = backendUserData.phone_number
  }

  if (backendUserData.email) {
    mergedUser.email = backendUserData.email
  }

  mergedUser.id = backendUserData.id ?? mergedUser.id ?? backendUserData.firebase_uid ?? firebaseUserData.id ?? firebaseUserData.uid ?? null
  mergedUser.firebase_uid = backendUserData.firebase_uid ?? firebaseUserData.firebase_uid ?? firebaseUserData.id ?? mergedUser.firebase_uid ?? null
  mergedUser.kyc_status = backendUserData.kyc_status ?? mergedUser.kyc_status
  mergedUser.kycStatus = backendUserData.kyc_status ?? mergedUser.kycStatus

  return mergedUser
}

const useStore = create(
    (set, get) => ({
      // Authentication state
      isAuthenticated: false,
      authLoading: false, // Start with loading false - only set to true during auth operations
      authError: null,
      authToken: null,
      phoneConfirmation: null, // Store phone OTP confirmation result
      recaptchaVerifier: null, // Store reCAPTCHA verifier instance
      needsPhoneVerification: false, // Flag for existing email users who need to add phone

      // User data (now managed by auth system) - null until authenticated
      user: null,
      // Default user data template (used when user is authenticated)
      defaultUser: {
        name: 'Arjun Sharma',
        email: 'arjun.sharma@email.com',
        avatar: null,
        phone: '+91 98765 43210',
        address: '1234 Tech Street, Bandra West',
        city: 'Mumbai',
        country: 'India',
        occupation: 'Software Engineer',
        dateOfBirth: '1990-05-15',
        totalBalance: 2847650,
        availableBalance: 1000000,
        lockedBalance: 47650,
        portfolioValue: 1847650,
        totalPnL: 247650,
        pnlPercentage: 15.6,
        verified: true,
        kycStatus: 'completed',
        twoFactorEnabled: true,
        preferences: {
          // Notification settings
          pushNotifications: true,
          emailNotifications: true,
          tradingAlerts: true,
          priceAlerts: true,
          newsUpdates: false,
          marketingEmails: false,
          // App settings
          soundEnabled: true,
          hapticsEnabled: true,
          analyticsEnabled: true,
          crashReporting: true,
          currency: 'INR',
          language: 'English',
          compactMode: false,
        },
      },

      // Portfolio data
      portfolio: [
        {
          id: 'bitcoin',
          name: 'Bitcoin',
          symbol: 'BTC',
          amount: 0.5847,
          value: 1247650,
          price: 2134567,
          change24h: 3.45,
          change: 3.45,
          icon: '₿',
          color: '#f7931a'
        },
        {
          id: 'ethereum',
          name: 'Ethereum',
          symbol: 'ETH',
          amount: 8.2341,
          value: 425000,
          price: 51623,
          change24h: -1.23,
          change: -1.23,
          icon: 'Ξ',
          color: '#627eea'
        },
        {
          id: 'cardano',
          name: 'Cardano',
          symbol: 'ADA',
          amount: 15420,
          value: 175000,
          price: 11.35,
          change24h: 5.67,
          change: 5.67,
          icon: '₳',
          color: '#0033ad'
        }
      ],

      // Market data
      marketData: [
        {
          id: 'bitcoin',
          name: 'Bitcoin',
          symbol: 'BTC',
          price: 2134567,
          change24h: 3.45,
          change: 3.45,
          volume: '₹45,67,89,123',
          marketCap: '₹41,23,45,67,890',
          icon: '₿',
          color: '#f7931a',
          sparkline: [2100000, 2120000, 2110000, 2134567]
        },
        {
          id: 'ethereum',
          name: 'Ethereum',
          symbol: 'ETH',
          price: 51623,
          change24h: -1.23,
          change: -1.23,
          volume: '₹23,45,67,890',
          marketCap: '₹6,78,90,12,345',
          icon: 'Ξ',
          color: '#627eea',
          sparkline: [52000, 51800, 51900, 51623]
        },
        {
          id: 'cardano',
          name: 'Cardano',
          symbol: 'ADA',
          price: 11.35,
          change24h: 5.67,
          change: 5.67,
          volume: '₹5,67,89,012',
          marketCap: '₹38,45,67,890',
          icon: '₳',
          color: '#0033ad',
          sparkline: [10.8, 11.1, 11.0, 11.35]
        },
        {
          id: 'solana',
          name: 'Solana',
          symbol: 'SOL',
          price: 3456,
          change24h: 8.92,
          change: 8.92,
          volume: '₹12,34,56,789',
          marketCap: '₹1,45,67,89,012',
          icon: '◎',
          color: '#9945ff',
          sparkline: [3200, 3350, 3400, 3456]
        },
        {
          id: 'polygon',
          name: 'Polygon',
          symbol: 'MATIC',
          price: 67.89,
          change24h: -2.34,
          change: -2.34,
          volume: '₹8,90,12,345',
          marketCap: '₹62,34,56,789',
          icon: '⬟',
          color: '#8247e5',
          sparkline: [70, 68.5, 69, 67.89]
        }
      ],

      // Trading data
      selectedCrypto: null,
      tradeType: 'buy',
      tradeAmount: '',
      loading: false,
      
      setSelectedCrypto: (crypto) => set({ selectedCrypto: crypto }),
      setTradeType: (type) => set({ tradeType: type }),
      setTradeAmount: (amount) => set({ tradeAmount: amount }),
      setLoading: (loading) => set({ loading }),
      
      executeTrade: (symbol, type, amount, price) => {
        const state = get()
        const newTransaction = {
          id: Date.now().toString(),
          type,
          crypto: symbol,
          amount: parseFloat(amount),
          price,
          total: parseFloat(amount) * price,
          date: new Date(),
          status: 'completed'
        }
        
        set({
          transactions: [newTransaction, ...state.transactions],
          tradeAmount: '',
          loading: false
        })
      },

      // Wallet data
      walletBalance: {
        inr: 1000000,
        usd: 12000,
        btc: 0.5847,
        eth: 8.2341
      },

      // Transactions
      transactions: [
        {
          id: '1',
          type: 'buy',
          crypto: 'BTC',
          amount: 0.1234,
          price: 2134567,
          total: 263456,
          date: new Date('2024-01-15T10:30:00'),
          status: 'completed'
        },
        {
          id: '2',
          type: 'sell',
          crypto: 'ETH',
          amount: 2.5,
          price: 51623,
          total: 129057,
          date: new Date('2024-01-14T15:45:00'),
          status: 'completed'
        },
        {
          id: '3',
          type: 'buy',
          crypto: 'ADA',
          amount: 5000,
          price: 11.35,
          total: 56750,
          date: new Date('2024-01-13T09:15:00'),
          status: 'pending'
        }
      ],

      // Notifications
      notifications: [
        {
          id: '1',
          title: 'Price Alert',
          message: 'Bitcoin has reached ₹21,50,000',
          type: 'success',
          read: false,
          timestamp: new Date('2024-01-15T14:30:00')
        },
        {
          id: '2',
          title: 'Trade Executed',
          message: 'Your ETH sell order has been completed',
          type: 'info',
          read: false,
          timestamp: new Date('2024-01-15T12:15:00')
        }
      ],

      // Actions
      updateUser: (userData) => set((state) => ({
        user: { ...state.user, ...userData }
      })),

      addTransaction: (transaction) => set((state) => ({
        transactions: [transaction, ...state.transactions]
      })),

      markNotificationAsRead: (id) => set((state) => ({
        notifications: state.notifications.map(notif =>
          notif.id === id ? { ...notif, read: true } : notif
        )
      })),

      // Market actions
      updateMarketData: (newData) => set({ marketData: newData }),
      
      // Portfolio actions
      updatePortfolio: (newPortfolio) => set({ portfolio: newPortfolio }),

      // Authentication Actions
      
      // Clear authentication error
      clearAuthError: () => set({ authError: null }),

      // Set phone confirmation result
      setPhoneConfirmation: (confirmation) => set({ phoneConfirmation: confirmation }),

      // Set reCAPTCHA verifier
      setRecaptchaVerifier: (verifier) => set({ recaptchaVerifier: verifier }),
      
      // Check authentication status on app start
      checkAuthStatus: async () => {
        console.log('🔍 Checking authentication status...');
        set({ authLoading: true, authError: null });

        try {
          // Step 1: Check Firebase authentication
          const authResult = await firebaseAuth.checkAuth();
          console.log('🔍 Firebase auth check result:', authResult);

          if (authResult.isAuthenticated) {
            console.log('✅ Firebase user authenticated:', authResult.user?.email);

            try {
              // Step 2: Verify token with backend and get user profile
              console.log('🔍 Verifying token with backend...');
              const backendUserResponse = await backendApi.login();
              const backendUserData = extractBackendData(backendUserResponse);
              console.log('✅ Backend verification successful:', backendUserData);

              const completeUser = buildCompleteUser(
                get().defaultUser,
                authResult.user,
                backendUserData
              );

              set({
                isAuthenticated: true,
                user: completeUser,
                authToken: authResult.token,
                authLoading: false,
                authError: null,
              });

              return true;
            } catch (backendError) {
              console.error('❌ Backend verification failed:', backendError.message);
              
              // Check if this is an auth expiration error
              if (backendError.code === 'AUTH_EXPIRED' || backendError.status === 401) {
                console.warn('🚨 Token expired during auth check, logging out...');
                // Token expired - clear auth state and redirect to login
                set({
                  isAuthenticated: false,
                  user: null,
                  authToken: null,
                  authLoading: false,
                  authError: 'Your session has expired. Please log in again.',
                });
                return false;
              }
              
              // Firebase auth succeeded but backend verification failed
              // This could mean user exists in Firebase but not in backend
              set({
                isAuthenticated: false,
                user: null,
                authToken: null,
                authLoading: false,
                authError: 'Account exists in Firebase but not in backend. Please try logging in again.',
              });
              return false;
            }
          } else {
            console.log('❌ User is NOT authenticated');
            set({
              isAuthenticated: false,
              user: null,
              authToken: null,
              authLoading: false,
              authError: null,
            });
            return false;
          }
        } catch (error) {
          console.log('❌ Auth check error:', error);
          set({
            isAuthenticated: false,
            user: null,
            authToken: null,
            authLoading: false,
            authError: error.message || 'Authentication check failed',
          });
          return false;
        }
      },
      
      // User login
      login: async (email, password) => {
        set({ authLoading: true, authError: null });

        try {
          // Step 1: Authenticate with Firebase
          console.log('🔐 Step 1 - Firebase authentication...');
          const { user: firebaseUser, token } = await firebaseAuth.login(email, password);
          console.log('✅ Step 1 - Firebase authentication successful:', firebaseUser.email);

          try {
            // Step 2: Verify token with backend and get user profile
            console.log('🔐 Step 2 - Verifying token with backend...');
            const backendUserResponse = await backendApi.login();
            const backendUserData = extractBackendData(backendUserResponse);
            console.log('✅ Step 2 - Backend verification successful:', backendUserData);

            const completeUser = buildCompleteUser(
              get().defaultUser,
              firebaseUser,
              backendUserData
            );

            set({
              isAuthenticated: true,
              user: completeUser,
              authToken: token,
              authLoading: false,
              authError: null,
            });

            console.log('✅ Login complete - User authenticated with Firebase + Backend');
            return { success: true, user: completeUser };
          } catch (backendError) {
            console.error('❌ Step 2 - Backend verification failed:', backendError.message);
            // Firebase login succeeded but backend verification failed
            set({
              isAuthenticated: false,
              user: null,
              authToken: null,
              authLoading: false,
              authError: 'Login successful but profile verification failed. Please try again.',
            });
            return { success: false, error: 'Profile verification failed' };
          }
        } catch (error) {
          console.error('❌ Login error:', error);
          set({
            isAuthenticated: false,
            user: null,
            authToken: null,
            authLoading: false,
            authError: error.message || 'Login failed',
          });

          return { success: false, error: error.message || 'Login failed' };
        }
      },
      
      // User signup
      signup: async (email, password, name) => {
        set({ authLoading: true, authError: null });

        try {
          console.log('🔐 Step 1 - Firebase signup starting...');

          // Step 1: Create user with Firebase Auth
          const { user: firebaseUser, token } = await firebaseAuth.signup(email, password, name);
          console.log('✅ Step 1 - Firebase signup successful:', firebaseUser.email);

          // Step 2: Send email verification (optional, non-blocking)
          try {
            console.log('📧 Step 2 - Sending verification email...');
            await firebaseAuth.sendVerificationEmail();
            console.log('✅ Step 2 - Verification email sent');
          } catch (emailError) {
            console.error('⚠️ Step 2 - Failed to send verification email:', emailError.message);
            // Non-blocking - continue with signup even if email fails
          }

          // Step 3: Register user in backend database
          console.log('🔐 Step 3 - Backend registration starting...');
          const backendResponse = await backendApi.registerUser({
            fullName: name,
            // phone is optional - not collected during signup
          });
          const registeredUserData = extractBackendData(backendResponse);
          console.log('✅ Step 3 - Backend registration successful:', registeredUserData);

          try {
            // Step 4: Verify token with backend and get complete user profile
            console.log('🔐 Step 4 - Verifying token with backend...');
            const backendUserResponse = await backendApi.login();
            const backendUserData = extractBackendData(backendUserResponse);
            console.log('✅ Step 4 - Backend verification successful:', backendUserData);

            const completeUser = buildCompleteUser(
              get().defaultUser,
              firebaseUser,
              backendUserData
            );

            set({
              isAuthenticated: true,
              user: completeUser,
              authToken: token,
              authLoading: false,
              authError: null,
            });

            console.log('✅ Signup complete - User registered in Firebase + Backend');
            return { success: true, user: completeUser };
          } catch (verifyError) {
            console.error('⚠️ Step 4 - Backend verification failed:', verifyError.message);
            // Registration succeeded but verification failed
            // This is unusual but not critical
            const completeUser = {
              ...get().defaultUser,
              ...firebaseUser,
              ...registeredUserData,
            };

            completeUser.id = registeredUserData?.id ?? completeUser.id ?? firebaseUser?.id ?? firebaseUser?.uid ?? null;
            completeUser.firebase_uid = registeredUserData?.firebase_uid ?? completeUser.firebase_uid ?? firebaseUser?.id ?? null;
            if (registeredUserData?.full_name) {
              completeUser.name = registeredUserData.full_name;
            }

            set({
              isAuthenticated: true,
              user: completeUser,
              authToken: token,
              authLoading: false,
              authError: 'Account created successfully. Please refresh to load full profile.',
            });

            return { success: true, user: completeUser };
          }
        } catch (error) {
          console.error('❌ Signup failed:', error.message);
          set({
            authLoading: false,
            authError: error.message || 'Signup failed',
          });

          return { success: false, error: error.message || 'Signup failed' };
        }
      },
      
      // User logout
      logout: async () => {
        set({ authLoading: true, authError: null });
        
        try {
          await firebaseAuth.logout();
          
          set({
            isAuthenticated: false,
            user: null,
            authToken: null,
            authLoading: false,
            authError: null,
          });

          // Reset all user-specific stores to prevent data leakage between accounts
          useWalletStore.getState().reset();
          useKYCStore.getState().reset();
          useTradingStore.getState().reset();
          useBankAccountStore.getState().reset();
          useTransferStore.getState().reset();
          useWithdrawalStore.getState().reset();
          useMarketStore.getState().reset();

          console.log('✅ All stores reset on logout');

          return { success: true };
        } catch (error) {
          console.log('Logout error:', error);
          set({
            authLoading: false,
            authError: error.message || 'Logout failed',
          });
          
          return { success: false, error: error.message || 'Logout failed' };
        }
      },
      
      // Update user profile (integrates with existing updateUser)
      updateUserProfile: async (profileData) => {
        const state = get();

        if (!state.isAuthenticated || !state.user) {
          return { success: false, error: 'User not authenticated' };
        }

        set({ authLoading: true, authError: null });

        try {
          // Step 1: Update Firebase profile
          console.log('🔐 Step 1 - Updating Firebase profile...');
          const { user: firebaseUpdatedUser } = await firebaseAuth.updateProfile(state.user.id, profileData);
          console.log('✅ Step 1 - Firebase profile updated');

          try {
            // Step 2: Update backend profile
            console.log('🔐 Step 2 - Updating backend profile...');
            const backendUpdatedUserResponse = await backendApi.updateUserProfile(profileData);
            const backendUpdatedUserData = extractBackendData(backendUpdatedUserResponse);
            console.log('✅ Step 2 - Backend profile updated:', backendUpdatedUserData);

            // Merge updated user data
            const mergedUser = buildCompleteUser(
              get().defaultUser,
              { ...state.user, ...firebaseUpdatedUser },
              backendUpdatedUserData
            );

            set({
              user: mergedUser,
              authLoading: false,
              authError: null,
            });

            console.log('✅ Profile update complete - Updated in Firebase + Backend');
            return { success: true, user: mergedUser };
          } catch (backendError) {
            console.error('⚠️ Step 2 - Backend update failed:', backendError.message);
            // Firebase update succeeded but backend failed
            // Still return the Firebase updated user
            const fallbackUser = buildCompleteUser(
              get().defaultUser,
              { ...state.user, ...firebaseUpdatedUser },
              state.user || {}
            );

            set({
              user: fallbackUser,
              authLoading: false,
              authError: 'Profile updated locally but sync failed. Please try again.',
            });

            return {
              success: true,
              user: fallbackUser,
              warning: 'Backend sync failed - changes may not persist',
            };
          }
        } catch (error) {
          console.error('❌ Profile update error:', error);
          set({
            authLoading: false,
            authError: error.message || 'Profile update failed',
          });

          return { success: false, error: error.message || 'Profile update failed' };
        }
      },
      
      // Emergency function to clear all authentication data (debugging)
      clearAllAuthData: async () => {
        console.log('🚨 Emergency: Clearing all authentication data');
        try {
          await firebaseAuth.clearAllAuthData();
          set({
            isAuthenticated: false,
            user: null,
            authToken: null,
            authLoading: false,
            authError: null,
          });
          console.log('🚨 Emergency: All authentication data cleared');
          return { success: true };
        } catch (error) {
          console.log('❌ Emergency: Error clearing auth data:', error);
          return { success: false, error: error.message };
        }
      },

      // Handle authentication errors (like expired tokens)
      handleAuthError: async (error) => {
        if (error.code === 'AUTH_EXPIRED' || error.status === 401 ||
            error.message?.includes('Authentication expired') ||
            error.message?.includes('token') && error.message?.includes('expired')) {
          console.warn('🚨 Auth error detected, logging out user...');

          try {
            // Clear authentication state
            set({
              isAuthenticated: false,
              user: null,
              authToken: null,
              authLoading: false,
              authError: 'Your session has expired. Please log in again.',
            });

            // Try to sign out from Firebase (non-blocking)
            firebaseAuth.logout().catch(err => console.log('Firebase logout error:', err));

            return { loggedOut: true };
          } catch (logoutError) {
            console.error('Error during auth error logout:', logoutError);
            return { loggedOut: false, error: logoutError.message };
          }
        }

        return { loggedOut: false };
      },

      // Set needs phone verification flag
      setNeedsPhoneVerification: (needs) => set({ needsPhoneVerification: needs }),

      // Phone signup flow - for new users signing up with phone as primary auth
      signupWithPhone: async (phoneConfirmation, otp, userData) => {
        set({ authLoading: true, authError: null });

        try {
          console.log('📱 Step 1 - Verifying phone OTP...');

          // Step 1: Verify OTP with Firebase (this creates/signs in the user)
          const { user: firebaseUser, token } = await firebaseAuth.verifyPhoneOTP(phoneConfirmation, otp);
          console.log('✅ Step 1 - Phone verified, Firebase user created:', firebaseUser.id);

          try {
            // Step 2: Register user in backend with phone + collected user data
            console.log('📱 Step 2 - Registering user in backend...');
            const backendResponse = await backendApi.registerUser({
              fullName: userData.fullName || userData.name || '',
              email: userData.email || '',
              phone: firebaseUser.phone || userData.phone || '',
            });
            const registeredUserData = extractBackendData(backendResponse);
            console.log('✅ Step 2 - Backend registration successful:', registeredUserData);

            // Step 3: Verify and get complete profile
            console.log('📱 Step 3 - Getting complete user profile...');
            const backendUserResponse = await backendApi.login();
            const backendUserData = extractBackendData(backendUserResponse);
            console.log('✅ Step 3 - Profile loaded:', backendUserData);

            const completeUser = buildCompleteUser(
              get().defaultUser,
              firebaseUser,
              backendUserData
            );

            set({
              isAuthenticated: true,
              user: completeUser,
              authToken: token,
              authLoading: false,
              authError: null,
              phoneConfirmation: null, // Clear confirmation after use
              needsPhoneVerification: false,
            });

            console.log('✅ Phone signup complete - User registered in Firebase + Backend');
            return { success: true, user: completeUser };
          } catch (backendError) {
            console.error('❌ Step 2/3 - Backend error:', backendError.message);

            // Phone auth succeeded but backend failed - still set authenticated
            // User can retry backend registration later
            const partialUser = buildCompleteUser(
              get().defaultUser,
              firebaseUser,
              {}
            );

            set({
              isAuthenticated: true,
              user: partialUser,
              authToken: token,
              authLoading: false,
              authError: 'Account created but profile sync failed. Please update your profile.',
              phoneConfirmation: null,
              needsPhoneVerification: false,
            });

            return { success: true, user: partialUser, warning: 'Backend sync failed' };
          }
        } catch (error) {
          console.error('❌ Phone signup failed:', error.message);
          set({
            authLoading: false,
            authError: error.message || 'Phone verification failed',
          });

          return { success: false, error: error.message || 'Phone verification failed' };
        }
      },

      // Link phone to existing email account
      linkPhone: async (phoneConfirmation, otp, phoneNumber) => {
        set({ authLoading: true, authError: null });

        try {
          console.log('🔗 Step 1 - Linking phone to account...');

          // Step 1: Link phone with Firebase
          const linkResult = await firebaseAuth.linkPhoneWithCredential(phoneConfirmation, otp);
          console.log('✅ Step 1 - Phone linked to Firebase:', linkResult.phoneNumber);

          try {
            // Step 2: Update backend with phone number
            console.log('🔗 Step 2 - Updating backend with phone...');
            const backendResponse = await backendApi.updateUserProfile({
              phone: phoneNumber || linkResult.phoneNumber
            });
            const updatedUserData = extractBackendData(backendResponse);
            console.log('✅ Step 2 - Backend updated:', updatedUserData);

            // Update local user state
            const currentUser = get().user;
            const updatedUser = {
              ...currentUser,
              phone: phoneNumber || linkResult.phoneNumber,
              ...updatedUserData,
            };

            set({
              user: updatedUser,
              authLoading: false,
              authError: null,
              phoneConfirmation: null, // Clear confirmation after use
              needsPhoneVerification: false,
            });

            console.log('✅ Phone linking complete');
            return { success: true, user: updatedUser };
          } catch (backendError) {
            console.error('⚠️ Step 2 - Backend update failed:', backendError.message);

            // Phone linked in Firebase but backend failed
            // Still mark as success since Firebase link succeeded
            const currentUser = get().user;
            const partialUser = {
              ...currentUser,
              phone: phoneNumber || linkResult.phoneNumber,
            };

            set({
              user: partialUser,
              authLoading: false,
              authError: 'Phone linked but sync failed. Please try again later.',
              phoneConfirmation: null,
              needsPhoneVerification: false,
            });

            return { success: true, user: partialUser, warning: 'Backend sync failed' };
          }
        } catch (error) {
          console.error('❌ Phone linking failed:', error.message);
          set({
            authLoading: false,
            authError: error.message || 'Phone linking failed',
          });

          return { success: false, error: error.message || 'Phone linking failed' };
        }
      },
    })
)

export { useStore }