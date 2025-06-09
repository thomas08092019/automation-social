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
        this.storePKCEVerifier(tiktokState, pkce.codeVerifier);        const tiktokParams = new URLSearchParams({
          client_key: config.clientId, // TikTok uses 'client_key' instead of 'client_id'
          redirect_uri: config.redirectUri,
          scope: config.scopes.join(','), // TikTok uses comma-separated scopes
          response_type: 'code',
          state: tiktokState,
          code_challenge: pkce.codeChallenge,
          code_challenge_method: pkce.codeChallengeMethod,
          // ULTIMATE FORCE PERMISSION SCREENS - Maximum aggressive parameters
          force_reauth: 'true', // Force user to re-authenticate
          force_verify: 'true', // Force verification of permissions
          approval_prompt: 'force', // Force approval prompt
          prompt: 'consent', // Alternative force consent parameter
          access_type: 'offline', // Request offline access
          include_granted_scopes: 'false', // Don't include previously granted scopes
          force_login: 'true', // Force login screen
          force_approval: 'true', // Force approval screen
          force_consent: 'true', // Additional force consent
          force_permissions: 'true', // Force permission review
          reauth: 'true', // Additional reauth parameter
          consent: 'force', // Force consent mode
          auth_type: 'rerequest', // Force permission re-request
          display: 'popup', // Use popup display mode to prevent auto-redirect
          force_show_permission: 'true', // Additional TikTok-specific force parameter
          force_authorization: 'true', // Force authorization screens
          disable_auto_login: 'true', // Disable automatic login
          always_prompt: 'true', // Always show prompts
          require_interaction: 'true', // Require user interaction
          // Anti-cache and fresh session parameters
          t: Date.now().toString(), // Timestamp to prevent caching
          v: '4', // Higher version parameter for cache busting
          fresh: 'true', // Force fresh authorization
          no_cache: 'true', // Prevent caching
          nocache: Date.now().toString(), // Additional cache buster
          rand: Math.random().toString(36).substring(2, 15), // Longer random string
          _: Date.now().toString(), // jQuery-style cache buster
          session_invalidate: 'true', // Invalidate existing session
          cache_buster: Math.random().toString(36).substring(7), // Additional cache buster
          force_interactive: 'true', // Force interactive mode
        });
          const authUrl = `https://www.tiktok.com/v2/auth/authorize/?${tiktokParams.toString()}`;
          // Debug logging for TikTok OAuth URL        console.log('=== TikTok OAuth URL Debug ===');
        console.log(`Client Key: ${config.clientId}`);
        console.log(`Redirect URI: ${config.redirectUri}`);
        console.log(`Scopes: ${config.scopes.join(',')}`);
        console.log(`State: ${tiktokState}`);
        console.log(`Code Challenge: ${pkce.codeChallenge.substring(0, 20)}...`);        console.log(`🔒 ULTIMATE FORCE PARAMETERS ENABLED:`);
        console.log(`   - force_reauth: true (Forces re-authentication)`);
        console.log(`   - force_verify: true (Forces permission verification)`);
        console.log(`   - approval_prompt: force (Forces approval screens)`);
        console.log(`   - prompt: consent (Alternative force consent)`);
        console.log(`   - force_login: true (Forces login screen)`);
        console.log(`   - force_approval: true (Forces approval screen)`);
        console.log(`   - force_consent: true (Additional force consent)`);
        console.log(`   - force_permissions: true (Force permission review)`);
        console.log(`   - auth_type: rerequest (Force permission re-request)`);
        console.log(`   - display: popup (Prevent auto-redirect)`);
        console.log(`   - force_show_permission: true (TikTok-specific force)`);
        console.log(`   - force_authorization: true (Force authorization screens)`);
        console.log(`   - disable_auto_login: true (Disable automatic login)`);
        console.log(`   - always_prompt: true (Always show prompts)`);
        console.log(`   - require_interaction: true (Require user interaction)`);
        console.log(`   - include_granted_scopes: false (No cached permissions)`);
        console.log(`   - fresh: true (Forces fresh authorization)`);
        console.log(`   - no_cache: true (Prevents caching)`);
        console.log(`   - session_invalidate: true (Invalidates existing session)`);
        console.log(`   - force_interactive: true (Force interactive mode)`);
        console.log(`Generated URL: ${authUrl}`);
        console.log('==============================');
        
        // Additional debug info for troubleshooting
        console.log('=== TikTok OAuth Configuration Check ===');
        console.log(`Full Client Key: ${config.clientId}`);
        console.log(`Expected Redirect URI: ${config.redirectUri}`);
        console.log(`Expected Scopes: ${config.scopes.join(',')}`);
        console.log('Make sure these match EXACTLY in your TikTok Developer Console');
        console.log('==========================================');
        
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
  }  /**
   * Perform actual token exchange
   */  private async performTokenExchange(
    platform: SocialPlatform,
    code: string,
    appConfig: any,
    state?: string,
  ): Promise<TokenExchangeResult> {    const tokenEndpoint = this.getTokenEndpoint(platform);
    const params = this.buildTokenRequestParams(platform, appConfig, code, state);

    console.log(`=== ${platform} Token Exchange Debug ===`);
    console.log('Token Endpoint:', tokenEndpoint);
    console.log('Request Params:', Object.fromEntries(params.entries()));
    console.log('==========================================');

    try {      // Add timeout and retry logic to handle authorization code expiration
      const response = await axios.post(tokenEndpoint, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cache-Control': 'no-cache',
        },
        timeout: 5000, // Reduced to 5 seconds for faster processing
        maxRedirects: 0, // Prevent redirect delays
        validateStatus: (status) => status < 500, // Accept 4xx errors for better error handling
      });

      const data = response.data;
      
      console.log(`=== ${platform} Token Response Debug ===`);
      console.log('Raw Response Data:', JSON.stringify(data, null, 2));
      console.log('Response Status:', response.status);
      console.log('Response Headers:', response.headers);
      console.log('=========================================');

      // Handle platform-specific response structures
      if (platform === SocialPlatform.TIKTOK) {
        // TikTok API response structure validation
        if (data.error || data.error_code) {
          const errorMsg = data.error_description || data.message || data.error || 'TikTok token exchange failed';
          console.error('TikTok API Error:', data);
          return {
            success: false,
            errorMessage: `TikTok token exchange failed: ${errorMsg}`,
          };
        }

        // TikTok returns data in nested structure or flat structure depending on endpoint version
        const tokenData = data.data || data;
        const accessToken = tokenData.access_token || data.access_token;
        const refreshToken = tokenData.refresh_token || data.refresh_token;
        const expiresIn = tokenData.expires_in || data.expires_in;
        const scope = tokenData.scope || data.scope;

        console.log('=== TikTok Token Extraction Debug ===');
        console.log('Has data.data:', !!data.data);
        console.log('Extracted access_token:', accessToken ? `${accessToken.substring(0, 10)}...` : 'MISSING');
        console.log('Extracted refresh_token:', refreshToken ? 'Present' : 'Missing');
        console.log('Extracted expires_in:', expiresIn);
        console.log('Extracted scope:', scope);
        console.log('=====================================');

        if (!accessToken) {
          console.error('=== TikTok Access Token Missing ===');
          console.error('Full response structure:', JSON.stringify(data, null, 2));
          console.error('Expected paths checked:');
          console.error('- data.access_token:', data.access_token);
          console.error('- data.data.access_token:', data.data?.access_token);
          console.error('===================================');
          return {
            success: false,
            errorMessage: 'TikTok access token not found in response',
          };
        }

        return {
          success: true,
          accessToken: accessToken,
          refreshToken: refreshToken,
          expiresIn: expiresIn,
          tokenType: data.token_type || 'Bearer',
          scope: scope,
        };
      }

      // Default handling for other platforms (Facebook, Google/YouTube)
      return {
        success: true,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        tokenType: data.token_type || 'Bearer',
        scope: data.scope,
      };
    } catch (error) {
      console.error(`=== ${platform} Token Exchange Error ===`);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
      });
      console.error('=======================================');
      
      return {
        success: false,
        errorMessage: `Token exchange failed: ${error.response?.data?.error_description || error.response?.data?.message || error.message}`,
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
    switch (platform) {      case SocialPlatform.TIKTOK:
        // TikTok uses different parameter names and requires PKCE
        const params: any = {
          client_key: appConfig.appId, // TikTok uses 'client_key' instead of 'client_id'
          client_secret: appConfig.appSecret,
          code: code, // TikTok uses 'code' for token exchange
          grant_type: 'authorization_code',
          redirect_uri: appConfig.redirectUri, // Required: must match authorization request
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
          'user.info.basic',
          'user.info.profile',
          'user.info.stats',
          'user.info.open_id',
          'video.list',
          'video.publish',
          'video.upload',
          'artist.certification.read',
          'artist.certification.update',
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
