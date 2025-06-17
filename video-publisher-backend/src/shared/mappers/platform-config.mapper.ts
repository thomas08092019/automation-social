import { Injectable } from '@nestjs/common';
import { SocialPlatform } from '@prisma/client';

export interface PlatformConfigDto {
  platform: SocialPlatform;
  name: string;
  displayName: string;
  icon: string;
  color: string;
  authUrl: string;
  capabilities: {
    supportsText: boolean;
    supportsImages: boolean;
    supportsVideos: boolean;
    supportsScheduling: boolean;
    maxTextLength: number;
    maxMediaCount: number;
  };
  features: string[];
  limitations: string[];
}

export interface PlatformStatusDto {
  platform: SocialPlatform;
  connected: boolean;
  accountName?: string;
  accountId?: string;
  profilePicture?: string;
  isActive: boolean;
  lastSync?: string;
  connectionDate?: string;
  expiresAt?: string;
  status: 'active' | 'expired' | 'error' | 'disconnected';
}

@Injectable()
export class PlatformConfigMapper {
  
  /**
   * Map platform to configuration DTO
   */
  mapToPlatformConfig(platform: SocialPlatform): PlatformConfigDto {
    const configs = {
      [SocialPlatform.FACEBOOK]: {
        platform: SocialPlatform.FACEBOOK,
        name: 'facebook',
        displayName: 'Facebook',
        icon: 'fab fa-facebook-f',
        color: '#1877F2',
        authUrl: '/auth/facebook',
        capabilities: {
          supportsText: true,
          supportsImages: true,
          supportsVideos: true,
          supportsScheduling: true,
          maxTextLength: 63206,
          maxMediaCount: 10,
        },
        features: [
          'Post to Pages and Groups',
          'Schedule posts',
          'Analytics and insights',
          'Auto-posting',
          'Media uploads'
        ],
        limitations: [
          'Requires page admin access',
          'Subject to Facebook API limits',
        ],
      },
      [SocialPlatform.INSTAGRAM]: {
        platform: SocialPlatform.INSTAGRAM,
        name: 'instagram',
        displayName: 'Instagram',
        icon: 'fab fa-instagram',
        color: '#E4405F',
        authUrl: '/auth/instagram',
        capabilities: {
          supportsText: true,
          supportsImages: true,
          supportsVideos: true,
          supportsScheduling: true,
          maxTextLength: 2200,
          maxMediaCount: 10,
        },
        features: [
          'Photo and video posts',
          'Stories publishing',
          'Hashtag optimization',
          'Engagement tracking',
        ],
        limitations: [
          'Business account required',
          'Limited text in posts',
        ],
      },
      [SocialPlatform.YOUTUBE]: {
        platform: SocialPlatform.YOUTUBE,
        name: 'youtube',
        displayName: 'YouTube',
        icon: 'fab fa-youtube',
        color: '#FF0000',
        authUrl: '/auth/youtube',
        capabilities: {
          supportsText: true,
          supportsImages: false,
          supportsVideos: true,
          supportsScheduling: true,
          maxTextLength: 5000,
          maxMediaCount: 1,
        },
        features: [
          'Video uploads',
          'Channel management',
          'Analytics and insights',
          'Thumbnail customization',
        ],
        limitations: [
          'Video files only',
          'Large file uploads',
        ],
      },
      [SocialPlatform.TIKTOK]: {
        platform: SocialPlatform.TIKTOK,
        name: 'tiktok',
        displayName: 'TikTok',
        icon: 'fab fa-tiktok',
        color: '#000000',
        authUrl: '/auth/tiktok',
        capabilities: {
          supportsText: true,
          supportsImages: false,
          supportsVideos: true,
          supportsScheduling: false,
          maxTextLength: 300,
          maxMediaCount: 1,
        },
        features: [
          'Short video posts',
          'Trending hashtags',
          'Music integration',
        ],
        limitations: [
          'Video only platform',
          'Short duration limit',
          'No scheduling support',
        ],
      },
      [SocialPlatform.X]: {
        platform: SocialPlatform.X,
        name: 'x',
        displayName: 'X (Twitter)',
        icon: 'fab fa-x-twitter',
        color: '#000000',
        authUrl: '/auth/x',
        capabilities: {
          supportsText: true,
          supportsImages: true,
          supportsVideos: true,
          supportsScheduling: true,
          maxTextLength: 280,
          maxMediaCount: 4,
        },
        features: [
          'Tweet scheduling',
          'Thread creation',
          'Media attachments',
          'Real-time posting',
        ],
        limitations: [
          'Character limit',
          'API rate limits',
        ],
      },
      [SocialPlatform.ZALO]: {
        platform: SocialPlatform.ZALO,
        name: 'zalo',
        displayName: 'Zalo',
        icon: 'fas fa-comment',
        color: '#0084FF',
        authUrl: '/auth/zalo',
        capabilities: {
          supportsText: true,
          supportsImages: true,
          supportsVideos: false,
          supportsScheduling: false,
          maxTextLength: 1000,
          maxMediaCount: 1,
        },
        features: [
          'Vietnamese market focus',
          'Image sharing',
          'Text messaging',
        ],
        limitations: [
          'No video support',
          'No scheduling',
          'Regional platform',
        ],
      },
      [SocialPlatform.TELEGRAM]: {
        platform: SocialPlatform.TELEGRAM,
        name: 'telegram',
        displayName: 'Telegram',
        icon: 'fab fa-telegram',
        color: '#0088CC',
        authUrl: '/auth/telegram',
        capabilities: {
          supportsText: true,
          supportsImages: true,
          supportsVideos: true,
          supportsScheduling: true,
          maxTextLength: 4096,
          maxMediaCount: 10,
        },
        features: [
          'Channel broadcasting',
          'Group messaging',
          'Bot integration',
          'File sharing',
        ],
        limitations: [
          'Requires bot setup',
          'Limited analytics',
        ],
      },
    };

    return configs[platform];
  }

