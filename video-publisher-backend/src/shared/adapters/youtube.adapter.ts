import { SocialPlatform } from '@prisma/client';
import { BasePlatformAdapter } from './base-platform.adapter';
import {
  PlatformCapabilities,
  PostPublishParams,
  PostPublishResult,
  TokenResponse,
  PlatformCredentials,
} from './platform-adapter.interface';

export class YouTubeAdapter extends BasePlatformAdapter {
  readonly platform = SocialPlatform.YOUTUBE;
  readonly capabilities: PlatformCapabilities = {
    supportsText: true,
    supportsImages: false,
    supportsVideos: true,
    supportsMultipleMedia: false,
    supportsScheduling: true,
    supportsHashtags: true,
    supportsLocation: false,
    supportsAnalytics: true,
    maxTextLength: 5000, // Video description limit
    maxMediaCount: 1,
    supportedVideoFormats: ['mp4', 'mov', 'avi', 'wmv', 'flv', 'webm'],
    supportedImageFormats: [], // YouTube doesn't support image posts
  };

  async refreshAccessToken(
    refreshToken: string,
    credentials: PlatformCredentials,
  ): Promise<TokenResponse> {
    const response = await this.makeRequest({
      url: 'https://oauth2.googleapis.com/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
      }).toString(),
    });

    return {
      accessToken: response.access_token,
      expiresIn: response.expires_in,
      tokenType: 'Bearer',
      scope: response.scope,
    };
  }

  async publishPost(params: PostPublishParams): Promise<PostPublishResult> {
    try {
      if (!params.content.mediaUrls || params.content.mediaUrls.length === 0) {
        throw new Error('YouTube requires video content');
      }

      const videoUrl = params.content.mediaUrls[0];
      const videoMetadata = {
        snippet: {
          title: params.content.title || 'Untitled Video',
          description: params.content.description || params.content.text || '',
          tags: params.content.tags || [],
          categoryId: '22', // People & Blogs category
        },
        status: {
          privacyStatus: params.options?.privacy || 'public',
          selfDeclaredMadeForKids: false,
        },
      };

      // Upload video to YouTube
      const response = await this.uploadVideo(
        params.accessToken,
        videoUrl,
        videoMetadata,
      );

      return {
        success: true,
        postId: response.id,
        postUrl: `https://www.youtube.com/watch?v=${response.id}`,
      };
    } catch (error) {
      return {
        success: false,
        errorMessage: `YouTube upload failed: ${error.message}`,
      };
    }
  }

  async getAccountMetrics(accessToken: string): Promise<Record<string, any>> {
    try {
      // Get channel info
      const channelResponse = await this.makeRequest({
        url: 'https://www.googleapis.com/youtube/v3/channels',
        method: 'GET',
        headers: this.getAuthHeaders(accessToken),
        params: {
          part: 'snippet,statistics',
          mine: 'true',
        },
      });

      const channel = channelResponse.items[0];
      const stats = channel.statistics;

      return {
        channelId: channel.id,
        channelTitle: channel.snippet.title,
        subscriberCount: parseInt(stats.subscriberCount || '0'),
        videoCount: parseInt(stats.videoCount || '0'),
        viewCount: parseInt(stats.viewCount || '0'),
        thumbnails: channel.snippet.thumbnails,
      };
    } catch (error) {
      throw new Error(`Failed to get YouTube metrics: ${error.message}`);
    }
  }

  async getPlatformSpecificData(
    accessToken: string,
    dataType: string,
  ): Promise<any> {
    switch (dataType) {
      case 'playlists':
        return this.getPlaylists(accessToken);
      case 'videos':
        return this.getVideos(accessToken);
      case 'comments':
        return this.getComments(accessToken);
      case 'analytics':
        // For legacy compatibility, use default date range
        const defaultDateRange = {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          end: new Date(),
        };
        return this.getAnalytics(defaultDateRange);
      default:
        throw new Error(`Unsupported data type: ${dataType}`);
    }
  }

  // Private helper methods
  private async uploadVideo(
    accessToken: string,
    videoUrl: string,
    metadata: any,
  ): Promise<any> {
    // Step 1: Create video resource
    const createResponse = await this.makeRequest({
      url: 'https://www.googleapis.com/youtube/v3/videos',
      method: 'POST',
      headers: this.getAuthHeaders(accessToken),
      params: {
        part: 'snippet,status',
      },
      data: metadata,
    });

    // Step 2: Upload video file (simplified - in real implementation, use resumable upload)
    // This is a simplified version - actual implementation would need resumable upload
    const uploadResponse = await this.makeRequest({
      url: `https://www.googleapis.com/upload/youtube/v3/videos`,
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(accessToken),
        'Content-Type': 'video/*',
      },
      params: {
        part: 'snippet,status',
        uploadType: 'media',
      },
      data: videoUrl, // In real implementation, this would be video binary data
    });

    return uploadResponse;
  }

  private async getPlaylists(accessToken: string): Promise<any> {
    return this.makeRequest({
      url: 'https://www.googleapis.com/youtube/v3/playlists',
      method: 'GET',
      headers: this.getAuthHeaders(accessToken),
      params: {
        part: 'snippet,contentDetails',
        mine: 'true',
        maxResults: '50',
      },
    });
  }

  private async getVideos(accessToken: string): Promise<any> {
    return this.makeRequest({
      url: 'https://www.googleapis.com/youtube/v3/search',
      method: 'GET',
      headers: this.getAuthHeaders(accessToken),
      params: {
        part: 'snippet',
        forMine: 'true',
        type: 'video',
        maxResults: '50',
      },
    });
  }

  private async getComments(accessToken: string): Promise<any> {
    return this.makeRequest({
      url: 'https://www.googleapis.com/youtube/v3/commentThreads',
      method: 'GET',
      headers: this.getAuthHeaders(accessToken),
      params: {
        part: 'snippet',
        allThreadsRelatedToChannelId: 'mine',
        maxResults: '50',
      },
    });
  }

  async getAnalytics(dateRange: { start: Date; end: Date }): Promise<any> {
    // YouTube Analytics API requires separate access
    // This is a placeholder for analytics data
    return {
      message: 'YouTube Analytics requires YouTube Analytics API access',
      availableMetrics: ['views', 'likes', 'comments', 'shares', 'watchTime'],
    };
  }
}
