import { SocialPlatform } from '@prisma/client';
import { BasePlatformAdapter } from './base-platform.adapter';
import { 
  PlatformCapabilities, 
  PostPublishParams, 
  PostPublishResult, 
  TokenResponse, 
  PlatformCredentials 
} from './platform-adapter.interface';

export class TikTokAdapter extends BasePlatformAdapter {
  readonly platform = SocialPlatform.TIKTOK;  readonly capabilities: PlatformCapabilities = {
    supportsText: true,
    supportsImages: false,
    supportsVideos: true,
    supportsMultipleMedia: false,
    supportsScheduling: false,
    supportsHashtags: true,
    supportsLocation: false,
    supportsAnalytics: true,
    maxTextLength: 2200,
    maxMediaCount: 1,
    supportedVideoFormats: ['mp4', 'mov', 'avi'],
    supportedImageFormats: [],
  };

  async refreshAccessToken(refreshToken: string, credentials: PlatformCredentials): Promise<TokenResponse> {
    const response = await this.makeRequest({
      url: 'https://open.tiktokapis.com/v2/oauth/token/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: new URLSearchParams({
        client_key: credentials.clientId,
        client_secret: credentials.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }).toString(),
    });

    return {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      expiresIn: response.expires_in,
      tokenType: 'Bearer',
      scope: response.scope,
    };
  }

  async publishPost(params: PostPublishParams): Promise<PostPublishResult> {
    try {
      if (!params.content.mediaUrls || params.content.mediaUrls.length === 0) {
        throw new Error('TikTok requires video content');
      }

      const videoUrl = params.content.mediaUrls[0];
      
      // Step 1: Initialize upload
      const initResponse = await this.makeRequest({
        url: 'https://open.tiktokapis.com/v2/post/publish/inbox/video/init/',
        method: 'POST',
        headers: this.getAuthHeaders(params.accessToken),
        data: {
          post_info: {
            title: params.content.title || params.content.text || '',
            privacy_level: 'SELF_ONLY', // or PUBLIC_TO_EVERYONE
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
            video_cover_timestamp_ms: 1000,
          },
          source_info: {
            source: 'FILE_UPLOAD',
            video_size: 0, // Would need actual file size
            chunk_size: 10485760, // 10MB chunks
            total_chunk_count: 1,
          },
        },
      });

      // Step 2: Upload video chunks (simplified)
      // In real implementation, you'd need to handle file chunking
      
      return {
        success: true,
        postId: initResponse.data.publish_id,
        postUrl: `https://www.tiktok.com/@username/video/${initResponse.data.publish_id}`,
      };
    } catch (error) {
      return {
        success: false,
        errorMessage: `TikTok upload failed: ${error.message}`,
      };
    }
  }

  async getAccountMetrics(accessToken: string): Promise<Record<string, any>> {
    try {
      const response = await this.makeRequest({
        url: 'https://open.tiktokapis.com/v2/user/info/',
        method: 'GET',
        headers: this.getAuthHeaders(accessToken),
        params: {
          fields: 'open_id,union_id,avatar_url,display_name,bio_description,profile_deep_link,follower_count,following_count,likes_count,video_count',
        },
      });

      const user = response.data.user;
      return {
        openId: user.open_id,
        displayName: user.display_name,
        followerCount: user.follower_count,
        followingCount: user.following_count,
        likesCount: user.likes_count,
        videoCount: user.video_count,
        avatarUrl: user.avatar_url,
        bio: user.bio_description,
      };
    } catch (error) {
      throw new Error(`Failed to get TikTok metrics: ${error.message}`);
    }
  }

  async getPlatformSpecificData(accessToken: string, dataType: string): Promise<any> {
    switch (dataType) {
      case 'videos':
        return this.getVideos(accessToken);
      case 'comments':
        return this.getComments(accessToken);
      default:
        throw new Error(`Unsupported data type: ${dataType}`);
    }
  }

  private async getVideos(accessToken: string): Promise<any> {
    return this.makeRequest({
      url: 'https://open.tiktokapis.com/v2/video/list/',
      method: 'POST',
      headers: this.getAuthHeaders(accessToken),
      data: {
        max_count: 20,
        cursor: 0,
        fields: [
          'id',
          'title',
          'video_description',
          'duration',
          'cover_image_url',
          'share_url',
          'view_count',
          'like_count',
          'comment_count',
          'share_count',
        ],
      },
    });
  }

  private async getComments(accessToken: string): Promise<any> {
    // Comments API requires video ID
    return {
      message: 'Comments API requires specific video ID',
      endpoint: 'https://open.tiktokapis.com/v2/video/comment/list/',
    };
  }
}
