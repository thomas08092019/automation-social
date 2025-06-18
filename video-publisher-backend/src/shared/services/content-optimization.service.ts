import { Injectable, Logger } from '@nestjs/common';
import { SocialPlatform } from '@prisma/client';
import { PlatformAdapterFactory } from '../adapters/platform-adapter.factory';

export interface ContentOptimizationOptions {
  platform: SocialPlatform;
  originalContent: {
    text?: string;
    mediaUrls?: string[];
    mediaType?: 'image' | 'video';
    hashtags?: string[];
  };
  preferences?: {
    preserveHashtags?: boolean;
    maxHashtags?: number;
    tone?: 'professional' | 'casual' | 'friendly';
    includeEmojis?: boolean;
  };
}

export interface OptimizedContent {
  platform: SocialPlatform;
  optimizedText?: string;
  optimizedHashtags?: string[];
  mediaUrls?: string[];
  recommendations: string[];
  changes: string[];
}

export interface CrossPlatformOptimization {
  originalContent: any;
  optimizedContent: Record<SocialPlatform, OptimizedContent>;
  summary: {
    totalPlatforms: number;
    optimizationsApplied: number;
    commonHashtags: string[];
    platformSpecificTips: Record<SocialPlatform, string[]>;
  };
}

@Injectable()
export class ContentOptimizationService {
  private readonly logger = new Logger(ContentOptimizationService.name);

  constructor(private readonly adapterFactory: PlatformAdapterFactory) {}

  /**
   * Optimize content for a specific platform
   */
  async optimizeForPlatform(
    options: ContentOptimizationOptions,
  ): Promise<OptimizedContent> {
    const { platform, originalContent, preferences = {} } = options;
    const adapter = this.adapterFactory.getAdapter(platform);

    const optimized: OptimizedContent = {
      platform,
      mediaUrls: originalContent.mediaUrls,
      recommendations: [],
      changes: [],
    };

    // Optimize text content
    if (originalContent.text) {
      const textOptimization = await this.optimizeText(
        originalContent.text,
        platform,
        adapter.capabilities,
        preferences,
      );
      optimized.optimizedText = textOptimization.text;
      optimized.recommendations.push(...textOptimization.recommendations);
      optimized.changes.push(...textOptimization.changes);
    }

    // Optimize hashtags
    if (originalContent.hashtags || originalContent.text?.includes('#')) {
      const hashtagOptimization = await this.optimizeHashtags(
        originalContent.hashtags ||
          this.extractHashtags(originalContent.text || ''),
        platform,
        preferences,
      );
      optimized.optimizedHashtags = hashtagOptimization.hashtags;
      optimized.recommendations.push(...hashtagOptimization.recommendations);
      optimized.changes.push(...hashtagOptimization.changes);
    }

    // Add platform-specific recommendations
    optimized.recommendations.push(
      ...this.getPlatformSpecificRecommendations(platform, originalContent),
    );

    return optimized;
  }

  /**
   * Optimize content for multiple platforms
   */ async optimizeForMultiplePlatforms(
    platforms: SocialPlatform[],
    content: any,
    preferences?: any,
  ): Promise<CrossPlatformOptimization> {
    const optimizedContent = {} as Record<SocialPlatform, OptimizedContent>;
    let totalOptimizations = 0;

    // Optimize for each platform
    for (const platform of platforms) {
      const optimization = await this.optimizeForPlatform({
        platform,
        originalContent: content,
        preferences,
      });

      optimizedContent[platform] = optimization;
      totalOptimizations += optimization.changes.length;
    }

    // Find common hashtags across platforms
    const allHashtags = platforms.flatMap(
      (platform) => optimizedContent[platform].optimizedHashtags || [],
    );
    const commonHashtags = this.findCommonHashtags(allHashtags);

    // Get platform-specific tips
    const platformSpecificTips = {} as Record<SocialPlatform, string[]>;
    platforms.forEach((platform) => {
      platformSpecificTips[platform] = this.getPlatformSpecificTips(platform);
    });

    return {
      originalContent: content,
      optimizedContent,
      summary: {
        totalPlatforms: platforms.length,
        optimizationsApplied: totalOptimizations,
        commonHashtags,
        platformSpecificTips,
      },
    };
  }

