import { SocialPlatform } from '@prisma/client';
import { BasePlatformAdapter } from './base-platform.adapter';
import {
  PlatformCapabilities,
  PostPublishParams,
  PostPublishResult,
  TokenResponse,
  PlatformCredentials,
} from './platform-adapter.interface';

export class XAdapter extends BasePlatformAdapter {
  readonly platform = SocialPlatform.X;
  readonly capabilities: PlatformCapabilities = {
    supportsText: true,
    supportsImages: true,
    supportsVideos: true,
    supportsMultipleMedia: true,
    supportsScheduling: false,
    supportsHashtags: true,
    supportsLocation: true,
    supportsAnalytics: true,
    maxTextLength: 280,
    maxMediaCount: 4,
    supportedVideoFormats: ['mp4', 'mov'],
    supportedImageFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  };

  async refreshAccessToken(
    refreshToken: string,
    credentials: PlatformCredentials,
  ): Promise<TokenResponse> {
    const response = await this.makeRequest({
      url: 'https://api.twitter.com/2/oauth2/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64')}`,
      },
      data: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: credentials.clientId,
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
      const tweetData: any = {};

      // Add text content
      if (params.content.text) {
        tweetData.text = params.content.text;
      }

      // Handle media attachments
      if (params.content.mediaUrls && params.content.mediaUrls.length > 0) {
        const mediaIds = await this.uploadMedia(
          params.accessToken,
          params.content.mediaUrls,
        );
        tweetData.media = { media_ids: mediaIds };
      }

      // Publish tweet
      const response = await this.makeRequest({
        url: 'https://api.twitter.com/2/tweets',
        method: 'POST',
        headers: this.getAuthHeaders(params.accessToken),
        data: tweetData,
      });

      const tweetId = response.data.id;
      return {
        success: true,
        postId: tweetId,
        postUrl: `https://twitter.com/user/status/${tweetId}`,
      };
    } catch (error) {
      return {
        success: false,
        errorMessage: `X post failed: ${error.message}`,
      };
    }
  }

  async getAccountMetrics(accessToken: string): Promise<Record<string, any>> {
    try {
      const response = await this.makeRequest({
        url: 'https://api.twitter.com/2/users/me',
        method: 'GET',
        headers: this.getAuthHeaders(accessToken),
        params: {
          'user.fields':
            'public_metrics,description,location,profile_image_url,verified',
        },
      });

      const user = response.data;
      return {
        id: user.id,
        username: user.username,
        name: user.name,
        description: user.description,
        location: user.location,
        verified: user.verified,
        profileImageUrl: user.profile_image_url,
        metrics: {
          followersCount: user.public_metrics.followers_count,
          followingCount: user.public_metrics.following_count,
          tweetCount: user.public_metrics.tweet_count,
          listedCount: user.public_metrics.listed_count,
        },
      };
    } catch (error) {
      throw new Error(`Failed to get X metrics: ${error.message}`);
    }
  }

  async getPlatformSpecificData(
    accessToken: string,
    dataType: string,
  ): Promise<any> {
    switch (dataType) {
      case 'tweets':
        return this.getTweets(accessToken);
      case 'followers':
        return this.getFollowers(accessToken);
      case 'following':
        return this.getFollowing(accessToken);
      case 'mentions':
        return this.getMentions(accessToken);
      default:
        throw new Error(`Unsupported data type: ${dataType}`);
    }
  }

  private async uploadMedia(
    accessToken: string,
    mediaUrls: string[],
  ): Promise<string[]> {
    const mediaIds: string[] = [];

    for (const mediaUrl of mediaUrls) {
      try {
        // Step 1: Initialize media upload
        const initResponse = await this.makeRequest({
          url: 'https://upload.twitter.com/1.1/media/upload.json',
          method: 'POST',
          headers: this.getAuthHeaders(accessToken),
          data: {
            command: 'INIT',
            media_type: this.getMediaType(mediaUrl),
            total_bytes: 0, // Would need actual file size
          },
        });

        const mediaId = initResponse.media_id_string;

        // Step 2: Upload media chunks (simplified)
        // In real implementation, you'd need to handle file chunking

        // Step 3: Finalize upload
        await this.makeRequest({
          url: 'https://upload.twitter.com/1.1/media/upload.json',
          method: 'POST',
          headers: this.getAuthHeaders(accessToken),
          data: {
            command: 'FINALIZE',
            media_id: mediaId,
          },
        });

        mediaIds.push(mediaId);
      } catch (error) {
        console.error(`Failed to upload media ${mediaUrl}:`, error.message);
      }
    }

    return mediaIds;
  }

  private getMediaType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    const videoExtensions = ['mp4', 'mov', 'avi'];
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

    if (videoExtensions.includes(extension || '')) {
      return 'video/mp4';
    } else if (imageExtensions.includes(extension || '')) {
      return 'image/jpeg';
    }
    return 'image/jpeg'; // Default
  }

  private async getTweets(accessToken: string): Promise<any> {
    return this.makeRequest({
      url: 'https://api.twitter.com/2/users/me/tweets',
      method: 'GET',
      headers: this.getAuthHeaders(accessToken),
      params: {
        max_results: '10',
        'tweet.fields': 'created_at,public_metrics,context_annotations',
      },
    });
  }

  private async getFollowers(accessToken: string): Promise<any> {
    return this.makeRequest({
      url: 'https://api.twitter.com/2/users/me/followers',
      method: 'GET',
      headers: this.getAuthHeaders(accessToken),
      params: {
        max_results: '100',
        'user.fields': 'public_metrics',
      },
    });
  }

  private async getFollowing(accessToken: string): Promise<any> {
    return this.makeRequest({
      url: 'https://api.twitter.com/2/users/me/following',
      method: 'GET',
      headers: this.getAuthHeaders(accessToken),
      params: {
        max_results: '100',
        'user.fields': 'public_metrics',
      },
    });
  }

  private async getMentions(accessToken: string): Promise<any> {
    return this.makeRequest({
      url: 'https://api.twitter.com/2/users/me/mentions',
      method: 'GET',
      headers: this.getAuthHeaders(accessToken),
      params: {
        max_results: '10',
        'tweet.fields': 'created_at,public_metrics,author_id',
      },
    });
  }
}
