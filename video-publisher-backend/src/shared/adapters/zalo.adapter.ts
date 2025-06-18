import { SocialPlatform } from '@prisma/client';
import { BasePlatformAdapter } from './base-platform.adapter';
import {
  PlatformCapabilities,
  PostPublishParams,
  PostPublishResult,
  TokenResponse,
  PlatformCredentials,
} from './platform-adapter.interface';

export class ZaloAdapter extends BasePlatformAdapter {
  readonly platform = SocialPlatform.ZALO;
  readonly capabilities: PlatformCapabilities = {
    supportsText: true,
    supportsImages: true,
    supportsVideos: false,
    supportsMultipleMedia: false,
    supportsScheduling: false,
    supportsHashtags: false,
    supportsLocation: false,
    supportsAnalytics: false,
    maxTextLength: 1000,
    maxMediaCount: 1,
    supportedVideoFormats: [],
    supportedImageFormats: ['jpg', 'jpeg', 'png'],
  };

  async refreshAccessToken(
    refreshToken: string,
    credentials: PlatformCredentials,
  ): Promise<TokenResponse> {
    const response = await this.makeRequest({
      url: 'https://oauth.zaloapp.com/v4/access_token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: new URLSearchParams({
        app_id: credentials.clientId,
        app_secret: credentials.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }).toString(),
    });

    return {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      expiresIn: response.expires_in,
      tokenType: 'Bearer',
    };
  }

  async publishPost(params: PostPublishParams): Promise<PostPublishResult> {
    try {
      // Zalo API has limited posting capabilities
      // Most operations require special permissions
      return {
        success: false,
        errorMessage:
          'Zalo posting requires special API permissions and approvals',
      };
    } catch (error) {
      return {
        success: false,
        errorMessage: `Zalo post failed: ${error.message}`,
      };
    }
  }

  async getAccountMetrics(accessToken: string): Promise<Record<string, any>> {
    try {
      const response = await this.makeRequest({
        url: 'https://graph.zalo.me/v2.0/me',
        method: 'GET',
        params: {
          access_token: accessToken,
          fields: 'id,name,picture',
        },
      });

      return {
        id: response.id,
        name: response.name,
        picture: response.picture?.data?.url,
      };
    } catch (error) {
      throw new Error(`Failed to get Zalo metrics: ${error.message}`);
    }
  }

  async getPlatformSpecificData(
    accessToken: string,
    dataType: string,
  ): Promise<any> {
    switch (dataType) {
      case 'profile':
        return this.getProfile(accessToken);
      case 'friends':
        return this.getFriends(accessToken);
      default:
        throw new Error(`Unsupported data type: ${dataType}`);
    }
  }

  private async getProfile(accessToken: string): Promise<any> {
    return this.makeRequest({
      url: 'https://graph.zalo.me/v2.0/me',
      method: 'GET',
      params: {
        access_token: accessToken,
        fields: 'id,name,birthday,gender,picture',
      },
    });
  }

  private async getFriends(accessToken: string): Promise<any> {
    // Friends API requires special permissions
    return {
      message: 'Friends API requires additional permissions',
    };
  }
}
