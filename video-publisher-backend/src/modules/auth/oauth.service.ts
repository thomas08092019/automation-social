import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SocialPlatform } from '@prisma/client';
import { OAuthConfigService } from './oauth-config.service';
import { OAuthUtils } from '../../shared/utils/oauth.utils';
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
      const scopes = request.customScopes || OAuthUtils.getDefaultScopes(request.platform);
      const state = request.state || this.oauthConfigService.generateState(request.platform.toLowerCase());

      const authorizationUrl = OAuthUtils.buildAuthorizationUrl(
        request.platform,
        clientId,
        redirectUri,
        scopes,
        state,
      );

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

      // Special handling for Telegram since it doesn't use traditional OAuth2
      if (platform === SocialPlatform.TELEGRAM) {
        return {
          success: true,
          accessToken: code,
          tokenType: 'bearer',
        };
      }

      const tokenResponse = await OAuthUtils.exchangeCodeForToken(
        platform,
        clientId,
        clientSecret,
        code,
        redirectUri,
      );

      return {
        success: true,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresIn: tokenResponse.expires_in,
        tokenType: tokenResponse.token_type,
        scope: tokenResponse.scope,
      };
    } catch (error) {
      return {
        success: false,
        errorMessage: `Failed to exchange code for token: ${error.message}`,
      };
    }
  }
}
