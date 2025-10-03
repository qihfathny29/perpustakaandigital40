import { createContext, useState, useEffect } from 'react';
import { authAPI, getToken } from '../utils/api';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedUser = localStorage.getItem('user');
      const token = getToken();

      if (storedUser && token) {
        try {
          // Verify token is still valid by fetching profile
          const response = await authAPI.getProfile();
          if (response.status === 'success') {
            setUser(JSON.parse(storedUser));
          } else {
            // Token invalid, clear storage
            authAPI.logout();
          }
        } catch (error) {
          console.error('Auth verification failed:', error);
          authAPI.logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (username, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authAPI.login(username, password);
      
      if (response.status === 'success') {
        setUser(response.data.user);
        return { success: true, user: response.data.user };
      } else {
        setError(response.message);
        return { success: false, error: response.message };
      }
    } catch (error) {
      const errorMessage = error.message || 'Login failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const register = async (username, password, role = 'student') => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authAPI.register(username, password, role);
      
      if (response.status === 'success') {
        // DON'T auto-login after register
        // User harus login manual setelah register
        authAPI.logout(); // Clear any token that might be set
        return { success: true, message: 'Registrasi berhasil' };
      } else {
        setError(response.message);
        return { success: false, error: response.message };
      }
    } catch (error) {
      const errorMessage = error.message || 'Registration failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authAPI.logout();
    setUser(null);
    setError(null);
  };

  if (loading) {
    return null; // atau tampilkan loading spinner
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      register, 
      logout, 
      loading, 
      error 
    }}>
      {children}
    </AuthContext.Provider>
  );
}