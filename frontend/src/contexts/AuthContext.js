import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tokens, setTokens] = useState({
    accessToken: localStorage.getItem('accessToken'),
    refreshToken: localStorage.getItem('refreshToken'),
  });

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (tokens.accessToken) {
          const response = await authAPI.getMe();
          setUser(response.data.user);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // Clear invalid tokens
        logout();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      const response = await authAPI.login({ email, password });
      const { user, tokens: newTokens } = response.data.data;
      
      setUser(user);
      setTokens(newTokens);
      
      // Store tokens in localStorage
      localStorage.setItem('accessToken', newTokens.accessToken);
      localStorage.setItem('refreshToken', newTokens.refreshToken);
      
      toast.success('Login successful!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error?.message || 'Login failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      const { user, tokens: newTokens } = response.data.data;
      
      setUser(user);
      setTokens(newTokens);
      
      // Store tokens in localStorage
      localStorage.setItem('accessToken', newTokens.accessToken);
      localStorage.setItem('refreshToken', newTokens.refreshToken);
      
      toast.success('Registration successful! Please check your email to verify your account.');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error?.message || 'Registration failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      if (tokens.accessToken) {
        await authAPI.logout();
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setTokens({ accessToken: null, refreshToken: null });
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      toast.success('Logged out successfully');
    }
  };

  // Refresh token function
  const refreshToken = async () => {
    try {
      if (!tokens.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await authAPI.refreshToken({ refreshToken: tokens.refreshToken });
      const { tokens: newTokens } = response.data.data;
      
      setTokens(newTokens);
      localStorage.setItem('accessToken', newTokens.accessToken);
      localStorage.setItem('refreshToken', newTokens.refreshToken);
      
      return newTokens.accessToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
      throw error;
    }
  };

  // Forgot password function
  const forgotPassword = async (email) => {
    try {
      await authAPI.forgotPassword({ email });
      toast.success('Password reset email sent!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error?.message || 'Failed to send reset email';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Reset password function
  const resetPassword = async (token, password) => {
    try {
      await authAPI.resetPassword({ token, password });
      toast.success('Password reset successful!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error?.message || 'Password reset failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Update user profile
  const updateProfile = async (profileData) => {
    try {
      const response = await authAPI.updateProfile(profileData);
      setUser(response.data.data.user);
      toast.success('Profile updated successfully!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error?.message || 'Profile update failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Change password
  const changePassword = async (currentPassword, newPassword) => {
    try {
      await authAPI.changePassword({ currentPassword, newPassword });
      toast.success('Password changed successfully!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error?.message || 'Password change failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const value = {
    user,
    loading,
    tokens,
    login,
    register,
    logout,
    refreshToken,
    forgotPassword,
    resetPassword,
    updateProfile,
    changePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 