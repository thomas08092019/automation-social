import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, AuthResponse, LoginRequest, RegisterRequest, SocialAccount } from '../types';
import apiService from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  socialLogin: (provider: string, accessToken: string, email: string, username: string, providerId: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  connectedAccounts: SocialAccount[];
  refreshConnectedAccounts: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectedAccounts, setConnectedAccounts] = useState<SocialAccount[]>([]);

  const isAuthenticated = !!user;

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const savedUser = localStorage.getItem('user');

        if (token && savedUser) {
          setUser(JSON.parse(savedUser));
          // Validate token by fetching fresh profile
          await refreshProfile();
          await refreshConnectedAccounts();
        }
      } catch (error) {
        console.error('Failed to load user:', error);
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (credentials: LoginRequest) => {
    try {
      const response: AuthResponse = await apiService.login(credentials);
      
      // Store token and user data
      localStorage.setItem('access_token', response.accessToken);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      setUser(response.user);
      await refreshConnectedAccounts();
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (userData: RegisterRequest) => {
    try {
      const response: AuthResponse = await apiService.register(userData);
      
      // Store token and user data
      localStorage.setItem('access_token', response.accessToken);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      setUser(response.user);
      await refreshConnectedAccounts();
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setUser(null);
    setConnectedAccounts([]);
  };

  const refreshProfile = async () => {
    try {
      const freshUser = await apiService.getProfile();
      localStorage.setItem('user', JSON.stringify(freshUser));
      setUser(freshUser);
    } catch (error) {
      console.error('Failed to refresh profile:', error);
      throw error;
    }
  };

  const socialLogin = async (provider: string, accessToken: string, email: string, username: string, providerId: string) => {
    try {
      const response: AuthResponse = await apiService.socialLogin({
        provider,
        accessToken,
        email,
        username,
        providerId,
      });
      
      // Store token and user data
      localStorage.setItem('access_token', response.accessToken);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      setUser(response.user);
      await refreshConnectedAccounts();
    } catch (error) {
      console.error('Social login failed:', error);
      throw error;
    }
  };

  const forgotPassword = async (email: string) => {
    await apiService.forgotPassword({ email });
  };

  const resetPassword = async (token: string, password: string) => {
    await apiService.resetPassword({ token, password });
  };

  const refreshConnectedAccounts = async () => {
    try {
      if (isAuthenticated) {
        const accounts = await apiService.getSocialAccounts();
        setConnectedAccounts(accounts);
      }
    } catch (error) {
      console.error('Failed to fetch connected accounts:', error);
      // Don't throw error here as it's a background operation
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshProfile,
    socialLogin,
    forgotPassword,
    resetPassword,
    connectedAccounts,
    refreshConnectedAccounts,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
