import { useStore } from '../store/useStore';

/**
 * Custom hook for authentication state and actions
 * Provides easy access to auth state and methods
 */
export const useAuth = () => {
  const {
    // Auth state
    isAuthenticated,
    authLoading,
    authError,
    user,
    
    // Auth actions
    login,
    signup,
    logout,
    clearAuthError,
    checkAuthStatus,
  } = useStore();

  return {
    // State
    isAuthenticated,
    isLoading: authLoading,
    error: authError,
    user,
    
    // Actions
    login,
    signup,
    logout,
    clearAuthError,
    checkAuthStatus,
    
    // Computed state
    isLoggedIn: isAuthenticated && !!user,
    hasError: !!authError,
  };
};

export default useAuth;