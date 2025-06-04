import { SocialPlatform } from './social-platform';

export interface SocialApp {
  id: string;
  name: string;
  platform: SocialPlatform;
  appId: string;
  appSecret: string;
  redirectUri: string;
  isDefault: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
  connectedAccountsCount?: number;
  healthStatus?: 'healthy' | 'warning' | 'error';
  lastCheckedAt?: string;
}

export interface CreateSocialAppRequest {
  name: string;
  platform: SocialPlatform;
  appId: string;
  appSecret: string;
  redirectUri: string;
  isDefault?: boolean;
}

export interface UpdateSocialAppRequest {
  name?: string;
  appId?: string;
  appSecret?: string;
  redirectUri?: string;
  isDefault?: boolean;
}

export interface ValidateAppCredentialsRequest {
  platform: SocialPlatform;
  appId: string;
  appSecret: string;
  redirectUri: string;
}

export interface SocialAppValidationResult {
  isValid: boolean;
  errorMessage?: string;
  details?: any;
}

export interface ImportDefaultAppsRequest {
  platforms: SocialPlatform[];
}
