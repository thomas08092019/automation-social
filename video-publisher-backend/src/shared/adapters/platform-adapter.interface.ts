import { SocialPlatform } from '@prisma/client';

export interface PlatformCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface AuthorizationUrlParams {
  credentials: PlatformCredentials;
  scopes: string[];
  state: string;
  additionalParams?: Record<string, string>;
}

export interface TokenExchangeParams {
  credentials: PlatformCredentials;
  code: string;
  additionalParams?: Record<string, string>;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
  scope?: string;
}

export interface UserInfo {
  id: string;
  name: string;
  email?: string;
  profilePicture?: string;
  username?: string;
  metadata?: Record<string, any>;
}

export interface PostPublishParams {
  accessToken: string;
  content: {
    text?: string;
    mediaUrls?: string[];
    title?: string;
    description?: string;
    tags?: string[];
  };
  options?: Record<string, any>;
}

export interface PostPublishResult {
  success: boolean;
  postId?: string;
  postUrl?: string;
  errorMessage?: string;
}

export interface PlatformCapabilities {
  supportsText: boolean;
  supportsImages: boolean;
  supportsVideos: boolean;
  supportsMultipleMedia: boolean;
  supportsScheduling: boolean;
  supportsHashtags: boolean;
  supportsLocation: boolean;
  supportsAnalytics: boolean;
  maxTextLength?: number;
  maxMediaCount?: number;
  supportedVideoFormats?: string[];
  supportedImageFormats?: string[];
}

export interface PlatformAdapter {
  readonly platform: SocialPlatform;
  readonly capabilities: PlatformCapabilities;

  // OAuth Flow Methods
  generateAuthorizationUrl(params: AuthorizationUrlParams): Promise<string>;
  exchangeCodeForToken(params: TokenExchangeParams): Promise<TokenResponse>;
  refreshAccessToken(refreshToken: string, credentials: PlatformCredentials): Promise<TokenResponse>;

  // User Info Methods
  fetchUserInfo(accessToken: string): Promise<UserInfo>;
  validateToken(accessToken: string): Promise<boolean>;

  // Content Publishing Methods
  publishPost(params: PostPublishParams): Promise<PostPublishResult>;
  createPost(content: any): Promise<string>;
  
  // Account Management Methods
  getAccountInfo(accessToken: string): Promise<UserInfo>;
  getAccountMetrics(accessToken: string): Promise<Record<string, any>>;

  // Analytics Methods (optional - only if supportsAnalytics is true)
  getAnalytics?(dateRange: { start: Date; end: Date }): Promise<any>;

  // Platform-specific Methods
  getPlatformSpecificData(accessToken: string, dataType: string): Promise<any>;
}
