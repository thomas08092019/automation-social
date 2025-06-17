// Types for social accounts
export enum SocialPlatform {
  FACEBOOK = 'FACEBOOK',
  INSTAGRAM = 'INSTAGRAM',
  TIKTOK = 'TIKTOK',
  YOUTUBE = 'YOUTUBE',
  ZALO = 'ZALO',
  X = 'X',
  TELEGRAM = 'TELEGRAM'
}

export enum AccountType {
  PAGE = 'PAGE',
  GROUP = 'GROUP', 
  PROFILE = 'PROFILE',
  BUSINESS = 'BUSINESS',
  CREATOR = 'CREATOR'
}

export interface SocialAccount {
  id: string;
  platform: SocialPlatform;
  accountType: AccountType;
  accountName: string;
  accountId: string;
  accessToken?: string;
  refreshToken?: string;
  isActive: boolean;
  expiresAt?: string;
  profilePicture?: string;
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface ConnectPlatformResponse {
  success: boolean;
  data?: {
    authUrl: string;
    platform: SocialPlatform;
  };
  message: string;
  error?: string;
}

export interface SocialAccountResponse {
  success: boolean;
  data: SocialAccount | SocialAccount[];
  message: string;
}

export interface PlatformButtonConfig {
  platform: SocialPlatform;
  name: string;
  icon: React.ReactNode;
  color: string;
  hoverColor: string;
}
