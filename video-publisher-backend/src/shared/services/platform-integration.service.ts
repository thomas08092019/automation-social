import { Injectable, Logger } from '@nestjs/common';
import { SocialPlatform } from '@prisma/client';
import { PlatformAdapterFactory } from '../adapters/platform-adapter.factory';
import {
  PlatformCredentials,
  PostPublishParams,
  PostPublishResult,
  UserInfo,
} from '../adapters/platform-adapter.interface';

export interface SocialPublishRequest {
  platform: SocialPlatform;
  credentials: PlatformCredentials;
  content: {
    text?: string;
    mediaUrls?: string[];
    title?: string;
    description?: string;
    tags?: string[];
  };
  options?: Record<string, any>;
}

export interface SocialAccountMetrics {
  platform: SocialPlatform;
  data: Record<string, any>;
  fetchedAt: Date;
}

@Injectable()
export class PlatformIntegrationService {
  private readonly logger = new Logger(PlatformIntegrationService.name);

  constructor(private readonly adapterFactory: PlatformAdapterFactory) {}

  /**
   * Publish content to a social platform
   */
  async publishToplatform(
    request: SocialPublishRequest,
  ): Promise<PostPublishResult> {
    try {
      const adapter = this.adapterFactory.getAdapter(request.platform);

      // Validate content against platform capabilities
      const validation = this.adapterFactory.validateContent(request.platform, {
        text: request.content.text,
        mediaUrls: request.content.mediaUrls,
        mediaType: this.detectMediaType(request.content.mediaUrls),
      });

      if (!validation.valid) {
        return {
          success: false,
          errorMessage: `Content validation failed: ${validation.errors.join(', ')}`,
        };
      }

      // Publish using platform adapter
      const publishParams: PostPublishParams = {
        accessToken: request.credentials.clientSecret, // In real scenario, this would be the access token
        content: request.content,
        options: request.options,
      };

      const result = await adapter.publishPost(publishParams);

      this.logger.log(
        `Published to ${request.platform}: ${result.success ? 'Success' : 'Failed'}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to publish to ${request.platform}:`,
        error.message,
      );
      return {
        success: false,
        errorMessage: `Platform integration error: ${error.message}`,
      };
    }
  }

  /**
   * Get user info from platform
   */
  async getUserInfo(
    platform: SocialPlatform,
    accessToken: string,
  ): Promise<UserInfo> {
    const adapter = this.adapterFactory.getAdapter(platform);
    return adapter.fetchUserInfo(accessToken);
  }

  /**
   * Get account metrics from platform
   */
  async getAccountMetrics(
    platform: SocialPlatform,
    accessToken: string,
  ): Promise<SocialAccountMetrics> {
    try {
      const adapter = this.adapterFactory.getAdapter(platform);
      const data = await adapter.getAccountMetrics(accessToken);

      return {
        platform,
        data,
        fetchedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get metrics for ${platform}:`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * Validate access token for platform
   */
  async validateToken(
    platform: SocialPlatform,
    accessToken: string,
  ): Promise<boolean> {
    try {
      const adapter = this.adapterFactory.getAdapter(platform);
      return adapter.validateToken(accessToken);
    } catch (error) {
      this.logger.error(
        `Token validation failed for ${platform}:`,
        error.message,
      );
      return false;
    }
  }

  /**
   * Get platform capabilities
   */
  getPlatformCapabilities(platform?: SocialPlatform) {
    if (platform) {
      const adapter = this.adapterFactory.getAdapter(platform);
      return {
        platform,
        capabilities: adapter.capabilities,
      };
    }
    return this.adapterFactory.getPlatformCapabilities();
  }

  /**
   * Get platforms that support specific media type
   */
  getPlatformsByMediaSupport(
    mediaType: 'text' | 'images' | 'videos',
  ): SocialPlatform[] {
    return this.adapterFactory.getPlatformsByMediaSupport(mediaType);
  }

  /**
   * Refresh access token for platform
   */
  async refreshToken(
    platform: SocialPlatform,
    refreshToken: string,
    credentials: PlatformCredentials,
  ) {
    const adapter = this.adapterFactory.getAdapter(platform);
    return adapter.refreshAccessToken(refreshToken, credentials);
  }

  /**
   * Get platform-specific data
   */
  async getPlatformSpecificData(
    platform: SocialPlatform,
    accessToken: string,
    dataType: string,
  ): Promise<any> {
    const adapter = this.adapterFactory.getAdapter(platform);
    return adapter.getPlatformSpecificData(accessToken, dataType);
  }

  /**
   * Batch publish to multiple platforms
   */
  async batchPublish(
    requests: SocialPublishRequest[],
  ): Promise<PostPublishResult[]> {
    const results = await Promise.allSettled(
      requests.map((request) => this.publishToplatform(request)),
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          success: false,
          errorMessage: `Batch publish failed for ${requests[index].platform}: ${result.reason}`,
        };
      }
    });
  }

  /**
   * Get content suggestions based on platform capabilities
   */
  getContentSuggestions(platform: SocialPlatform, content: any) {
    const adapter = this.adapterFactory.getAdapter(platform);
    const capabilities = adapter.capabilities;
    const suggestions: string[] = [];

    // Text length suggestions
    if (content.text && capabilities.maxTextLength) {
      if (content.text.length > capabilities.maxTextLength) {
        suggestions.push(
          `Text is too long. Maximum length for ${platform} is ${capabilities.maxTextLength} characters.`,
        );
      }
    }

    // Media suggestions
    if (content.mediaUrls && content.mediaUrls.length > 0) {
      if (
        !capabilities.supportsImages &&
        this.detectMediaType(content.mediaUrls) === 'image'
      ) {
        suggestions.push(`${platform} does not support image posts.`);
      }
      if (
        !capabilities.supportsVideos &&
        this.detectMediaType(content.mediaUrls) === 'video'
      ) {
        suggestions.push(`${platform} does not support video posts.`);
      }
      if (
        capabilities.maxMediaCount &&
        content.mediaUrls.length > capabilities.maxMediaCount
      ) {
        suggestions.push(
          `Too many media files. ${platform} supports maximum ${capabilities.maxMediaCount} media files.`,
        );
      }
    }

    // Hashtag suggestions
    if (
      content.text &&
      content.text.includes('#') &&
      !capabilities.supportsHashtags
    ) {
      suggestions.push(`${platform} does not support hashtags.`);
    }

    return suggestions;
  }

  private detectMediaType(mediaUrls?: string[]): 'image' | 'video' | undefined {
    if (!mediaUrls || mediaUrls.length === 0) return undefined;

    const firstUrl = mediaUrls[0];
    const extension = firstUrl.split('.').pop()?.toLowerCase();

    const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'wmv', 'flv', 'webm'];
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];

    if (videoExtensions.includes(extension || '')) return 'video';
    if (imageExtensions.includes(extension || '')) return 'image';

    return undefined;
  }
}
