import { SocialPlatform } from '@prisma/client';
import { BasePlatformAdapter } from './base-platform.adapter';
import {
  PlatformCapabilities,
  PostPublishParams,
  PostPublishResult,
  TokenResponse,
  PlatformCredentials,
} from './platform-adapter.interface';

export class InstagramAdapter extends BasePlatformAdapter {
  readonly platform = SocialPlatform.INSTAGRAM;
  readonly capabilities: PlatformCapabilities = {
    supportsText: true,
    supportsImages: true,
    supportsVideos: true,
    supportsMultipleMedia: true,
    supportsScheduling: false,
    supportsHashtags: true,
    supportsLocation: true,
    supportsAnalytics: true,
    maxTextLength: 2200,
    maxMediaCount: 10,
    supportedVideoFormats: ['mp4', 'mov'],
    supportedImageFormats: ['jpg', 'jpeg', 'png'],
  };

  async refreshAccessToken(
    refreshToken: string,
    credentials: PlatformCredentials,
  ): Promise<TokenResponse> {
    // Instagram uses Facebook's token refresh endpoint
    const response = await this.makeRequest({
      url: 'https://graph.facebook.com/v18.0/oauth/access_token',
      method: 'GET',
      params: {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
      },
    });

    return {
      accessToken: response.access_token,
      expiresIn: response.expires_in,
      tokenType: 'Bearer',
    };
  }

  async publishPost(params: PostPublishParams): Promise<PostPublishResult> {
    try {
      if (!params.content.mediaUrls || params.content.mediaUrls.length === 0) {
        throw new Error('Instagram requires media content');
      }

      // Instagram Basic Display API doesn't support publishing
      // This would require Instagram Graph API for Business accounts
      return {
        success: false,
        errorMessage:
          'Instagram publishing requires Business account and Graph API access',
      };
    } catch (error) {
      return {
        success: false,
        errorMessage: `Instagram post failed: ${error.message}`,
      };
    }
  }

  async getAccountMetrics(accessToken: string): Promise<Record<string, any>> {
    try {
      const response = await this.makeRequest({
        url: 'https://graph.instagram.com/me',
        method: 'GET',
        params: {
          fields: 'id,username,account_type,media_count',
          access_token: accessToken,
        },
      });

      return {
        id: response.id,
        username: response.username,
        accountType: response.account_type,
        mediaCount: response.media_count,
      };
    } catch (error) {
      throw new Error(`Failed to get Instagram metrics: ${error.message}`);
    }
  }

  async getPlatformSpecificData(
    accessToken: string,
    dataType: string,
  ): Promise<any> {
    switch (dataType) {
      case 'media':
        return this.getMedia(accessToken);
      case 'stories':
        return this.getStories(accessToken);
      default:
        throw new Error(`Unsupported data type: ${dataType}`);
    }
  }

  private async getMedia(accessToken: string): Promise<any> {
    return this.makeRequest({
      url: 'https://graph.instagram.com/me/media',
      method: 'GET',
      params: {
        fields: 'id,caption,media_type,media_url,thumbnail_url,timestamp',
        access_token: accessToken,
      },
    });
  }

  private async getStories(accessToken: string): Promise<any> {
    // Stories API requires special permissions
    return {
      message: 'Stories access requires additional permissions',
    };
  }
}
