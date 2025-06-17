import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SocialPlatform } from '@prisma/client';
import { OAuthConfigService } from './oauth-config.service';
import axios from 'axios';

export interface AuthorizationResult {
  success: boolean;
  authorizationUrl?: string;
  errorMessage?: string;
  state?: string;
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
  state?: string;
  customScopes?: string[];
}

@Injectable()
export class OAuthService {
  constructor(
    private configService: ConfigService,
    private oauthConfigService: OAuthConfigService,
  ) {}

  async generateAuthorizationUrl(request: AuthorizationRequest): Promise<AuthorizationResult> {
    try {
      if (!Object.values(SocialPlatform).includes(request.platform)) {
        return {
          success: false,
          errorMessage: `Unsupported platform: ${request.platform}`,
        };
      }

      const { clientId } = this.oauthConfigService.getOAuthCredentials(request.platform);
      const redirectUri = this.oauthConfigService.getRedirectUri();
      const scopes = request.customScopes || this.oauthConfigService.getDefaultScopes(request.platform);
      const state = request.state || this.oauthConfigService.generateState(request.platform.toLowerCase());

      let authorizationUrl: string;

      switch (request.platform) {
        case SocialPlatform.FACEBOOK:
          authorizationUrl = this.buildFacebookAuthUrl(clientId, redirectUri, scopes, state);
          break;
        case SocialPlatform.YOUTUBE:
          authorizationUrl = this.buildGoogleAuthUrl(clientId, redirectUri, scopes, state);
          break;
        case SocialPlatform.TIKTOK:
          authorizationUrl = this.buildTikTokAuthUrl(clientId, redirectUri, scopes, state);
          break;
        case SocialPlatform.X:
          authorizationUrl = this.buildTwitterAuthUrl(clientId, redirectUri, scopes, state);
          break;
        case SocialPlatform.INSTAGRAM:
          authorizationUrl = this.buildInstagramAuthUrl(clientId, redirectUri, scopes, state);
          break;
        case SocialPlatform.ZALO:
          authorizationUrl = this.buildZaloAuthUrl(clientId, redirectUri, scopes, state);
          break;
        case SocialPlatform.TELEGRAM:
          authorizationUrl = this.buildTelegramAuthUrl(clientId, redirectUri, scopes, state);
          break;
        default:
          return {
            success: false,
            errorMessage: `Platform ${request.platform} not implemented`,
          };
      }

      return {
        success: true,
        authorizationUrl,
        state,
      };
    } catch (error) {
      return {
        success: false,
        errorMessage: `Failed to generate authorization URL: ${error.message}`,
      };
    }
  }

  async exchangeCodeForToken(platform: SocialPlatform, code: string, state: string): Promise<TokenExchangeResult> {
    try {
      const { clientId, clientSecret } = this.oauthConfigService.getOAuthCredentials(platform);
      const redirectUri = this.oauthConfigService.getRedirectUri();

      let tokenResponse;

      switch (platform) {
        case SocialPlatform.FACEBOOK:
          tokenResponse = await this.exchangeFacebookCode(clientId, clientSecret, code, redirectUri);
          break;
        case SocialPlatform.YOUTUBE:
          tokenResponse = await this.exchangeGoogleCode(clientId, clientSecret, code, redirectUri);
          break;
        case SocialPlatform.TIKTOK:
          tokenResponse = await this.exchangeTikTokCode(clientId, clientSecret, code, redirectUri);
          break;
        case SocialPlatform.X:
          tokenResponse = await this.exchangeTwitterCode(clientId, clientSecret, code, redirectUri);
          break;
        case SocialPlatform.INSTAGRAM:
          tokenResponse = await this.exchangeInstagramCode(clientId, clientSecret, code, redirectUri);
          break;
        case SocialPlatform.ZALO:
          tokenResponse = await this.exchangeZaloCode(clientId, clientSecret, code, redirectUri);
          break;
        case SocialPlatform.TELEGRAM:
          tokenResponse = await this.exchangeTelegramCode(clientId, clientSecret, code, redirectUri);
          break;
        default:
          return {
            success: false,
            errorMessage: `Platform ${platform} not implemented`,
          };
      }

      return {
        success: true,
        ...tokenResponse,
      };
    } catch (error) {
      return {
        success: false,
        errorMessage: `Failed to exchange code for token: ${error.message}`,
      };
    }
  }

