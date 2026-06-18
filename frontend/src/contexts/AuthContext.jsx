import { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

/**
 * Decodes a JWT payload (base64) without verifying the signature.
 * Used only to check the exp claim on the client side for early expiry detection.
 * The real validation always happens on the backend.
 */
function decodeJwtPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

/**
 * Returns true if the token exists and its exp claim is in the future.
 */
function isTokenValid(token) {
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) return false;
  // exp is in seconds; Date.now() is in milliseconds
  return payload.exp * 1000 > Date.now();
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  // loading = true until we've checked localStorage; prevents flash of wrong route
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('serviceiq_token');
    const savedUser = localStorage.getItem('serviceiq_user');

    if (savedToken && isTokenValid(savedToken) && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        // Corrupt stored user JSON — clear everything
        localStorage.removeItem('serviceiq_token');
        localStorage.removeItem('serviceiq_user');
      }
    } else {
      // Token missing, expired, or corrupt — clear storage
      localStorage.removeItem('serviceiq_token');
      localStorage.removeItem('serviceiq_user');
    }

    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const data = await authService.login(email, password);
    setToken(data.access_token);
    setUser(data.user);
    localStorage.setItem('serviceiq_token', data.access_token);
    localStorage.setItem('serviceiq_user', JSON.stringify(data.user));
    return data;
  };

  const register = async (userData) => {
    return await authService.register(userData);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('serviceiq_token');
    localStorage.removeItem('serviceiq_user');
  };

  const isAdmin = () => user?.role === 'admin';
  const isTechnician = () => user?.role === 'technician';

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout, isAdmin, isTechnician }}
    >
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

export default AuthContext;
