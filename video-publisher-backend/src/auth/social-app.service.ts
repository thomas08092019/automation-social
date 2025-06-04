import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { ConfigService } from '@nestjs/config';
import { SocialPlatform } from '@prisma/client';

export interface SocialAppConfig {
  id?: string;
  name: string;
  platform: SocialPlatform;
  appId: string;
  appSecret: string;
  redirectUri: string;
  isDefault?: boolean;
}

@Injectable()
export class SocialAppService {
  private readonly logger = new Logger(SocialAppService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * Get app configuration for a specific social account
   * Prioritizes: Account-specific config > User's custom app > Default app
   */
  async getAppConfig(socialAccountId: string): Promise<SocialAppConfig | null> {
    try {
      const socialAccount = await this.prisma.socialAccount.findUnique({
        where: { id: socialAccountId },
        include: { socialApp: true },
      });

      if (!socialAccount) {
        return null;
      }

      // 1. Check if account has direct app credentials
      if (socialAccount.appId && socialAccount.appSecret) {
        return {
          name: 'Direct Config',
          platform: socialAccount.platform,
          appId: socialAccount.appId,
          appSecret: socialAccount.appSecret,
          redirectUri: socialAccount.redirectUri || this.getDefaultRedirectUri(socialAccount.platform),
        };
      }

      // 2. Check if account references a SocialApp
      if (socialAccount.socialApp) {
        return {
          id: socialAccount.socialApp.id,
          name: socialAccount.socialApp.name,
          platform: socialAccount.socialApp.platform,
          appId: socialAccount.socialApp.appId,
          appSecret: socialAccount.socialApp.appSecret,
          redirectUri: socialAccount.socialApp.redirectUri,
          isDefault: socialAccount.socialApp.isDefault,
        };
      }

      // 3. Get user's default app for this platform
      const userDefaultApp = await this.prisma.socialApp.findFirst({
        where: {
          userId: socialAccount.userId,
          platform: socialAccount.platform,
          isDefault: true,
        },
      });

      if (userDefaultApp) {
        return {
          id: userDefaultApp.id,
          name: userDefaultApp.name,
          platform: userDefaultApp.platform,
          appId: userDefaultApp.appId,
          appSecret: userDefaultApp.appSecret,
          redirectUri: userDefaultApp.redirectUri,
          isDefault: true,
        };
      }

      // 4. Fallback to system default
      return this.getSystemDefaultConfig(socialAccount.platform);

    } catch (error) {
      this.logger.error(`Failed to get app config for social account ${socialAccountId}:`, error);
      return null;
    }
  }

  /**
   * Create a new app configuration for a user
   */
  async createUserApp(userId: string, config: Omit<SocialAppConfig, 'id'>): Promise<SocialAppConfig> {
    // If this is set as default, unset other defaults for this platform
    if (config.isDefault) {
      await this.prisma.socialApp.updateMany({
        where: {
          userId,
          platform: config.platform,
        },
        data: {
          isDefault: false,
        },
      });
    }

    const app = await this.prisma.socialApp.create({
      data: {
        name: config.name,
        platform: config.platform,
        appId: config.appId,
        appSecret: config.appSecret,
        redirectUri: config.redirectUri,
        isDefault: config.isDefault || false,
        userId,
      },
    });

    return {
      id: app.id,
      name: app.name,
      platform: app.platform,
      appId: app.appId,
      appSecret: app.appSecret,
      redirectUri: app.redirectUri,
      isDefault: app.isDefault,
    };
  }

  /**
   * Get all app configurations for a user
   */
  async getUserApps(userId: string, platform?: SocialPlatform): Promise<SocialAppConfig[]> {
    const apps = await this.prisma.socialApp.findMany({
      where: {
        userId,
        ...(platform && { platform }),
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    return apps.map(app => ({
      id: app.id,
      name: app.name,
      platform: app.platform,
      appId: app.appId,
      appSecret: app.appSecret,
      redirectUri: app.redirectUri,
      isDefault: app.isDefault,
    }));
  }

  /**
   * Update an app configuration
   */
  async updateUserApp(userId: string, appId: string, updates: Partial<SocialAppConfig>): Promise<SocialAppConfig> {
    // If setting as default, unset other defaults for this platform
    if (updates.isDefault) {
      const app = await this.prisma.socialApp.findUnique({
        where: { id: appId },
      });

      if (app) {
        await this.prisma.socialApp.updateMany({
          where: {
            userId,
            platform: app.platform,
            id: { not: appId },
          },
          data: {
            isDefault: false,
          },
        });
      }
    }

    const updatedApp = await this.prisma.socialApp.update({
      where: { id: appId },
      data: {
        ...(updates.name && { name: updates.name }),
        ...(updates.appId && { appId: updates.appId }),
        ...(updates.appSecret && { appSecret: updates.appSecret }),
        ...(updates.redirectUri && { redirectUri: updates.redirectUri }),
        ...(updates.isDefault !== undefined && { isDefault: updates.isDefault }),
      },
    });

    return {
      id: updatedApp.id,
      name: updatedApp.name,
      platform: updatedApp.platform,
      appId: updatedApp.appId,
      appSecret: updatedApp.appSecret,
      redirectUri: updatedApp.redirectUri,
      isDefault: updatedApp.isDefault,
    };
  }

  /**
   * Delete an app configuration
   */
  async deleteUserApp(userId: string, appId: string): Promise<void> {
    await this.prisma.socialApp.delete({
      where: { id: appId },
    });
  }

  /**
   * Get system default configuration from environment variables
   */
  private getSystemDefaultConfig(platform: SocialPlatform): SocialAppConfig | null {
    const platformKey = platform.toLowerCase().replace('_', '');

    switch (platform) {
      case 'FACEBOOK_REELS':
      case 'INSTAGRAM_REELS':
        return {
          name: 'System Default Facebook App',
          platform,
          appId: this.configService.get('DEFAULT_FACEBOOK_APP_ID') || '',
          appSecret: this.configService.get('DEFAULT_FACEBOOK_APP_SECRET') || '',
          redirectUri: this.configService.get('DEFAULT_FACEBOOK_REDIRECT_URI') || '',
          isDefault: true,
        };

      case 'YOUTUBE_SHORTS':
        return {
          name: 'System Default Google App',
          platform,
          appId: this.configService.get('DEFAULT_GOOGLE_CLIENT_ID') || '',
          appSecret: this.configService.get('DEFAULT_GOOGLE_CLIENT_SECRET') || '',
          redirectUri: this.configService.get('DEFAULT_GOOGLE_REDIRECT_URI') || '',
          isDefault: true,
        };

      case 'TIKTOK':
        return {
          name: 'System Default TikTok App',
          platform,
          appId: this.configService.get('DEFAULT_TIKTOK_CLIENT_KEY') || '',
          appSecret: this.configService.get('DEFAULT_TIKTOK_CLIENT_SECRET') || '',
          redirectUri: this.configService.get('DEFAULT_TIKTOK_REDIRECT_URI') || '',
          isDefault: true,
        };

      default:
        return null;
    }
  }

  /**
   * Get default redirect URI for a platform
   */
  private getDefaultRedirectUri(platform: SocialPlatform): string {
    const baseUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3000');

    switch (platform) {
      case 'FACEBOOK_REELS':
      case 'INSTAGRAM_REELS':
        return `${baseUrl}/auth/facebook/callback`;
      case 'YOUTUBE_SHORTS':
        return `${baseUrl}/auth/google/callback`;
      case 'TIKTOK':
        return `${baseUrl}/auth/tiktok/callback`;
      default:
        return `${baseUrl}/auth/callback`;
    }
  }
}
