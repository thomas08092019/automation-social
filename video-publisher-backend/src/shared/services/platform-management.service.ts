import { Injectable, Logger } from '@nestjs/common';
import { SocialPlatform } from '@prisma/client';
import { PlatformAdapterFactory } from '../adapters/platform-adapter.factory';
import { PlatformAdapter } from '../adapters/platform-adapter.interface';

export interface ContentValidationResult {
  platform: SocialPlatform;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface BatchPostRequest {
  platforms: SocialPlatform[];
  content: {
    text?: string;
    mediaUrls?: string[];
    mediaType?: 'image' | 'video';
    scheduledTime?: Date;
  };
  options?: {
    skipValidation?: boolean;
    continueOnError?: boolean;
  };
}

export interface BatchPostResult {
  success: boolean;
  results: Array<{
    platform: SocialPlatform;
    success: boolean;
    postId?: string;
    error?: string;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

@Injectable()
export class PlatformManagementService {
  private readonly logger = new Logger(PlatformManagementService.name);

  constructor(
    private readonly adapterFactory: PlatformAdapterFactory,
  ) {}

  /**
   * Validate content across multiple platforms
   */
  async validateContentForPlatforms(
    platforms: SocialPlatform[],
    content: {
      text?: string;
      mediaUrls?: string[];
      mediaType?: 'image' | 'video';
    }
  ): Promise<ContentValidationResult[]> {
    const results: ContentValidationResult[] = [];

    for (const platform of platforms) {
      try {
        const validation = this.adapterFactory.validateContent(platform, content);
        const warnings = this.generateContentWarnings(platform, content);

        results.push({
          platform,
          valid: validation.valid,
          errors: validation.errors,
          warnings,
        });
      } catch (error) {
        this.logger.error(`Failed to validate content for ${platform}`, error);
        results.push({
          platform,
          valid: false,
          errors: [`Validation failed: ${error.message}`],
          warnings: [],
        });
      }
    }

    return results;
  }

  /**
   * Post content to multiple platforms
   */
  async batchPost(request: BatchPostRequest): Promise<BatchPostResult> {
    const { platforms, content, options = {} } = request;
    const results: BatchPostResult['results'] = [];

    // Validate content first unless skipped
    if (!options.skipValidation) {
      const validations = await this.validateContentForPlatforms(platforms, content);
      const invalidPlatforms = validations.filter(v => !v.valid);
      
      if (invalidPlatforms.length > 0 && !options.continueOnError) {
        return {
          success: false,
          results: invalidPlatforms.map(v => ({
            platform: v.platform,
            success: false,
            error: v.errors.join(', '),
          })),
          summary: {
            total: platforms.length,
            successful: 0,
            failed: invalidPlatforms.length,
          },
        };
      }
    }

    // Post to each platform
    for (const platform of platforms) {
      try {
        const adapter = this.adapterFactory.getAdapter(platform);
        
        // Transform content for the specific platform
        const transformedContent = await this.transformContentForPlatform(
          adapter,
          content
        );

        const postId = await adapter.createPost(transformedContent);

        results.push({
          platform,
          success: true,
          postId,
        });

        this.logger.log(`Successfully posted to ${platform}: ${postId}`);
      } catch (error) {
        this.logger.error(`Failed to post to ${platform}`, error);
        
        results.push({
          platform,
          success: false,
          error: error.message,
        });

        // Stop on first error unless continueOnError is true
        if (!options.continueOnError) {
          break;
        }
      }
    }

    const summary = {
      total: platforms.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    };

    return {
      success: summary.failed === 0,
      results,
      summary,
    };
  }

  /**
   * Get optimal posting strategy for platforms
   */
  getOptimalPostingStrategy(platforms: SocialPlatform[]): {
    recommendations: Array<{
      platform: SocialPlatform;
      bestTimes: string[];
      contentTips: string[];
      hashtagStrategy: string;
    }>;
  } {
    const recommendations = platforms.map(platform => {
      const adapter = this.adapterFactory.getAdapter(platform);
      
      return {
        platform,
        bestTimes: this.getBestPostingTimes(platform),
        contentTips: this.getContentTips(platform, adapter),
        hashtagStrategy: this.getHashtagStrategy(platform, adapter),
      };
    });

    return { recommendations };
  }

  /**
   * Get platform analytics summary
   */
  async getPlatformAnalytics(
    platforms: SocialPlatform[],
    dateRange: { start: Date; end: Date }
  ): Promise<Record<SocialPlatform, any>> {
    const analytics: Record<string, any> = {};

    for (const platform of platforms) {
      try {
        const adapter = this.adapterFactory.getAdapter(platform);
        
        if (adapter.capabilities.supportsAnalytics) {
          analytics[platform] = await adapter.getAnalytics(dateRange);
        } else {
          analytics[platform] = {
            supported: false,
            message: 'Analytics not supported for this platform',
          };
        }
      } catch (error) {
        this.logger.error(`Failed to get analytics for ${platform}`, error);
        analytics[platform] = {
          error: error.message,
        };
      }
    }

    return analytics;
  }

  /**
   * Transform content for specific platform requirements
   */
  private async transformContentForPlatform(
    adapter: PlatformAdapter,
    content: any
  ): Promise<any> {
    const transformed = { ...content };

    // Truncate text if needed
    if (content.text && adapter.capabilities.maxTextLength) {
      if (content.text.length > adapter.capabilities.maxTextLength) {
        transformed.text = content.text.substring(0, adapter.capabilities.maxTextLength - 3) + '...';
      }
    }

    // Handle hashtags based on platform
    if (content.text && content.text.includes('#')) {
      transformed.text = this.optimizeHashtags(transformed.text, adapter);
    }

    return transformed;
  }

  /**
   * Generate content warnings for platform
   */
  private generateContentWarnings(
    platform: SocialPlatform,
    content: any
  ): string[] {
    const warnings: string[] = [];
    const adapter = this.adapterFactory.getAdapter(platform);

    // Check if approaching text limit
    if (content.text && adapter.capabilities.maxTextLength) {
      const ratio = content.text.length / adapter.capabilities.maxTextLength;
      if (ratio > 0.9) {
        warnings.push('Text is approaching maximum length limit');
      }
    }

    // Check for platform-specific best practices
    if (platform === SocialPlatform.INSTAGRAM && content.text && !content.text.includes('#')) {
      warnings.push('Consider adding hashtags for better discoverability on Instagram');
    }

    if (platform === SocialPlatform.YOUTUBE && content.mediaType !== 'video') {
      warnings.push('YouTube works best with video content');
    }

    return warnings;
  }

  /**
   * Get best posting times for platform
   */
  private getBestPostingTimes(platform: SocialPlatform): string[] {
    const times = {
      [SocialPlatform.FACEBOOK]: ['9:00 AM', '1:00 PM', '3:00 PM'],
      [SocialPlatform.INSTAGRAM]: ['11:00 AM', '2:00 PM', '5:00 PM'],
      [SocialPlatform.YOUTUBE]: ['2:00 PM', '8:00 PM', '9:00 PM'],
      [SocialPlatform.TIKTOK]: ['6:00 AM', '10:00 AM', '7:00 PM'],
      [SocialPlatform.X]: ['9:00 AM', '12:00 PM', '5:00 PM'],
      [SocialPlatform.ZALO]: ['10:00 AM', '2:00 PM', '8:00 PM'],
      [SocialPlatform.TELEGRAM]: ['Any time'],
    };

    return times[platform] || ['9:00 AM', '2:00 PM', '7:00 PM'];
  }

  /**
   * Get content tips for platform
   */
  private getContentTips(platform: SocialPlatform, adapter: PlatformAdapter): string[] {
    const tips: Record<SocialPlatform, string[]> = {
      [SocialPlatform.FACEBOOK]: [
        'Use engaging visuals',
        'Ask questions to encourage comments',
        'Post consistently',
      ],
      [SocialPlatform.INSTAGRAM]: [
        'Use high-quality images',
        'Include relevant hashtags',
        'Use Stories for behind-the-scenes content',
      ],
      [SocialPlatform.YOUTUBE]: [
        'Create eye-catching thumbnails',
        'Write compelling titles',
        'Use end screens and cards',
      ],
      [SocialPlatform.TIKTOK]: [
        'Follow trending challenges',
        'Use trending sounds',
        'Keep videos under 60 seconds',
      ],
      [SocialPlatform.X]: [
        'Use relevant hashtags',
        'Engage with trending topics',
        'Keep it concise',
      ],
      [SocialPlatform.ZALO]: [
        'Use Vietnamese language',
        'Share local content',
        'Engage with community',
      ],
      [SocialPlatform.TELEGRAM]: [
        'Use channels for broadcasting',
        'Create engaging groups',
        'Share valuable content',
      ],
    };

    return tips[platform] || ['Create engaging content', 'Post regularly', 'Engage with audience'];
  }

  /**
   * Get hashtag strategy for platform
   */
  private getHashtagStrategy(platform: SocialPlatform, adapter: PlatformAdapter): string {
    const strategies = {
      [SocialPlatform.FACEBOOK]: 'Use 1-2 relevant hashtags',
      [SocialPlatform.INSTAGRAM]: 'Use 11-30 mix of popular and niche hashtags',
      [SocialPlatform.YOUTUBE]: 'Use hashtags in title and description',
      [SocialPlatform.TIKTOK]: 'Use 3-5 trending and relevant hashtags',
      [SocialPlatform.X]: 'Use 1-2 hashtags per tweet',
      [SocialPlatform.ZALO]: 'Use Vietnamese hashtags sparingly',
      [SocialPlatform.TELEGRAM]: 'Hashtags not commonly used',
    };

    return strategies[platform] || 'Use relevant hashtags moderately';
  }

  /**
   * Optimize hashtags for specific platform
   */
  private optimizeHashtags(text: string, adapter: PlatformAdapter): string {
    // This is a simplified implementation
    // In a real-world scenario, you might use AI or more sophisticated logic
    return text;
  }
}
