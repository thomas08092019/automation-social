import { SocialPlatform, AccountType } from '@prisma/client';

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  appName?: string;
  socialAppId?: string;
}

export interface PlatformUserInfo {
  id: string;
  name: string;
  email?: string;
  profilePicture?: string;
  username?: string;
  metadata?: Record<string, any>;
}

export interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  tokenType?: string;
  scope?: string;
}

export interface SocialAccountData {
  platform: SocialPlatform;
  accountType: AccountType;
  accountId: string;
  accountName: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  profilePicture?: string;
  metadata?: any;
  appId?: string;
  appSecret?: string;
  redirectUri?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface BulkOperationResult {
  successful: string[];
  failed: string[];
}

export interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  isOpen: boolean;
  maxFailures: number;
  resetTimeout: number;
}
