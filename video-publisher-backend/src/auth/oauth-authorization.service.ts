import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnhancedSocialAppService } from './enhanced-social-app.service';
import { SocialPlatform } from '@prisma/client';
import axios from 'axios';

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  appName?: string;
  socialAppId?: string;
}

export interface AuthorizationResult {
  success: boolean;
  authorizationUrl?: string;
  errorMessage?: string;
  appConfig?: OAuthConfig;
}

export interface TokenExchangeResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
  scope?: string;
  errorMessage?: string;
}

export interface AuthorizationRequest {
  userId: string;
  platform: SocialPlatform;
  preferredAppId?: string;
  socialAccountId?: string;
  state?: string;
  customScopes?: string[];
}

@Injectable()
export class OAuthAuthorizationService {
  constructor(
    private configService: ConfigService,
    private enhancedSocialAppService: EnhancedSocialAppService,
  ) {}

  /**
   * Generate authorization URL with enhanced app selection
   */
  async generateAuthorizationUrl(request: AuthorizationRequest): Promise<AuthorizationResult> {
    try {
      // Get appropriate app config
      const appConfig = await this.enhancedSocialAppService.getAppConfig({
        userId: request.userId,
        platform: request.platform,
        preferredAppId: request.preferredAppId,
        socialAccountId: request.socialAccountId,
      });

      if (!appConfig.appId || !appConfig.appSecret) {
        return {
          success: false,
          errorMessage: `No valid app configuration found for platform: ${request.platform}`,
        };
      }

      // Get scopes from request or default
      const scopes = request.customScopes || this.getDefaultScopes(request.platform);

      const oauthConfig: OAuthConfig = {
        clientId: appConfig.appId,
        clientSecret: appConfig.appSecret,
        redirectUri: appConfig.redirectUri,
        scopes,
        appName: appConfig.name,
        socialAppId: appConfig.socialAppId,
      };

      const authorizationUrl = this.buildAuthorizationUrl(request.platform, oauthConfig, request.state);

      return {
        success: true,
        authorizationUrl,
        appConfig: oauthConfig,
      };
    } catch (error) {
      return {
        success: false,
        errorMessage: error.message,
      };
    }
  }

