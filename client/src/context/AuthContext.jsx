import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi, setAuthToken, getAuthToken } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(getAuthToken());
  const [loading, setLoading] = useState(true);
  const [demoAccounts, setDemoAccounts] = useState([]);

  // Fetch current user on mount if token exists
  useEffect(() => {
    async function initAuth() {
      if (token) {
        try {
          const res = await authApi.getMe();
          setUser(res.user);
        } catch (err) {
          console.warn('Session expired or invalid:', err);
          logout();
        }
      }
      setLoading(false);
    }
    initAuth();
  }, [token]);

  // Fetch demo accounts list
  useEffect(() => {
    async function loadDemoAccounts() {
      try {
        const res = await authApi.getDemoAccounts();
        setDemoAccounts(res.demoAccounts || []);
      } catch (err) {
        console.error('Failed to load demo accounts', err);
      }
    }
    loadDemoAccounts();
  }, []);

  const login = async (credentials) => {
    const res = await authApi.login(credentials);
    setAuthToken(res.token);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
  };

  const switchDemoUser = async (username) => {
    const account = demoAccounts.find((a) => a.username === username);
    if (!account) return;
    return await login({ username: account.username, password: account.password });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        demoAccounts,
        login,
        logout,
        switchDemoUser,
        isAdmin: user?.role === 'admin',
        isWorker: user?.role === 'worker',
      }}
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