  private buildFacebookAuthUrl(clientId: string, redirectUri: string, scopes: string[], state: string): string {
    const baseUrl = 'https://www.facebook.com/v18.0/dialog/oauth';
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes.join(','),
      response_type: 'code',
      state,
    });
    return `${baseUrl}?${params.toString()}`;
  }

  private buildGoogleAuthUrl(clientId: string, redirectUri: string, scopes: string[], state: string): string {
    const baseUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes.join(' '),
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      state,
    });
    return `${baseUrl}?${params.toString()}`;
  }

  private buildTikTokAuthUrl(clientId: string, redirectUri: string, scopes: string[], state: string): string {
    const baseUrl = 'https://www.tiktok.com/v2/auth/authorize/';
    const params = new URLSearchParams({
      client_key: clientId,
      redirect_uri: redirectUri,
      scope: scopes.join(','),
      response_type: 'code',
      state,
    });
    return `${baseUrl}?${params.toString()}`;
  }

  private buildTwitterAuthUrl(clientId: string, redirectUri: string, scopes: string[], state: string): string {
    const baseUrl = 'https://twitter.com/i/oauth2/authorize';
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes.join(' '),
      response_type: 'code',
      code_challenge: 'challenge',
      code_challenge_method: 'plain',
      state,
    });
    return `${baseUrl}?${params.toString()}`;
  }

  private buildInstagramAuthUrl(clientId: string, redirectUri: string, scopes: string[], state: string): string {
    const baseUrl = 'https://api.instagram.com/oauth/authorize';
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes.join(','),
      response_type: 'code',
      state,
    });
    return `${baseUrl}?${params.toString()}`;
  }

  private buildZaloAuthUrl(clientId: string, redirectUri: string, scopes: string[], state: string): string {
    const baseUrl = 'https://oauth.zaloapp.com/v4/permission';
    const params = new URLSearchParams({
      app_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes.join(','),
      response_type: 'code',
      state,
    });
    return `${baseUrl}?${params.toString()}`;
  }

  private buildTelegramAuthUrl(clientId: string, redirectUri: string, scopes: string[], state: string): string {
    // Telegram uses a different auth flow, this is a simplified version
    const baseUrl = 'https://oauth.telegram.org/auth';
    const params = new URLSearchParams({
      bot_id: clientId,
      origin: redirectUri,
      request_access: 'write',
      return_to: redirectUri,
    });
    return `${baseUrl}?${params.toString()}`;
  }

  private async exchangeFacebookCode(clientId: string, clientSecret: string, code: string, redirectUri: string) {
    const response = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      },
    });
    return response.data;
  }

  private async exchangeGoogleCode(clientId: string, clientSecret: string, code: string, redirectUri: string) {
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code,
    });
    return response.data;
  }

  private async exchangeTikTokCode(clientId: string, clientSecret: string, code: string, redirectUri: string) {
    const response = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', {
      client_key: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code,
    });
    return response.data;
  }

  private async exchangeTwitterCode(clientId: string, clientSecret: string, code: string, redirectUri: string) {
    const response = await axios.post('https://api.twitter.com/2/oauth2/token', {
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code,
      code_verifier: 'challenge',
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  }

  private async exchangeInstagramCode(clientId: string, clientSecret: string, code: string, redirectUri: string) {
    const response = await axios.post('https://api.instagram.com/oauth/access_token', {
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code,
    });
    return response.data;
  }

  private async exchangeZaloCode(clientId: string, clientSecret: string, code: string, redirectUri: string) {
    const response = await axios.post('https://oauth.zaloapp.com/v4/access_token', {
      app_id: clientId,
      app_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code,
    });
    return response.data;
  }

  private async exchangeTelegramCode(clientId: string, clientSecret: string, code: string, redirectUri: string) {
    // Telegram doesn't use traditional OAuth2, this is placeholder
    return {
      access_token: code,
      token_type: 'bearer',
    };
  }
}