  /**
   * Build platform-specific authorization URL
   */
  private buildAuthorizationUrl(platform: SocialPlatform, config: OAuthConfig, state?: string): string {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scopes.join(' '),
      response_type: 'code',
      access_type: 'offline', // For refresh tokens
      prompt: 'consent', // Force consent screen
      ...(state && { state }),
    });

    switch (platform) {
      case SocialPlatform.YOUTUBE_SHORTS:
        return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

      case SocialPlatform.FACEBOOK_REELS:
      case SocialPlatform.INSTAGRAM_REELS:
        return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;

      case SocialPlatform.TIKTOK:
        return `https://www.tiktok.com/auth/authorize/?${params.toString()}`;

      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Exchange authorization code for access token with enhanced app selection
   */
  async exchangeCodeForToken(
    platform: SocialPlatform,
    code: string,
    userId: string,
    socialAppId?: string,
  ): Promise<TokenExchangeResult> {
    try {
      // Get app config based on socialAppId or default
      const appConfig = await this.enhancedSocialAppService.getAppConfig({
        userId,
        platform,
        preferredAppId: socialAppId,
      });

      if (!appConfig.appId || !appConfig.appSecret) {
        return {
          success: false,
          errorMessage: `No valid app configuration found for platform: ${platform}`,
        };
      }

      return this.performTokenExchange(platform, code, appConfig);
    } catch (error) {
      return {
        success: false,
        errorMessage: error.message,
      };
    }
  }

  /**
   * Refresh access token with enhanced app selection
   */
  async refreshAccessToken(
    platform: SocialPlatform,
    refreshToken: string,
    userId: string,
    socialAppId?: string,
  ): Promise<TokenExchangeResult> {
    try {
      const appConfig = await this.enhancedSocialAppService.getAppConfig({
        userId,
        platform,
        preferredAppId: socialAppId,
      });

      if (!appConfig.appId || !appConfig.appSecret) {
        return {
          success: false,
          errorMessage: `No valid app configuration found for platform: ${platform}`,
        };
      }

      return this.performTokenRefresh(platform, refreshToken, appConfig);
    } catch (error) {
      return {
        success: false,
        errorMessage: error.message,
      };
    }
  }

  /**
   * Perform actual token exchange
   */
  private async performTokenExchange(
    platform: SocialPlatform,
    code: string,
    appConfig: any,
  ): Promise<TokenExchangeResult> {
    const tokenEndpoint = this.getTokenEndpoint(platform);
    const params = this.buildTokenRequestParams(platform, appConfig, code);

    try {
      const response = await axios.post(tokenEndpoint, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const data = response.data;

      return {
        success: true,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        tokenType: data.token_type || 'Bearer',
        scope: data.scope,
      };
    } catch (error) {
      return {
        success: false,
        errorMessage: `Token exchange failed: ${error.response?.data?.error_description || error.message}`,
      };
    }
  }

  /**
   * Perform token refresh
   */
  private async performTokenRefresh(
    platform: SocialPlatform,
    refreshToken: string,
    appConfig: any,
  ): Promise<TokenExchangeResult> {
    const tokenEndpoint = this.getTokenEndpoint(platform);
    const params = this.buildRefreshTokenParams(platform, appConfig, refreshToken);

    try {
      const response = await axios.post(tokenEndpoint, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const data = response.data;

      return {
        success: true,
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken, // Some platforms don't return new refresh token
        expiresIn: data.expires_in,
        tokenType: data.token_type || 'Bearer',
        scope: data.scope,
      };
    } catch (error) {
      return {
        success: false,
        errorMessage: `Token refresh failed: ${error.response?.data?.error_description || error.message}`,
      };
    }
  }

  /**
   * Get platform-specific token endpoint
   */
  private getTokenEndpoint(platform: SocialPlatform): string {
    switch (platform) {
      case SocialPlatform.YOUTUBE_SHORTS:
        return 'https://oauth2.googleapis.com/token';

      case SocialPlatform.FACEBOOK_REELS:
      case SocialPlatform.INSTAGRAM_REELS:
        return 'https://graph.facebook.com/v18.0/oauth/access_token';

      case SocialPlatform.TIKTOK:
        return 'https://open-api.tiktok.com/oauth/access_token/';

      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Build token request parameters
   */
  private buildTokenRequestParams(platform: SocialPlatform, appConfig: any, code: string): URLSearchParams {
    const baseParams = {
      client_id: appConfig.appId,
      client_secret: appConfig.appSecret,
      redirect_uri: appConfig.redirectUri,
      grant_type: 'authorization_code',
      code,
    };

    switch (platform) {
      case SocialPlatform.TIKTOK:
        return new URLSearchParams({
          ...baseParams,
          auth_code: code, // TikTok uses 'auth_code' instead of 'code'
        });

      default:
        return new URLSearchParams(baseParams);
    }
  }

  /**
   * Build refresh token parameters
   */
  private buildRefreshTokenParams(platform: SocialPlatform, appConfig: any, refreshToken: string): URLSearchParams {
    const baseParams = {
      client_id: appConfig.appId,
      client_secret: appConfig.appSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    };

    switch (platform) {
      case SocialPlatform.FACEBOOK_REELS:
      case SocialPlatform.INSTAGRAM_REELS:
        return new URLSearchParams({
          grant_type: 'fb_exchange_token',
          client_id: appConfig.appId,
          client_secret: appConfig.appSecret,
          fb_exchange_token: refreshToken,
        });

      default:
        return new URLSearchParams(baseParams);
    }
  }

  /**
   * Get default scopes for platform
   */
  private getDefaultScopes(platform: SocialPlatform): string[] {
    switch (platform) {
      case SocialPlatform.YOUTUBE_SHORTS:
        return [
          'https://www.googleapis.com/auth/youtube.upload',
          'https://www.googleapis.com/auth/youtube',
          'https://www.googleapis.com/auth/youtube.readonly',
        ];

      case SocialPlatform.FACEBOOK_REELS:
        return [
          'pages_manage_posts',
          'pages_read_engagement',
          'pages_show_list',
          'publish_video',
        ];

      case SocialPlatform.INSTAGRAM_REELS:
        return [
          'instagram_basic',
          'instagram_content_publish',
          'pages_show_list',
          'pages_read_engagement',
        ];

      case SocialPlatform.TIKTOK:
        return [
          'user.info.basic',
          'video.upload',
          'video.publish',
        ];

      default:
        return [];
    }
  }
}
