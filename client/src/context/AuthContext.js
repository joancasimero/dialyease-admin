import React, { createContext, useState, useContext, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = () => {
      try {
        const admin = authService.getCurrentAdmin();
        setCurrentUser(admin);
      } catch (error) {
        console.error('Error initializing auth:', error);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (userData) => {
    const data = await authService.login(userData);
    setCurrentUser(data);
    return data;
  };

  const logout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  const value = {
    currentUser,
    authToken: currentUser?.token,
    // Fixed: Only super_admin should have super admin privileges
    isSuperAdmin: currentUser?.role === 'super_admin',
    isAdmin: currentUser?.role === 'admin' || currentUser?.role === 'super_admin',
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};