  /**
   * Map all platforms to configuration DTOs
   */
  mapAllPlatformConfigs(): PlatformConfigDto[] {
    return Object.values(SocialPlatform).map(platform => 
      this.mapToPlatformConfig(platform)
    );
  }

  /**
   * Map platform status
   */
  mapToPlatformStatus(
    platform: SocialPlatform,
    account?: any
  ): PlatformStatusDto {
    if (!account) {
      return {
        platform,
        connected: false,
        isActive: false,
        status: 'disconnected',
      };
    }

    const now = new Date();
    const isExpired = account.expiresAt && new Date(account.expiresAt) < now;
    const isActive = account.isActive && !isExpired;
    
    let status: 'active' | 'expired' | 'error' | 'disconnected' = 'active';
    if (!account.isActive) {
      status = 'disconnected';
    } else if (isExpired) {
      status = 'expired';
    } else if (!isActive) {
      status = 'error';
    }

    return {
      platform,
      connected: true,
      accountName: account.accountName,
      accountId: account.accountId,
      profilePicture: account.profilePicture,
      isActive,
      lastSync: account.updatedAt?.toISOString(),
      connectionDate: account.createdAt?.toISOString(),
      expiresAt: account.expiresAt?.toISOString(),
      status,
    };
  }

  /**
   * Map multiple platform statuses
   */
  mapAllPlatformStatuses(accounts: any[]): PlatformStatusDto[] {
    const platformStatuses: PlatformStatusDto[] = [];
    
    // Create status for each platform
    Object.values(SocialPlatform).forEach(platform => {
      const account = accounts.find(acc => acc.platform === platform);
      platformStatuses.push(this.mapToPlatformStatus(platform, account));
    });

    return platformStatuses;
  }

  /**
   * Map platform capabilities summary
   */
  mapCapabilitiesSummary(): Record<SocialPlatform, {
    name: string;
    supportsText: boolean;
    supportsImages: boolean;
    supportsVideos: boolean;
    supportsScheduling: boolean;
    maxTextLength: number;
  }> {
    const summary = {} as any;
    
    Object.values(SocialPlatform).forEach(platform => {
      const config = this.mapToPlatformConfig(platform);
      summary[platform] = {
        name: config.displayName,
        supportsText: config.capabilities.supportsText,
        supportsImages: config.capabilities.supportsImages,
        supportsVideos: config.capabilities.supportsVideos,
        supportsScheduling: config.capabilities.supportsScheduling,
        maxTextLength: config.capabilities.maxTextLength,
      };
    });

    return summary;
  }

  /**
   * Get platforms that support specific feature
   */
  getPlatformsByFeature(feature: keyof PlatformConfigDto['capabilities']): {
    platform: SocialPlatform;
    displayName: string;
    supported: boolean;
  }[] {
    return Object.values(SocialPlatform).map(platform => {
      const config = this.mapToPlatformConfig(platform);
      return {
        platform,
        displayName: config.displayName,
        supported: config.capabilities[feature] as boolean,
      };
    });
  }
}
