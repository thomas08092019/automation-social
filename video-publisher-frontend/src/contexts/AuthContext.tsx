import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, AuthResponse, LoginRequest, RegisterRequest } from '../types';
import apiService from '../services/api';

interface SocialAccount {
  id: string;
  provider: string;
  accountName: string;
  profilePicture?: string;
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  socialLogin: (provider: 'google' | 'facebook') => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  connectedAccounts: SocialAccount[];
  connectSocialAccount: (provider: string, token: string) => Promise<void>;
  disconnectSocialAccount: (accountId: string) => Promise<void>;
  getConnectedAccounts: () => Promise<SocialAccount[]>;
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
        const token = localStorage.getItem('auth_token');
        const savedUser = localStorage.getItem('user');

        if (token && savedUser) {
          setUser(JSON.parse(savedUser));
          // Validate token by fetching fresh profile
          await refreshProfile();
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
      localStorage.setItem('auth_token', response.accessToken);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      setUser(response.user);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (userData: RegisterRequest) => {
    try {
      const response: AuthResponse = await apiService.register(userData);
      
      // Store token and user data
      localStorage.setItem('auth_token', response.accessToken);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      setUser(response.user);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
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

  const socialLogin = async (provider: 'google' | 'facebook') => {
    // Create a simple OAuth flow using popup windows
    const authUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/auth/oauth/${provider}`;
    
    const popup = window.open(
      authUrl,
      `${provider}-login`,
      'width=500,height=600,scrollbars=yes,resizable=yes'
    );
    
    if (!popup) {
      throw new Error('Popup blocked. Please allow popups for this site.');
    }
    
    // Listen for messages from the popup
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001')) {
        return;
      }
      
      if (event.data.type === 'OAUTH_SUCCESS') {
        const { user, accessToken } = event.data;
        localStorage.setItem('auth_token', accessToken);
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user);
        popup.close();
        window.removeEventListener('message', handleMessage);
      } else if (event.data.type === 'OAUTH_ERROR') {
        throw new Error(event.data.error);
      }
    };
    
    window.addEventListener('message', handleMessage);
  };

  const forgotPassword = async (email: string) => {
    await apiService.forgotPassword(email);
  };

  const resetPassword = async (token: string, newPassword: string) => {
    await apiService.resetPassword(token, newPassword);
  };

  const connectSocialAccount = async (provider: string, token: string) => {
    try {
      await apiService.connectSocialAccount(provider, token);
      await refreshProfile();
    } catch (error) {
      console.error('Failed to connect social account:', error);
      throw error;
    }
  };

  const disconnectSocialAccount = async (accountId: string) => {
    try {
      await apiService.disconnectSocialAccount(accountId);
      await refreshProfile();
    } catch (error) {
      console.error('Failed to disconnect social account:', error);
      throw error;
    }
  };

  const getConnectedAccounts = async () => {
    try {
      const accounts = await apiService.getConnectedAccounts();
      setConnectedAccounts(accounts);
      return accounts;
    } catch (error) {
      console.error('Failed to fetch connected accounts:', error);
      throw error;
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
    connectSocialAccount,
    disconnectSocialAccount,
    getConnectedAccounts,
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
