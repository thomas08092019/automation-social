import { SocialPlatform } from '@prisma/client';
import { SOCIAL_PLATFORM_CONFIGS } from '../constants/platform.constants';
import axios from 'axios';

export interface OAuthFlowConfig {
  authUrl: string;
  tokenUrl: string;
  clientIdParam: string;
  clientSecretParam: string;
  redirectUriParam: string;
  codeParam: string;
  scopeParam: string;
  scopeSeparator: string;
  stateParam: string;
  responseTypeParam: string;
  grantTypeParam: string;
  grantTypeValue: string;
  additionalAuthParams?: Record<string, string>;
  additionalTokenParams?: Record<string, string>;
}

export class OAuthUtils {
  private static readonly PLATFORM_OAUTH_CONFIGS: Record<SocialPlatform, OAuthFlowConfig> = {
    [SocialPlatform.FACEBOOK]: {
      authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
      tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
      clientIdParam: 'client_id',
      clientSecretParam: 'client_secret',
      redirectUriParam: 'redirect_uri',
      codeParam: 'code',
      scopeParam: 'scope',
      scopeSeparator: ',',
      stateParam: 'state',
      responseTypeParam: 'response_type',
      grantTypeParam: 'grant_type',
      grantTypeValue: 'authorization_code',
    },
    [SocialPlatform.YOUTUBE]: {
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      clientIdParam: 'client_id',
      clientSecretParam: 'client_secret',
      redirectUriParam: 'redirect_uri',
      codeParam: 'code',
      scopeParam: 'scope',
      scopeSeparator: ' ',
      stateParam: 'state',
      responseTypeParam: 'response_type',
      grantTypeParam: 'grant_type',
      grantTypeValue: 'authorization_code',
      additionalAuthParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
    [SocialPlatform.TIKTOK]: {
      authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
      tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
      clientIdParam: 'client_key',
      clientSecretParam: 'client_secret',
      redirectUriParam: 'redirect_uri',
      codeParam: 'code',
      scopeParam: 'scope',
      scopeSeparator: ',',
      stateParam: 'state',
      responseTypeParam: 'response_type',
      grantTypeParam: 'grant_type',
      grantTypeValue: 'authorization_code',
    },
    [SocialPlatform.X]: {
      authUrl: 'https://twitter.com/i/oauth2/authorize',
      tokenUrl: 'https://api.twitter.com/2/oauth2/token',
      clientIdParam: 'client_id',
      clientSecretParam: 'client_secret',
      redirectUriParam: 'redirect_uri',
      codeParam: 'code',
      scopeParam: 'scope',
      scopeSeparator: ' ',
      stateParam: 'state',
      responseTypeParam: 'response_type',
      grantTypeParam: 'grant_type',
      grantTypeValue: 'authorization_code',
      additionalAuthParams: {
        code_challenge: 'challenge',
        code_challenge_method: 'plain',
      },
    },
    [SocialPlatform.INSTAGRAM]: {
      authUrl: 'https://api.instagram.com/oauth/authorize',
      tokenUrl: 'https://api.instagram.com/oauth/access_token',
      clientIdParam: 'client_id',
      clientSecretParam: 'client_secret',
      redirectUriParam: 'redirect_uri',
      codeParam: 'code',
      scopeParam: 'scope',
      scopeSeparator: ',',
      stateParam: 'state',
      responseTypeParam: 'response_type',
      grantTypeParam: 'grant_type',
      grantTypeValue: 'authorization_code',
    },
    [SocialPlatform.ZALO]: {
      authUrl: 'https://oauth.zaloapp.com/v4/permission',
      tokenUrl: 'https://oauth.zaloapp.com/v4/access_token',
      clientIdParam: 'app_id',
      clientSecretParam: 'app_secret',
      redirectUriParam: 'redirect_uri',
      codeParam: 'code',
      scopeParam: 'scope',
      scopeSeparator: ',',
      stateParam: 'state',
      responseTypeParam: 'response_type',
      grantTypeParam: 'grant_type',
      grantTypeValue: 'authorization_code',
    },
    [SocialPlatform.TELEGRAM]: {
      authUrl: 'https://oauth.telegram.org/auth',
      tokenUrl: 'https://oauth.telegram.org/auth/request',
      clientIdParam: 'bot_id',
      clientSecretParam: 'bot_token',
      redirectUriParam: 'return_to',
      codeParam: 'code',
      scopeParam: 'scope',
      scopeSeparator: ',',
      stateParam: 'state',
      responseTypeParam: 'response_type',
      grantTypeParam: 'grant_type',
      grantTypeValue: 'authorization_code',
      additionalAuthParams: {
        request_access: 'write',
        origin: '',
      },
    },
  };

  /**
   * Build authorization URL for any OAuth platform using generic approach
   */
  static buildAuthorizationUrl(
    platform: SocialPlatform,
    clientId: string,
    redirectUri: string,
    scopes: string[],
    state: string,
  ): string {
    const config = this.PLATFORM_OAUTH_CONFIGS[platform];
    if (!config) {
      throw new Error(`OAuth configuration not found for platform: ${platform}`);
    }

    const baseUrl = config.authUrl;
    const params = new URLSearchParams();

    // Required parameters
    params.set(config.clientIdParam, clientId);
    params.set(config.redirectUriParam, redirectUri);
    params.set(config.scopeParam, scopes.join(config.scopeSeparator));
    params.set(config.responseTypeParam, 'code');
    params.set(config.stateParam, state);    // Platform-specific additional parameters
    if (config.additionalAuthParams) {
      Object.entries(config.additionalAuthParams).forEach(([key, value]) => {
        if (key === 'origin' && platform === SocialPlatform.TELEGRAM) {
          params.set(key, redirectUri);
        } else {
          params.set(key, String(value));
        }
      });
    }

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token using generic approach
   */
  static async exchangeCodeForToken(
    platform: SocialPlatform,
    clientId: string,
    clientSecret: string,
    code: string,
    redirectUri: string,
  ): Promise<any> {
    const config = this.PLATFORM_OAUTH_CONFIGS[platform];
    if (!config) {
      throw new Error(`OAuth configuration not found for platform: ${platform}`);
    }

    const requestData: Record<string, string> = {
      [config.clientIdParam]: clientId,
      [config.clientSecretParam]: clientSecret,
      [config.redirectUriParam]: redirectUri,
      [config.codeParam]: code,
      [config.grantTypeParam]: config.grantTypeValue,
    };

    // Platform-specific additional parameters
    if (config.additionalTokenParams) {
      Object.assign(requestData, config.additionalTokenParams);
    }

    // Special handling for Twitter/X
    if (platform === SocialPlatform.X) {
      requestData.code_verifier = 'challenge';
    }

    try {
      // Use GET for Facebook, POST for others
      if (platform === SocialPlatform.FACEBOOK) {
        const response = await axios.get(config.tokenUrl, {
          params: requestData,
        });
        return response.data;
      } else {
        const response = await axios.post(config.tokenUrl, requestData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });
        return response.data;
      }
    } catch (error) {
      throw new Error(`Token exchange failed for ${platform}: ${error.message}`);
    }
  }

  /**
   * Get OAuth configuration for a platform
   */
  static getOAuthConfig(platform: SocialPlatform): OAuthFlowConfig {
    const config = this.PLATFORM_OAUTH_CONFIGS[platform];
    if (!config) {
      throw new Error(`OAuth configuration not found for platform: ${platform}`);
    }
    return config;
  }

  /**
   * Get default scopes for a platform from platform constants
   */
  static getDefaultScopes(platform: SocialPlatform): string[] {
    const platformConfig = SOCIAL_PLATFORM_CONFIGS[platform];
    return platformConfig?.scopes || [];
  }
}
