import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '@/services/api';

interface User {
  _id: string;
  id: string;
  name: string;
  email: string;
  designation?: string;
  phone?: string;
  role: string;
  customerId?: string; // For customer role users
  permissions: {
    canInitiateDigiLocker: boolean;
    canViewReports: boolean;
    canManageCases: boolean;
    canAccessSettings: boolean;
  };
  isActive: boolean;
  lastLogin?: string;
  createdAt?: string;
  passwordChangedAt?: string;
  passwordExpiresAt?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string; otpRequired?: boolean; email?: string }>;
  verifyOtp: (email: string, otp: string) => Promise<{ success: boolean; message?: string; passwordResetRequired?: boolean; resetToken?: string }>;
  resendOtp: (email: string) => Promise<{ success: boolean; message?: string; retryInSec?: number }>;
  forceResetPassword: (newPassword: string, resetToken: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateUser: (updatedUser: User) => void;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string; otpRequired?: boolean; email?: string }> => {
    try {
      setLoading(true);

      // Fetch client public IP for customer IP whitelist validation
      let clientIp: string | undefined;
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        clientIp = ipData.ip;
      } catch {
        // If IP fetch fails, proceed without it — backend will fall back to req.ip
      }

      const response = await apiService.login(email, password, clientIp);

      if (response.success && response.data?.otpRequired) {
        return { success: true, otpRequired: true, email: response.data.email };
      }

      return {
        success: false,
        message: response.message || 'Login failed'
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection and try again.'
      };
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (email: string, otp: string): Promise<{ success: boolean; message?: string; passwordResetRequired?: boolean; resetToken?: string }> => {
    try {
      setLoading(true);
      const response = await apiService.verifyLoginOtp(email, otp);

      if (response.success && response.data) {
        const data = response.data;
        if ('passwordResetRequired' in data && data.passwordResetRequired && data.resetToken) {
          return {
            success: true,
            passwordResetRequired: true,
            resetToken: data.resetToken,
            message: response.message
          };
        }
        if ('token' in data && data.token && data.user) {
          setToken(data.token);
          setUser(data.user);
          localStorage.setItem('auth_token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          return { success: true };
        }
      }

      return {
        success: false,
        message: response.message || 'OTP verification failed'
      };
    } catch (error) {
      console.error('OTP verify error:', error);
      return {
        success: false,
        message: 'Network error. Please try again.'
      };
    } finally {
      setLoading(false);
    }
  };

  const forceResetPassword = async (newPassword: string, resetToken: string): Promise<{ success: boolean; message?: string }> => {
    try {
      setLoading(true);
      const response = await apiService.forceResetPassword(newPassword, resetToken);
      if (response.success && response.data?.token && response.data?.user) {
        const { token: authToken, user: userData } = response.data;
        setToken(authToken);
        setUser(userData);
        localStorage.setItem('auth_token', authToken);
        localStorage.setItem('user', JSON.stringify(userData));
        return { success: true };
      }
      return {
        success: false,
        message: response.message || 'Could not reset password'
      };
    } catch (error: any) {
      console.error('Force reset error:', error);
      return {
        success: false,
        message: error?.message || 'Network error. Please try again.'
      };
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async (email: string): Promise<{ success: boolean; message?: string; retryInSec?: number }> => {
    try {
      const response = await apiService.resendLoginOtp(email);
      if (response.success) {
        return { success: true, message: response.message };
      }
      return {
        success: false,
        message: response.message || 'Could not resend OTP',
        retryInSec: response.data?.retryInSec
      };
    } catch (error) {
      console.error('OTP resend error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const logout = async () => {
    try {
      // Call backend logout endpoint if we have a token
      if (token) {
        await apiService.logout();
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Continue with local logout even if backend call fails
    } finally {
      // Clear local storage and state
      setUser(null);
      setToken(null);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    verifyOtp,
    resendOtp,
    forceResetPassword,
    logout,
    updateUser,
    loading,
    isAuthenticated: !!user && !!token
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};