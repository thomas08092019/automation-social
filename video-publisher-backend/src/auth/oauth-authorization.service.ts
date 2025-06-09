import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnhancedSocialAppService } from './enhanced-social-app.service';
import { SocialPlatform } from '@prisma/client';
import axios from 'axios';
import * as crypto from 'crypto';

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

export interface PKCEPair {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: string;
}

@Injectable()
export class OAuthAuthorizationService {
  constructor(
    private configService: ConfigService,
    private enhancedSocialAppService: EnhancedSocialAppService,
  ) {}

  /**
   * Generate authorization URL with enhanced app selection
   */  async generateAuthorizationUrl(request: AuthorizationRequest): Promise<AuthorizationResult> {
    try {
      // Validate platform is supported
      if (!Object.values(SocialPlatform).includes(request.platform)) {
        return {
          success: false,
          errorMessage: `Unsupported platform: ${request.platform}. Supported platforms: ${Object.values(SocialPlatform).join(', ')}`,
        };
      }

      // Get appropriate app config
      const appConfig = await this.enhancedSocialAppService.getAppConfig({
        userId: request.userId,
        platform: request.platform,
        preferredAppId: request.preferredAppId,
        socialAccountId: request.socialAccountId,
      });

      if (!appConfig.appId || !appConfig.appSecret) {
        const platformName = request.platform.toLowerCase();
        return {
          success: false,
          errorMessage: `No valid OAuth credentials found for ${platformName}. Please ensure ${platformName.toUpperCase()}_CLIENT_ID and ${platformName.toUpperCase()}_CLIENT_SECRET are configured in your environment variables.`,
        };
      }

      // Validate OAuth configuration
      if (!appConfig.redirectUri) {
        return {
          success: false,
          errorMessage: `No redirect URI configured for platform: ${request.platform}`,
        };
      }

      // Get scopes from request or default
      const scopes = request.customScopes || this.getDefaultScopes(request.platform);
      
      if (!scopes || scopes.length === 0) {
        return {
          success: false,
          errorMessage: `No OAuth scopes configured for platform: ${request.platform}`,
        };
      }

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
        errorMessage: `OAuth authorization failed: ${error.message}`,
      };
    }
  }
  /**
   * Build platform-specific authorization URL
   */
  private buildAuthorizationUrl(platform: SocialPlatform, config: OAuthConfig, state?: string): string {
    switch (platform) {
      case SocialPlatform.YOUTUBE:
        const googleParams = new URLSearchParams({
          client_id: config.clientId,
          redirect_uri: config.redirectUri,
          scope: config.scopes.join(' '),
          response_type: 'code',
          access_type: 'offline', // For refresh tokens
          prompt: 'consent', // Force consent screen
          ...(state && { state }),
        });
        return `https://accounts.google.com/o/oauth2/v2/auth?${googleParams.toString()}`;

      case SocialPlatform.FACEBOOK:
      case SocialPlatform.INSTAGRAM:
        const facebookParams = new URLSearchParams({
          client_id: config.clientId,
          redirect_uri: config.redirectUri,
          scope: config.scopes.join(','), // Facebook uses comma-separated scopes
          response_type: 'code',
          ...(state && { state }),
        });
        return `https://www.facebook.com/v18.0/dialog/oauth?${facebookParams.toString()}`;      case SocialPlatform.TIKTOK:
        // TikTok requires PKCE (Proof Key for Code Exchange) for security
        const pkce = this.generatePKCE();
        const tiktokState = state || crypto.randomUUID();
        
        // Store the code verifier for later use in token exchange
        this.storePKCEVerifier(tiktokState, pkce.codeVerifier);
        
        const tiktokParams = new URLSearchParams({
          client_key: config.clientId, // TikTok uses 'client_key' instead of 'client_id'
          redirect_uri: config.redirectUri,
          scope: config.scopes.join(','), // TikTok uses comma-separated scopes
          response_type: 'code',
          state: tiktokState,
          code_challenge: pkce.codeChallenge,
          code_challenge_method: pkce.codeChallengeMethod,
        });
        
        const authUrl = `https://www.tiktok.com/v2/auth/authorize/?${tiktokParams.toString()}`;
        
        // Debug logging for TikTok OAuth URL
        console.log('=== TikTok OAuth URL Debug ===');
        console.log(`Client Key: ${config.clientId.substring(0, 10)}...`);
        console.log(`Redirect URI: ${config.redirectUri}`);
        console.log(`Scopes: ${config.scopes.join(',')}`);
        console.log(`State: ${tiktokState}`);
        console.log(`Code Challenge: ${pkce.codeChallenge.substring(0, 20)}...`);
        console.log(`Generated URL: ${authUrl}`);
        console.log('==============================');
        
        return authUrl;

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
    state?: string,
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

      return this.performTokenExchange(platform, code, appConfig, state);
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
   */  private async performTokenExchange(
    platform: SocialPlatform,
    code: string,
    appConfig: any,
    state?: string,
  ): Promise<TokenExchangeResult> {    const tokenEndpoint = this.getTokenEndpoint(platform);
    const params = this.buildTokenRequestParams(platform, appConfig, code, state);

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
  private getTokenEndpoint(platform: SocialPlatform): string {    switch (platform) {
      case SocialPlatform.YOUTUBE:
        return 'https://oauth2.googleapis.com/token';

      case SocialPlatform.FACEBOOK:
      case SocialPlatform.INSTAGRAM:
        return 'https://graph.facebook.com/v18.0/oauth/access_token';

      case SocialPlatform.TIKTOK:
        return 'https://open.tiktokapis.com/v2/oauth/token/'; // Updated TikTok API endpoint

      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }
  /**
   * Build token request parameters
   */  private buildTokenRequestParams(platform: SocialPlatform, appConfig: any, code: string, state?: string): URLSearchParams {
    switch (platform) {
      case SocialPlatform.TIKTOK:
        // TikTok uses different parameter names and requires PKCE
        const params: any = {
          client_key: appConfig.appId, // TikTok uses 'client_key' instead of 'client_id'
          client_secret: appConfig.appSecret,
          code: code, // TikTok uses 'code' for token exchange
          grant_type: 'authorization_code',
        };

        // Add PKCE code verifier if state is provided
        if (state) {
          const codeVerifier = this.getPKCEVerifier(state);
          if (codeVerifier) {
            params.code_verifier = codeVerifier;
          }
        }

        return new URLSearchParams(params);

      default:
        const baseParams = {
          client_id: appConfig.appId,
          client_secret: appConfig.appSecret,
          redirect_uri: appConfig.redirectUri,
          grant_type: 'authorization_code',
          code,
        };
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
      case SocialPlatform.FACEBOOK:
      case SocialPlatform.INSTAGRAM:
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
   */  private getDefaultScopes(platform: SocialPlatform): string[] {
    switch (platform) {
      case SocialPlatform.YOUTUBE:
        return [
          'https://www.googleapis.com/auth/youtube.upload',
          'https://www.googleapis.com/auth/youtube',
          'https://www.googleapis.com/auth/youtube.readonly',
        ];

      case SocialPlatform.FACEBOOK:
        return [
          'pages_manage_posts',
          'pages_read_engagement',
          'pages_show_list',
          'publish_video',
        ];

      case SocialPlatform.INSTAGRAM:
        return [
          'instagram_basic',
          'instagram_content_publish',
          'pages_show_list',
          'pages_read_engagement',
        ];      case SocialPlatform.TIKTOK:
        return [
          'user.info.profile',
          'user.info.stats',
          'video.list',
        ];

      default:
        return [];
    }
  }

  /**
   * Generate PKCE code verifier and challenge for TikTok OAuth
   */
  private generatePKCE(): PKCEPair {
    // Generate a random 128-character string for code verifier
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    
    // Create SHA256 hash of the verifier and encode as base64url
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    return {
      codeVerifier,
      codeChallenge,
      codeChallengeMethod: 'S256',
    };
  }

  /**
   * Store PKCE code verifier for later use in token exchange
   * In production, this should be stored in Redis or database
   */
  private pkceStorage = new Map<string, string>();

  private storePKCEVerifier(state: string, codeVerifier: string): void {
    this.pkceStorage.set(state, codeVerifier);
    // Clean up after 10 minutes
    setTimeout(() => {
      this.pkceStorage.delete(state);
    }, 10 * 60 * 1000);
  }

  private getPKCEVerifier(state: string): string | undefined {
    return this.pkceStorage.get(state);
  }
}
