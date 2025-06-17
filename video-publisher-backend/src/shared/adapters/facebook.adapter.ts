import { SocialPlatform } from '@prisma/client';
import { BasePlatformAdapter } from './base-platform.adapter';
import { 
  PlatformCapabilities, 
  PostPublishParams, 
  PostPublishResult, 
  TokenResponse, 
  PlatformCredentials 
} from './platform-adapter.interface';

export class FacebookAdapter extends BasePlatformAdapter {
  readonly platform = SocialPlatform.FACEBOOK;  readonly capabilities: PlatformCapabilities = {
    supportsText: true,
    supportsImages: true,
    supportsVideos: true,
    supportsMultipleMedia: true,
    supportsScheduling: true,
    supportsHashtags: true,
    supportsLocation: true,
    supportsAnalytics: true,
    maxTextLength: 63206,
    maxMediaCount: 10,
    supportedVideoFormats: ['mp4', 'mov', 'avi'],
    supportedImageFormats: ['jpg', 'jpeg', 'png', 'gif'],
  };

  async refreshAccessToken(refreshToken: string, credentials: PlatformCredentials): Promise<TokenResponse> {
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
      const postData: any = {
        message: params.content.text,
        access_token: params.accessToken,
      };

      // Handle media attachments
      if (params.content.mediaUrls && params.content.mediaUrls.length > 0) {
        if (params.content.mediaUrls.length === 1) {
          // Single media post
          const mediaUrl = params.content.mediaUrls[0];
          if (this.isVideo(mediaUrl)) {
            postData.source = mediaUrl;
            return this.publishVideo(postData);
          } else {
            postData.url = mediaUrl;
            return this.publishPhoto(postData);
          }
        } else {
          // Multiple media post
          return this.publishMultipleMedia(params);
        }
      }

      // Text-only post
      const response = await this.makeRequest({
        url: 'https://graph.facebook.com/me/feed',
        method: 'POST',
        data: postData,
      });

      return {
        success: true,
        postId: response.id,
        postUrl: `https://www.facebook.com/${response.id}`,
      };
    } catch (error) {
      return {
        success: false,
        errorMessage: `Facebook post failed: ${error.message}`,
      };
    }
  }

  async getAccountMetrics(accessToken: string): Promise<Record<string, any>> {
    try {
      const response = await this.makeRequest({
        url: 'https://graph.facebook.com/me',
        method: 'GET',
        params: {
          fields: 'id,name,email,friends.summary(true),likes.summary(true)',
          access_token: accessToken,
        },
      });

      return {
        followersCount: response.friends?.summary?.total_count || 0,
        likesCount: response.likes?.summary?.total_count || 0,
        profileData: {
          id: response.id,
          name: response.name,
          email: response.email,
        },
      };
    } catch (error) {
      throw new Error(`Failed to get Facebook metrics: ${error.message}`);
    }
  }

  async getPlatformSpecificData(accessToken: string, dataType: string): Promise<any> {
    switch (dataType) {
      case 'pages':
        return this.getPages(accessToken);
      case 'groups':
        return this.getGroups(accessToken);
      case 'albums':
        return this.getAlbums(accessToken);
      default:
        throw new Error(`Unsupported data type: ${dataType}`);
    }
  }

  // Analytics method implementation
  async getAnalytics(dateRange: { start: Date; end: Date }): Promise<any> {
    // Facebook Analytics implementation
    try {
      // This would be a real implementation calling Facebook Graph API
      return {
        platform: this.platform,
        dateRange,
        metrics: {
          reach: 0,
          impressions: 0,
          engagement: 0,
          clicks: 0,
        },
        // Mock data - replace with real Facebook Analytics API calls
        message: 'Facebook analytics not fully implemented yet'
      };
    } catch (error) {
      throw new Error(`Failed to get Facebook analytics: ${error.message}`);
    }
  }

  // Private helper methods
  private async publishPhoto(postData: any): Promise<PostPublishResult> {
    const response = await this.makeRequest({
      url: 'https://graph.facebook.com/me/photos',
      method: 'POST',
      data: postData,
    });

    return {
      success: true,
      postId: response.id,
      postUrl: `https://www.facebook.com/photo.php?fbid=${response.id}`,
    };
  }

  private async publishVideo(postData: any): Promise<PostPublishResult> {
    const response = await this.makeRequest({
      url: 'https://graph-video.facebook.com/me/videos',
      method: 'POST',
      data: postData,
    });

    return {
      success: true,
      postId: response.id,
      postUrl: `https://www.facebook.com/watch/?v=${response.id}`,
    };
  }

  private async publishMultipleMedia(params: PostPublishParams): Promise<PostPublishResult> {
    // Implement multiple media post logic
    // This is more complex and requires creating media objects first
    throw new Error('Multiple media posts not implemented yet');
  }

  private isVideo(url: string): boolean {
    const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'wmv'];
    const extension = url.split('.').pop()?.toLowerCase();
    return videoExtensions.includes(extension || '');
  }

  private async getPages(accessToken: string): Promise<any> {
    return this.makeRequest({
      url: 'https://graph.facebook.com/me/accounts',
      method: 'GET',
      params: {
        access_token: accessToken,
        fields: 'id,name,category,access_token',
      },
    });
  }

  private async getGroups(accessToken: string): Promise<any> {
    return this.makeRequest({
      url: 'https://graph.facebook.com/me/groups',
      method: 'GET',
      params: {
        access_token: accessToken,
        fields: 'id,name,privacy',
      },
    });
  }

  private async getAlbums(accessToken: string): Promise<any> {
    return this.makeRequest({
      url: 'https://graph.facebook.com/me/albums',
      method: 'GET',
      params: {
        access_token: accessToken,
        fields: 'id,name,count',
      },
    });
  }
}
