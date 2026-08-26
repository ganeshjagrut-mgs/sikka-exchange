import { createContext, useContext, useState } from 'react';
import { adminApi, setToken, clearToken, hasToken } from '../api/adminApi';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminApi.login(username, password);
      if (response.success) {
        setToken(response.data.token);
        setAdmin(response.data.admin);
        return true;
      }
      setError('Login failed');
      return false;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearToken();
    setAdmin(null);
  };

  const isAuthenticated = () => hasToken();

  return (
    <AuthContext.Provider value={{ admin, login, logout, isAuthenticated, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