  /**
   * Generate content variations for A/B testing
   */
  async generateContentVariations(
    platform: SocialPlatform,
    content: any,
    variationCount: number = 3,
  ): Promise<Array<OptimizedContent & { variationId: string }>> {
    const variations = [];

    for (let i = 0; i < variationCount; i++) {
      const variation = await this.optimizeForPlatform({
        platform,
        originalContent: content,
        preferences: {
          tone: i === 0 ? 'professional' : i === 1 ? 'casual' : 'friendly',
          includeEmojis: i % 2 === 0,
        },
      });

      variations.push({
        ...variation,
        variationId: `${platform}-v${i + 1}`,
      });
    }

    return variations;
  }

  /**
   * Optimize text content
   */
  private async optimizeText(
    text: string,
    platform: SocialPlatform,
    capabilities: any,
    preferences: any,
  ): Promise<{
    text: string;
    recommendations: string[];
    changes: string[];
  }> {
    let optimizedText = text;
    const recommendations: string[] = [];
    const changes: string[] = [];

    // Handle text length limits
    if (
      capabilities.maxTextLength &&
      text.length > capabilities.maxTextLength
    ) {
      const truncated = this.truncateText(text, capabilities.maxTextLength);
      optimizedText = truncated.text;
      changes.push(
        `Truncated text from ${text.length} to ${truncated.text.length} characters`,
      );
      if (truncated.removed) {
        recommendations.push(
          `Consider creating a thread or splitting content: "${truncated.removed}"`,
        );
      }
    }

    // Add platform-specific optimizations
    switch (platform) {
      case SocialPlatform.INSTAGRAM:
        if (!text.includes('\n')) {
          const formatted = this.formatForInstagram(optimizedText);
          if (formatted !== optimizedText) {
            optimizedText = formatted;
            changes.push('Added line breaks for better Instagram readability');
          }
        }
        break;

      case SocialPlatform.X:
        if (text.includes('\n\n')) {
          optimizedText = text.replace(/\n\n+/g, '\n');
          changes.push('Optimized line breaks for Twitter format');
        }
        break;

      case SocialPlatform.YOUTUBE:
        if (!text.includes('Subscribe') && !text.includes('Like')) {
          recommendations.push(
            'Consider adding call-to-action phrases like "Subscribe" or "Like"',
          );
        }
        break;
    }

    // Add emojis if requested
    if (preferences.includeEmojis && !this.containsEmojis(optimizedText)) {
      const withEmojis = this.addRelevantEmojis(optimizedText, platform);
      if (withEmojis !== optimizedText) {
        optimizedText = withEmojis;
        changes.push('Added relevant emojis');
      }
    }

    return {
      text: optimizedText,
      recommendations,
      changes,
    };
  }

  /**
   * Optimize hashtags for platform
   */
  private async optimizeHashtags(
    hashtags: string[],
    platform: SocialPlatform,
    preferences: any,
  ): Promise<{
    hashtags: string[];
    recommendations: string[];
    changes: string[];
  }> {
    let optimizedHashtags = [...hashtags];
    const recommendations: string[] = [];
    const changes: string[] = [];

    // Platform-specific hashtag optimization
    switch (platform) {
      case SocialPlatform.INSTAGRAM:
        if (optimizedHashtags.length < 11) {
          recommendations.push(
            'Consider adding more hashtags (11-30 is optimal for Instagram)',
          );
        }
        if (optimizedHashtags.length > 30) {
          optimizedHashtags = optimizedHashtags.slice(0, 30);
          changes.push('Reduced hashtags to Instagram maximum of 30');
        }
        break;

      case SocialPlatform.X:
        if (optimizedHashtags.length > 2) {
          optimizedHashtags = optimizedHashtags.slice(0, 2);
          changes.push('Reduced hashtags to Twitter recommended maximum of 2');
        }
        break;

      case SocialPlatform.FACEBOOK:
        if (optimizedHashtags.length > 2) {
          optimizedHashtags = optimizedHashtags.slice(0, 2);
          changes.push('Reduced hashtags to Facebook recommended maximum of 2');
        }
        break;

      case SocialPlatform.TIKTOK:
        if (optimizedHashtags.length > 5) {
          optimizedHashtags = optimizedHashtags.slice(0, 5);
          changes.push('Reduced hashtags to TikTok recommended maximum of 5');
        }
        break;
    }

    // Apply preferences
    if (
      preferences.maxHashtags &&
      optimizedHashtags.length > preferences.maxHashtags
    ) {
      optimizedHashtags = optimizedHashtags.slice(0, preferences.maxHashtags);
      changes.push(
        `Limited hashtags to user preference of ${preferences.maxHashtags}`,
      );
    }

    return {
      hashtags: optimizedHashtags,
      recommendations,
      changes,
    };
  }

