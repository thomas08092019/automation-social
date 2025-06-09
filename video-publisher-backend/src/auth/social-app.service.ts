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
      } // 1. Check if account references a SocialApp (priority since schema has socialApp relation)
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
      this.logger.error(
        `Failed to get app config for social account ${socialAccountId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Create a new app configuration for a user
   */
  async createUserApp(
    userId: string,
    config: Omit<SocialAppConfig, 'id'>,
  ): Promise<SocialAppConfig> {
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
  async getUserApps(
    userId: string,
    platform?: SocialPlatform,
  ): Promise<SocialAppConfig[]> {
    const apps = await this.prisma.socialApp.findMany({
      where: {
        userId,
        ...(platform && { platform }),
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    return apps.map((app) => ({
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
  async updateUserApp(
    userId: string,
    appId: string,
    updates: Partial<SocialAppConfig>,
  ): Promise<SocialAppConfig> {
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
        ...(updates.isDefault !== undefined && {
          isDefault: updates.isDefault,
        }),
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
   * Get system default configuration (no longer supported)
   */
  private getSystemDefaultConfig(
    platform: SocialPlatform,
  ): SocialAppConfig | null {
    // System default configs are no longer supported
    // Users must configure their own app credentials
    return null;
  }
  /**
   * Get default redirect URI for a platform
   */ private getDefaultRedirectUri(platform: SocialPlatform): string {
    // Only use ngrok URL for TikTok, other platforms use local URL
    let baseUrl: string;

    if (platform === SocialPlatform.TIKTOK) {
      // For TikTok Sandbox mode, prefer localhost, for production use ngrok
      const tiktokMode = this.configService.get('TIKTOK_MODE', 'sandbox'); // sandbox or production

      if (tiktokMode === 'sandbox') {
        // Sandbox mode: use localhost
        baseUrl = this.configService.get(
          'FRONTEND_URL',
          'http://localhost:3000',
        );
      } else {
        // Production mode: prefer ngrok URL if available
        baseUrl =
          this.configService.get('FRONTEND_NGROK_URL') ||
          this.configService.get('FRONTEND_URL', 'http://localhost:3000');
      }
    } else {
      // For other platforms, use local URL only
      baseUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3000');
    }

    switch (platform) {
      case SocialPlatform.FACEBOOK:
      case SocialPlatform.INSTAGRAM:
        return `${baseUrl}/auth/facebook/callback`;
      case SocialPlatform.YOUTUBE:
        return `${baseUrl}/auth/google/callback`;
      case SocialPlatform.TIKTOK:
        return `${baseUrl}/auth/callback`; // Use generic callback for TikTok
      default:
        return `${baseUrl}/auth/callback`;
    }
  }
}
