import React, { createContext, useContext, useEffect, useState, ReactNode, useRef, useMemo } from 'react';
import { User, AuthResponse, LoginRequest, RegisterRequest, SocialAccount } from '../types';
import apiService from '../services/api';
import { FirebaseAuthService } from '../services/firebaseAuth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  firebaseLogin: (provider: 'google' | 'facebook') => Promise<void>;
  setAuthenticatedUser: (user: User, token: string) => Promise<void>;
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
  const [isOAuthLogin, setIsOAuthLogin] = useState(false);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const hasInitialized = useRef(false);
  const isInitializing = useRef(false);

  const isAuthenticated = !!user;  // Load user from localStorage on mount
  useEffect(() => {
    // Prevent multiple initializations using ref
    if (hasInitialized.current || isInitializing.current) {
      console.log('AuthContext: Skipping initialization - already initialized or in progress');
      return;
    }

    isInitializing.current = true;
    console.log('AuthContext: Starting initialization');

    const loadUser = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const savedUser = localStorage.getItem('user');

        if (token && savedUser) {
          console.log('AuthContext: Found token and saved user');
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          
          // Only validate token if it's not an OAuth login to avoid race conditions
          if (!isOAuthLogin) {
            try {
              console.log('AuthContext: Calling /me API to validate token');
              // Validate token by refreshing profile - this calls /me API once
              const freshUser = await apiService.getProfile();
              localStorage.setItem('user', JSON.stringify(freshUser));
              setUser(freshUser);
              
              console.log('AuthContext: Calling /social-accounts API');
              // After successful profile refresh, fetch connected accounts
              await refreshConnectedAccounts(true);
            } catch (error) {
              console.error('Failed to refresh profile:', error);
              // If token validation fails, logout the user
              logout();
            }
          }
        } else {
          console.log('AuthContext: No token or saved user found');
        }
      } catch (error) {
        console.error('Failed to load user:', error);
        logout();
      } finally {
        setIsLoading(false);
        hasInitialized.current = true;
        isInitializing.current = false;
        console.log('AuthContext: Initialization completed');
      }
    };loadUser();
  }, []); // Empty dependency array to run only once

  const login = async (credentials: LoginRequest) => {
    try {
      const response: AuthResponse = await apiService.login(credentials);
      
      // Store token and user data
      localStorage.setItem('access_token', response.accessToken);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      setUser(response.user);
      // Don't fetch connected accounts here as they will be fetched after successful navigation
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
      // Don't fetch connected accounts here as they will be fetched after successful navigation
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };
  const logout = () => {
    // Clear authentication data
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    
    // Reset theme to light mode and clear theme-related localStorage
    localStorage.removeItem('theme');
    localStorage.removeItem('customStartColor');
    localStorage.removeItem('customEndColor');
    localStorage.removeItem('selectedPreset');
    
    // Reset dark mode in DOM
    document.body.classList.remove('dark');
    
    // Reset CSS custom properties to default values
    document.documentElement.style.setProperty('--primary-start', '#667eea');
    document.documentElement.style.setProperty('--primary-end', '#764ba2');
    document.documentElement.style.setProperty('--primary-gradient', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)');
    
    // Remove dynamic theme styles
    const dynamicStyle = document.getElementById('dynamic-theme-style');
    if (dynamicStyle) {
      dynamicStyle.remove();
    }
    
    // Clear state
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
    }  };

  const setAuthenticatedUser = async (user: User, token: string) => {
    // Store token and user data
    localStorage.setItem('access_token', token);
    localStorage.setItem('user', JSON.stringify(user));
    
    // Mark this as OAuth login to prevent useEffect from interfering
    setIsOAuthLogin(true);
    
    // Update state
    setUser(user);
    
    // Wait a moment to ensure state is updated
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Reset OAuth flag after a short delay
    setTimeout(() => {
      setIsOAuthLogin(false);
    }, 1000);
      // Refresh connected accounts in the background (don't await to avoid blocking navigation)
    setTimeout(() => {
      refreshConnectedAccounts(true).catch(error => {
        console.error('Failed to refresh connected accounts:', error);
      });
    }, 100); // Small delay to ensure auth state is fully updated
  };

  const forgotPassword = async (email: string) => {
    await apiService.forgotPassword({ email });
  };

  const resetPassword = async (token: string, password: string) => {
    await apiService.resetPassword({ token, password });
  };  const refreshConnectedAccounts = async (force = false) => {
    try {
      if (isAuthenticated) {
        // Prevent multiple simultaneous requests
        if (!force && isLoadingAccounts) {
          console.log('AuthContext: Skipping social-accounts API - already loading');
          return;
        }
          console.log('AuthContext: Fetching social accounts');
        setIsLoadingAccounts(true);
        const accountsResponse = await apiService.getSocialAccounts();
        setConnectedAccounts(accountsResponse.data || []); // Extract data array from response
        console.log('AuthContext: Social accounts fetched successfully');
      }
    } catch (error) {
      console.error('Failed to fetch connected accounts:', error);
      // Don't throw error here as it's a background operation
    } finally {
      setIsLoadingAccounts(false);
    }
  };
  // Firebase authentication method
  const firebaseLogin = async (provider: 'google' | 'facebook') => {
    try {
      let firebaseResult;
      
      if (provider === 'google') {
        firebaseResult = await FirebaseAuthService.signInWithGoogle();
      } else if (provider === 'facebook') {
        firebaseResult = await FirebaseAuthService.signInWithFacebook();
      } else {
        throw new Error('Unsupported provider');
      }

      // Send Firebase ID token to backend for verification and user creation
      const response: AuthResponse = await apiService.firebaseAuth(firebaseResult.idToken);
      
      // Store token and user data
      localStorage.setItem('access_token', response.accessToken);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      setUser(response.user);
      // Don't fetch connected accounts here as they will be fetched after successful navigation
    } catch (error) {
      console.error('Firebase login failed:', error);
      throw error;
    }
  };  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshProfile,
    firebaseLogin,
    setAuthenticatedUser,
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
