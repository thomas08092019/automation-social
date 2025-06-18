import {
  PlatformAdapter,
  AuthorizationUrlParams,
  TokenExchangeParams,
  TokenResponse,
  UserInfo,
  PlatformCredentials,
  PostPublishParams,
  PostPublishResult,
} from './platform-adapter.interface';
import { SocialPlatform } from '@prisma/client';
import { OAuthUtils } from '../utils/oauth.utils';
import { UserInfoUtils } from '../utils/user-info.utils';
import axios from 'axios';

export abstract class BasePlatformAdapter implements PlatformAdapter {
  abstract readonly platform: SocialPlatform;
  abstract readonly capabilities: any;

  // Common OAuth implementation using existing utils
  async generateAuthorizationUrl(
    params: AuthorizationUrlParams,
  ): Promise<string> {
    return OAuthUtils.buildAuthorizationUrl(
      this.platform,
      params.credentials.clientId,
      params.credentials.redirectUri,
      params.scopes,
      params.additionalParams?.state || 'default_state',
    );
  }

  async exchangeCodeForToken(
    params: TokenExchangeParams,
  ): Promise<TokenResponse> {
    const response = await OAuthUtils.exchangeCodeForToken(
      this.platform,
      params.credentials.clientId,
      params.credentials.clientSecret,
      params.code,
      params.credentials.redirectUri,
    );

    return {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      expiresIn: response.expires_in,
      tokenType: response.token_type || 'Bearer',
      scope: response.scope,
    };
  }

  async fetchUserInfo(accessToken: string): Promise<UserInfo> {
    const rawUserInfo = await UserInfoUtils.fetchUserInfo(
      this.platform,
      accessToken,
    );
    return UserInfoUtils.normalizeUserInfo(this.platform, rawUserInfo);
  }

  async validateToken(accessToken: string): Promise<boolean> {
    try {
      await this.fetchUserInfo(accessToken);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getAccountInfo(accessToken: string): Promise<UserInfo> {
    return this.fetchUserInfo(accessToken);
  }
  // Abstract methods that must be implemented by each platform
  abstract refreshAccessToken(
    refreshToken: string,
    credentials: PlatformCredentials,
  ): Promise<TokenResponse>;
  abstract publishPost(params: PostPublishParams): Promise<PostPublishResult>;
  abstract getAccountMetrics(accessToken: string): Promise<Record<string, any>>;
  abstract getPlatformSpecificData(
    accessToken: string,
    dataType: string,
  ): Promise<any>;

  // Simplified content creation method
  async createPost(content: any): Promise<string> {
    // This is a simplified implementation
    // Each platform adapter should override this method for platform-specific logic
    const result = await this.publishPost({
      accessToken: content.accessToken || '', // This should be provided
      content: {
        text: content.text,
        mediaUrls: content.mediaUrls,
        title: content.title,
        description: content.description,
        tags: content.tags,
      },
      options: content.options,
    });

    if (!result.success) {
      throw new Error(result.errorMessage || 'Failed to create post');
    }

    return result.postId || 'unknown';
  }

  // Helper method for making HTTP requests
  protected async makeRequest(config: {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    data?: any;
    params?: Record<string, string>;
  }): Promise<any> {
    try {
      const response = await axios({
        method: config.method,
        url: config.url,
        headers: config.headers,
        data: config.data,
        params: config.params,
      });
      return response.data;
    } catch (error) {
      throw new Error(`HTTP request failed: ${error.message}`);
    }
  }

  // Helper method to get platform-specific headers
  protected getAuthHeaders(accessToken: string): Record<string, string> {
    return {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };
  }
}