  /**
   * Extract hashtags from text
   */
  private extractHashtags(text: string): string[] {
    const hashtagRegex = /#[a-zA-Z0-9_]+/g;
    return text.match(hashtagRegex) || [];
  }

  /**
   * Truncate text intelligently
   */
  private truncateText(
    text: string,
    maxLength: number,
  ): {
    text: string;
    removed?: string;
  } {
    if (text.length <= maxLength) {
      return { text };
    }

    // Try to truncate at word boundary
    const truncated = text.substring(0, maxLength - 3);
    const lastSpace = truncated.lastIndexOf(' ');

    if (lastSpace > maxLength * 0.8) {
      return {
        text: truncated.substring(0, lastSpace) + '...',
        removed: text.substring(lastSpace),
      };
    }

    return {
      text: truncated + '...',
      removed: text.substring(maxLength - 3),
    };
  }

  /**
   * Format text for Instagram
   */
  private formatForInstagram(text: string): string {
    // Add line breaks for better readability
    const sentences = text.split('. ');
    if (sentences.length > 2) {
      return sentences.join('.\n\n');
    }
    return text;
  }

  /**
   * Check if text contains emojis
   */
  private containsEmojis(text: string): boolean {
    const emojiRegex =
      /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u;
    return emojiRegex.test(text);
  }

  /**
   * Add relevant emojis to text
   */
  private addRelevantEmojis(text: string, platform: SocialPlatform): string {
    // Simple emoji addition based on keywords
    const emojiMap = {
      video: '🎥',
      photo: '📸',
      music: '🎵',
      food: '🍕',
      travel: '✈️',
      love: '❤️',
      happy: '😊',
      excited: '🎉',
    };

    let result = text;
    Object.entries(emojiMap).forEach(([keyword, emoji]) => {
      if (text.toLowerCase().includes(keyword) && !text.includes(emoji)) {
        result = result.replace(
          new RegExp(keyword, 'gi'),
          `${keyword} ${emoji}`,
        );
      }
    });

    return result;
  }

  /**
   * Find common hashtags across platforms
   */
  private findCommonHashtags(allHashtags: string[]): string[] {
    const hashtagCount = allHashtags.reduce(
      (acc, hashtag) => {
        acc[hashtag] = (acc[hashtag] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(hashtagCount)
      .filter(([, count]) => count > 1)
      .map(([hashtag]) => hashtag);
  }

  /**
   * Get platform-specific recommendations
   */
  private getPlatformSpecificRecommendations(
    platform: SocialPlatform,
    content: any,
  ): string[] {
    const recommendations = [];

    switch (platform) {
      case SocialPlatform.INSTAGRAM:
        if (content.mediaUrls && content.mediaUrls.length === 0) {
          recommendations.push(
            'Consider adding high-quality images for better engagement',
          );
        }
        break;

      case SocialPlatform.YOUTUBE:
        if (content.mediaType !== 'video') {
          recommendations.push('YouTube performs best with video content');
        }
        break;

      case SocialPlatform.TIKTOK:
        if (content.mediaType !== 'video') {
          recommendations.push('TikTok requires video content');
        }
        break;
    }

    return recommendations;
  }

  /**
   * Get platform-specific tips
   */
  private getPlatformSpecificTips(platform: SocialPlatform): string[] {
    const tips = {
      [SocialPlatform.FACEBOOK]: [
        'Use engaging visuals to increase reach',
        'Ask questions to encourage comments',
        'Post during peak hours (9 AM, 1 PM, 3 PM)',
      ],
      [SocialPlatform.INSTAGRAM]: [
        'Use high-quality, well-lit photos',
        'Include 11-30 relevant hashtags',
        'Post consistently at the same times',
      ],
      [SocialPlatform.YOUTUBE]: [
        'Create compelling thumbnails',
        'Use keywords in titles and descriptions',
        'Encourage subscribers to like and subscribe',
      ],
      [SocialPlatform.TIKTOK]: [
        'Follow trending challenges and sounds',
        'Keep videos short and engaging',
        'Use trending hashtags strategically',
      ],
      [SocialPlatform.X]: [
        'Keep tweets concise and engaging',
        'Use relevant hashtags (1-2 per tweet)',
        'Engage with trending topics',
      ],
      [SocialPlatform.ZALO]: [
        'Use Vietnamese language for better engagement',
        'Share local and culturally relevant content',
        'Engage with Vietnamese community',
      ],
      [SocialPlatform.TELEGRAM]: [
        'Use channels for broadcasting to large audiences',
        'Create engaging group discussions',
        'Share valuable and informative content',
      ],
    };

    return tips[platform] || [];
  }
}
