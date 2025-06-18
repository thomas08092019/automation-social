import { Injectable } from '@nestjs/common';
import { SocialPlatform } from '@prisma/client';
import { PlatformAdapter } from './platform-adapter.interface';
import { FacebookAdapter } from './facebook.adapter';
import { YouTubeAdapter } from './youtube.adapter';
import { InstagramAdapter } from './instagram.adapter';
import { TikTokAdapter } from './tiktok.adapter';
import { XAdapter } from './x.adapter';
import { ZaloAdapter } from './zalo.adapter';
import { TelegramAdapter } from './telegram.adapter';

@Injectable()
export class PlatformAdapterFactory {
  private readonly adapters: Map<SocialPlatform, PlatformAdapter> = new Map();

  constructor() {
    // Initialize all platform adapters
    this.adapters.set(SocialPlatform.FACEBOOK, new FacebookAdapter());
    this.adapters.set(SocialPlatform.YOUTUBE, new YouTubeAdapter());
    this.adapters.set(SocialPlatform.INSTAGRAM, new InstagramAdapter());
    this.adapters.set(SocialPlatform.TIKTOK, new TikTokAdapter());
    this.adapters.set(SocialPlatform.X, new XAdapter());
    this.adapters.set(SocialPlatform.ZALO, new ZaloAdapter());
    this.adapters.set(SocialPlatform.TELEGRAM, new TelegramAdapter());
  }

  /**
   * Get adapter for specific platform
   */
  getAdapter(platform: SocialPlatform): PlatformAdapter {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new Error(`No adapter found for platform: ${platform}`);
    }
    return adapter;
  }

  /**
   * Get all available adapters
   */
  getAllAdapters(): Map<SocialPlatform, PlatformAdapter> {
    return new Map(this.adapters);
  }

  /**
   * Get adapters that support specific capability
   */
  getAdaptersByCapability(
    capability: keyof PlatformAdapter['capabilities'],
  ): PlatformAdapter[] {
    return Array.from(this.adapters.values()).filter(
      (adapter) => adapter.capabilities[capability],
    );
  }

  /**
   * Get platforms that support specific media type
   */
  getPlatformsByMediaSupport(
    mediaType: 'text' | 'images' | 'videos',
  ): SocialPlatform[] {
    const supportKey =
      `supports${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)}` as keyof PlatformAdapter['capabilities'];

    return Array.from(this.adapters.entries())
      .filter(([, adapter]) => adapter.capabilities[supportKey])
      .map(([platform]) => platform);
  }

  /**
   * Get platform capabilities summary
   */
  getPlatformCapabilities(): Record<SocialPlatform, any> {
    const capabilities: Record<string, any> = {};

    this.adapters.forEach((adapter, platform) => {
      capabilities[platform] = {
        ...adapter.capabilities,
        platformName: this.getPlatformDisplayName(platform),
      };
    });

    return capabilities;
  }

  /**
   * Check if platform supports specific feature
   */
  platformSupports(
    platform: SocialPlatform,
    feature: keyof PlatformAdapter['capabilities'],
  ): boolean {
    const adapter = this.getAdapter(platform);
    return !!adapter.capabilities[feature];
  }

  /**
   * Get maximum content length for platform
   */
  getMaxContentLength(platform: SocialPlatform): number {
    const adapter = this.getAdapter(platform);
    return adapter.capabilities.maxTextLength || 280; // Default to Twitter's limit
  }

  /**
   * Get supported media formats for platform
   */
  getSupportedFormats(
    platform: SocialPlatform,
    mediaType: 'video' | 'image',
  ): string[] {
    const adapter = this.getAdapter(platform);
    return mediaType === 'video'
      ? adapter.capabilities.supportedVideoFormats || []
      : adapter.capabilities.supportedImageFormats || [];
  }

  /**
   * Validate content against platform capabilities
   */
  validateContent(
    platform: SocialPlatform,
    content: {
      text?: string;
      mediaUrls?: string[];
      mediaType?: 'image' | 'video';
    },
  ): { valid: boolean; errors: string[] } {
    const adapter = this.getAdapter(platform);
    const errors: string[] = [];

    // Check text length
    if (content.text && adapter.capabilities.maxTextLength) {
      if (content.text.length > adapter.capabilities.maxTextLength) {
        errors.push(
          `Text exceeds maximum length of ${adapter.capabilities.maxTextLength} characters`,
        );
      }
    }

    // Check media support
    if (content.mediaUrls && content.mediaUrls.length > 0) {
      if (
        content.mediaType === 'image' &&
        !adapter.capabilities.supportsImages
      ) {
        errors.push('Platform does not support image posts');
      }
      if (
        content.mediaType === 'video' &&
        !adapter.capabilities.supportsVideos
      ) {
        errors.push('Platform does not support video posts');
      }

      // Check media count
      if (
        adapter.capabilities.maxMediaCount &&
        content.mediaUrls.length > adapter.capabilities.maxMediaCount
      ) {
        errors.push(
          `Exceeds maximum media count of ${adapter.capabilities.maxMediaCount}`,
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private getPlatformDisplayName(platform: SocialPlatform): string {
    const names = {
      [SocialPlatform.FACEBOOK]: 'Facebook',
      [SocialPlatform.INSTAGRAM]: 'Instagram',
      [SocialPlatform.YOUTUBE]: 'YouTube',
      [SocialPlatform.TIKTOK]: 'TikTok',
      [SocialPlatform.X]: 'X (Twitter)',
      [SocialPlatform.ZALO]: 'Zalo',
      [SocialPlatform.TELEGRAM]: 'Telegram',
    };
    return names[platform] || platform;
  }
}
