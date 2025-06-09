import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { ConfigService } from '@nestjs/config';
import { SocialPlatform } from '@prisma/client';

export interface AppConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
  platform?: SocialPlatform;
  name?: string;
  socialAppId?: string; // ID của SocialApp record nếu có
  source: 'social-app' | 'inline' | 'system-default'; // Nguồn config
  scopes?: string[];
  isActive?: boolean;
}

export interface CreateSocialAppDto {
  name: string;
  platform: SocialPlatform;
  appId: string;
  appSecret: string;
  redirectUri: string;
  isDefault?: boolean;
}

export interface AppSelectionStrategy {
  userId: string;
  platform: SocialPlatform;
  preferredAppId?: string;
  socialAccountId?: string; // Để lấy app từ existing social account
  requireCustomApp?: boolean; // Bắt buộc phải dùng user's app (không fallback system default)
}

export interface AppValidationResult {
  isValid: boolean;
  error?: string;
  details?: any;
}

@Injectable()
export class EnhancedSocialAppService {
  private readonly logger = new Logger(EnhancedSocialAppService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * Tạo app configuration mới với validation
   */
  async createApp(userId: string, data: CreateSocialAppDto): Promise<any> {
    // Validate app credentials trước khi tạo
    const validation = await this.validateAppConfig(
      data.appId,
      data.appSecret,
      data.platform,
    );
    if (!validation.isValid) {
      throw new BadRequestException(
        `Invalid app credentials: ${validation.error}`,
      );
    }

    // Kiểm tra xem appId đã tồn tại chưa
    const existingApp = await this.prisma.socialApp.findFirst({
      where: {
        userId,
        platform: data.platform,
        appId: data.appId,
      },
    });

    if (existingApp) {
      throw new BadRequestException(
        'App with this ID already exists for this platform',
      );
    }

    // Nếu đặt làm default, bỏ default của các app khác cùng platform
    if (data.isDefault) {
      await this.prisma.socialApp.updateMany({
        where: {
          userId,
          platform: data.platform,
        },
        data: {
          isDefault: false,
        },
      });
    }

    const app = await this.prisma.socialApp.create({
      data: {
        ...data,
        userId,
      },
    });

    this.logger.log(
      `Created new app configuration: ${app.name} (${app.platform}) for user ${userId}`,
    );

    return app;
  }

  /**
   * Lấy app configuration phù hợp với chiến lược linh hoạt
   * Ưu tiên: Existing Social Account App > Preferred App > Default User App > System Default
   */
  async getAppConfig(strategy: AppSelectionStrategy): Promise<AppConfig> {
    const {
      userId,
      platform,
      preferredAppId,
      socialAccountId,
      requireCustomApp,
    } = strategy;

    this.logger.debug(
      `Getting app config for strategy: ${JSON.stringify(strategy)}`,
    );

    // 1. Nếu có socialAccountId, ưu tiên app đã được sử dụng
    if (socialAccountId) {
      const socialAccount = await this.prisma.socialAccount.findFirst({
        where: {
          id: socialAccountId,
          userId,
          platform,
        },
        include: {
          socialApp: true,
        },
      });

      if (socialAccount?.socialApp) {
        return {
          appId: socialAccount.socialApp.appId,
          appSecret: socialAccount.socialApp.appSecret,
          redirectUri: socialAccount.socialApp.redirectUri,
          name: socialAccount.socialApp.name,
          socialAppId: socialAccount.socialApp.id,
          source: 'social-app',
        };
      } // Nếu social account có app credentials inline (không sử dụng vì không có trong schema)
      // Thay vào đó, sử dụng socialApp luôn
      return {
        appId: socialAccount.socialApp.appId,
        appSecret: socialAccount.socialApp.appSecret,
        redirectUri: socialAccount.socialApp.redirectUri,
        name: `App for ${socialAccount.accountName}`,
        source: 'social-app',
      };
    }

    // 2. Nếu có preferredAppId, tìm app cụ thể
    if (preferredAppId) {
      const app = await this.prisma.socialApp.findFirst({
        where: {
          id: preferredAppId,
          userId,
          platform,
        },
      });

      if (app) {
        return {
          appId: app.appId,
          appSecret: app.appSecret,
          redirectUri: app.redirectUri,
          name: app.name,
          socialAppId: app.id,
          source: 'social-app',
        };
      }
    }

    // 3. Tìm default app của user cho platform này
    const defaultApp = await this.prisma.socialApp.findFirst({
      where: {
        userId,
        platform,
        isDefault: true,
      },
    });

    if (defaultApp) {
      return {
        appId: defaultApp.appId,
        appSecret: defaultApp.appSecret,
        redirectUri: defaultApp.redirectUri,
        name: defaultApp.name,
        socialAppId: defaultApp.id,
        source: 'social-app',
      };
    }

    // 4. Lấy bất kỳ app nào của user cho platform này
    const anyApp = await this.prisma.socialApp.findFirst({
      where: {
        userId,
        platform,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (anyApp) {
      return {
        appId: anyApp.appId,
        appSecret: anyApp.appSecret,
        redirectUri: anyApp.redirectUri,
        name: anyApp.name,
        socialAppId: anyApp.id,
        source: 'social-app',
      };
    }

    // 5. Nếu requireCustomApp = true, không fallback về system default
    if (requireCustomApp) {
      throw new NotFoundException(
        `No custom app configuration found for platform ${platform}. Please add your own app credentials.`,
      );
    } // 6. Fallback về system default configs
    const systemConfig = this.getSystemDefaultConfig(platform);
    if (
      !systemConfig.appId ||
      !systemConfig.appSecret ||
      this.isPlaceholderCredentials(systemConfig.appId, systemConfig.appSecret)
    ) {
      throw new NotFoundException(
        `No app configuration available for platform ${platform}. Please add your own app credentials or set up real OAuth credentials in your .env file. Current credentials appear to be placeholder values.`,
      );
    }

    return systemConfig;
  }
  /**
   * Lấy system default config từ environment variables
   * Fallback for development when no custom app is configured
   */ private getSystemDefaultConfig(platform: SocialPlatform): AppConfig {
    // Use ngrok URL for TikTok, localhost for other platforms
    let baseUrl: string;
    if (platform === SocialPlatform.TIKTOK) {
      baseUrl =
        this.configService.get('FRONTEND_NGROK_URL') ||
        this.configService.get('FRONTEND_URL', 'http://localhost:3000');
    } else {
      baseUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3000');
    }

    switch (platform) {
      case SocialPlatform.YOUTUBE:
        const googleClientId = this.configService.get('GOOGLE_CLIENT_ID');
        const googleClientSecret = this.configService.get(
          'GOOGLE_CLIENT_SECRET',
        );

        if (
          !googleClientId ||
          !googleClientSecret ||
          this.isPlaceholderCredentials(googleClientId, googleClientSecret)
        ) {
          throw new BadRequestException(
            `No valid Google OAuth credentials configured. Please either:\n` +
              `1. Set up custom app credentials through the UI, or\n` +
              `2. Configure real GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file.\n` +
              `See OAUTH_SETUP_GUIDE.md for detailed instructions.`,
          );
        }
        return {
          socialAppId: null, // Will be created when needed
          name: 'System Google OAuth',
          platform: SocialPlatform.YOUTUBE,
          appId: googleClientId,
          appSecret: googleClientSecret,
          redirectUri: `${baseUrl}/auth/callback`,
          scopes: [
            'https://www.googleapis.com/auth/youtube.upload',
            'https://www.googleapis.com/auth/youtube',
            'https://www.googleapis.com/auth/youtube.readonly',
          ],
          isActive: true,
          source: 'system-default',
        };

      case SocialPlatform.FACEBOOK:
      case SocialPlatform.INSTAGRAM:
        const facebookAppId = this.configService.get('FACEBOOK_APP_ID');
        const facebookAppSecret = this.configService.get('FACEBOOK_APP_SECRET');

        if (
          !facebookAppId ||
          !facebookAppSecret ||
          this.isPlaceholderCredentials(facebookAppId, facebookAppSecret)
        ) {
          throw new BadRequestException(
            `No valid Facebook OAuth credentials configured. Please either:\n` +
              `1. Set up custom app credentials through the UI, or\n` +
              `2. Configure real FACEBOOK_APP_ID and FACEBOOK_APP_SECRET in your .env file.\n` +
              `See OAUTH_SETUP_GUIDE.md for detailed instructions.`,
          );
        }
        return {
          socialAppId: null, // Will be created when needed
          name: 'System Facebook OAuth',
          platform: SocialPlatform.FACEBOOK,
          appId: facebookAppId,
          appSecret: facebookAppSecret,
          redirectUri: `${baseUrl}/auth/callback`,
          scopes:
            platform === SocialPlatform.INSTAGRAM
              ? [
                  'instagram_basic',
                  'instagram_content_publish',
                  'pages_show_list',
                  'pages_read_engagement',
                ]
              : [
                  'pages_manage_posts',
                  'pages_read_engagement',
                  'pages_show_list',
                  'publish_video',
                ],
          isActive: true,
          source: 'system-default',
        };
      case SocialPlatform.TIKTOK:
        const tiktokClientId = this.configService.get('TIKTOK_CLIENT_ID');
        const tiktokClientSecret = this.configService.get(
          'TIKTOK_CLIENT_SECRET',
        );
        // Debug logging for TikTok configuration
        this.logger.debug('=== TikTok OAuth Configuration Debug ===');
        this.logger.debug(
          `TikTok Client ID: ${tiktokClientId ? `${tiktokClientId.substring(0, 10)}...` : 'NOT SET'}`,
        );
        this.logger.debug(
          `TikTok Client Secret: ${tiktokClientSecret ? `${tiktokClientSecret.substring(0, 10)}...` : 'NOT SET'}`,
        );
        this.logger.debug(`Base URL (ngrok for TikTok): ${baseUrl}`);
        this.logger.debug(`Redirect URI: ${baseUrl}/auth/callback`);
        this.logger.debug(
          `Is placeholder check: ${this.isPlaceholderCredentials(tiktokClientId, tiktokClientSecret)}`,
        );
        this.logger.debug('==========================================');

        if (
          !tiktokClientId ||
          !tiktokClientSecret ||
          this.isPlaceholderCredentials(tiktokClientId, tiktokClientSecret)
        ) {
          throw new BadRequestException(
            `No valid TikTok OAuth credentials configured. Please either:\n` +
              `1. Set up custom app credentials through the UI, or\n` +
              `2. Configure real TIKTOK_CLIENT_ID and TIKTOK_CLIENT_SECRET in your .env file.\n` +
              `See OAUTH_SETUP_GUIDE.md for detailed instructions.`,
          );
        }
        return {
          socialAppId: null, // Will be created when needed
          name: 'System TikTok OAuth',
          platform: SocialPlatform.TIKTOK,
          appId: tiktokClientId,
          appSecret: tiktokClientSecret,
          redirectUri: `${baseUrl}/auth/callback`,
          scopes: [
            'user.info.basic',
            'user.info.profile',
            'user.info.stats',
            'user.info.open_id',
            'video.list',
            'video.publish',
            'video.upload',
            'artist.certification.read',
            'artist.certification.update',
          ], // Comprehensive TikTok scopes for sandbox and production mode
          isActive: true,
          source: 'system-default',
        };

      default:
        throw new BadRequestException(
          `Unsupported platform: ${platform}. Please configure your app credentials through the UI.`,
        );
    }
  }
  /**
   * Lấy default redirect URI cho platform
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
      case SocialPlatform.YOUTUBE:
        return `${baseUrl}/auth/google/callback`;
      case SocialPlatform.FACEBOOK:
      case SocialPlatform.INSTAGRAM:
        return `${baseUrl}/auth/facebook/callback`;
      case SocialPlatform.TIKTOK:
        return `${baseUrl}/auth/callback`; // Use generic callback for TikTok
      default:
        return `${baseUrl}/auth/callback`;
    }
  }

  /**
   * Lấy danh sách apps của user với thống kê
   */
  async getUserApps(userId: string, platform?: SocialPlatform) {
    const apps = await this.prisma.socialApp.findMany({
      where: {
        userId,
        ...(platform && { platform }),
      },
      include: {
        _count: {
          select: {
            socialAccounts: true,
          },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    return apps.map((app) => ({
      ...app,
      connectedAccountsCount: app._count.socialAccounts,
      // Ẩn sensitive data trong response
      appSecret: '••••••••',
    }));
  }

  /**
   * Kiểm tra app có khả dụng không
   */
  async validateAppConfig(
    appId: string,
    appSecret: string,
    platform: SocialPlatform,
  ): Promise<AppValidationResult> {
    try {
      switch (platform) {
        case SocialPlatform.FACEBOOK:
        case SocialPlatform.INSTAGRAM:
          return await this.validateFacebookApp(appId, appSecret);

        case SocialPlatform.YOUTUBE:
          return await this.validateGoogleApp(appId, appSecret);

        case SocialPlatform.TIKTOK:
          return await this.validateTikTokApp(appId, appSecret);

        default:
          return {
            isValid: false,
            error: `Validation not implemented for platform: ${platform}`,
          };
      }
    } catch (error) {
      this.logger.warn(
        `App validation failed for platform ${platform}:`,
        error.message,
      );
      return {
        isValid: false,
        error: error.message,
        details: error,
      };
    }
  }

  /**
   * Validate Facebook app credentials
   */
  private async validateFacebookApp(
    appId: string,
    appSecret: string,
  ): Promise<AppValidationResult> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&grant_type=client_credentials`,
      );

      const data = await response.json();

      if (response.ok && data.access_token) {
        return { isValid: true };
      } else {
        return {
          isValid: false,
          error: data.error?.message || 'Invalid Facebook app credentials',
          details: data,
        };
      }
    } catch (error) {
      return {
        isValid: false,
        error: 'Failed to validate Facebook app credentials',
        details: error,
      };
    }
  }

  /**
   * Validate Google app credentials (basic check)
   */
  private async validateGoogleApp(
    clientId: string,
    clientSecret: string,
  ): Promise<AppValidationResult> {
    // Google không có endpoint đơn giản để validate credentials
    // Chỉ kiểm tra format cơ bản
    if (!clientId.includes('.apps.googleusercontent.com')) {
      return {
        isValid: false,
        error: 'Invalid Google Client ID format',
      };
    }

    if (!clientSecret || clientSecret.length < 10) {
      return {
        isValid: false,
        error: 'Invalid Google Client Secret format',
      };
    }

    return { isValid: true };
  }

  /**
   * Validate TikTok app credentials (basic check)
   */
  private async validateTikTokApp(
    clientKey: string,
    clientSecret: string,
  ): Promise<AppValidationResult> {
    // TikTok validation sẽ phức tạp hơn, tạm thời basic check
    if (!clientKey || !clientSecret) {
      return {
        isValid: false,
        error: 'TikTok Client Key and Secret are required',
      };
    }

    return { isValid: true };
  }

  /**
   * Liên kết social account với app configuration
   */
  async linkAccountToApp(
    socialAccountId: string,
    socialAppId: string,
    userId: string,
  ) {
    // Kiểm tra quyền sở hữu
    const [socialAccount, socialApp] = await Promise.all([
      this.prisma.socialAccount.findFirst({
        where: { id: socialAccountId, userId },
      }),
      this.prisma.socialApp.findFirst({
        where: { id: socialAppId, userId },
      }),
    ]);

    if (!socialAccount) {
      throw new NotFoundException('Social account not found');
    }

    if (!socialApp) {
      throw new NotFoundException('App configuration not found');
    }

    if (socialAccount.platform !== socialApp.platform) {
      throw new BadRequestException(
        'Platform mismatch between account and app',
      );
    } // Cập nhật social account
    const updated = await this.prisma.socialAccount.update({
      where: { id: socialAccountId },
      data: {
        socialAppId,
      },
    });

    this.logger.log(
      `Linked social account ${socialAccountId} to app ${socialAppId}`,
    );

    return updated;
  }

  /**
   * Bỏ liên kết social account khỏi app configuration
   */
  async unlinkAccountFromApp(socialAccountId: string, userId: string) {
    const socialAccount = await this.prisma.socialAccount.findFirst({
      where: { id: socialAccountId, userId },
    });

    if (!socialAccount) {
      throw new NotFoundException('Social account not found');
    }

    return this.prisma.socialAccount.update({
      where: { id: socialAccountId },
      data: {
        socialAppId: null,
      },
    });
  }

  /**
   * Cập nhật app configuration
   */
  async updateApp(
    userId: string,
    appId: string,
    data: Partial<CreateSocialAppDto>,
  ) {
    const app = await this.prisma.socialApp.findFirst({
      where: {
        id: appId,
        userId,
      },
    });

    if (!app) {
      throw new NotFoundException('App configuration not found');
    }

    // Validate credentials nếu có thay đổi
    if (data.appId || data.appSecret) {
      const validation = await this.validateAppConfig(
        data.appId || app.appId,
        data.appSecret || app.appSecret,
        app.platform,
      );

      if (!validation.isValid) {
        throw new BadRequestException(
          `Invalid app credentials: ${validation.error}`,
        );
      }
    }

    // Nếu đặt làm default, bỏ default của các app khác cùng platform
    if (data.isDefault) {
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

    return this.prisma.socialApp.update({
      where: { id: appId },
      data,
    });
  }

  /**
   * Xóa app configuration
   */
  async deleteApp(userId: string, appId: string) {
    const app = await this.prisma.socialApp.findFirst({
      where: {
        id: appId,
        userId,
      },
    });

    if (!app) {
      throw new NotFoundException('App configuration not found');
    }

    // Kiểm tra xem có social accounts nào đang sử dụng app này không
    const connectedAccounts = await this.prisma.socialAccount.count({
      where: {
        socialAppId: appId,
      },
    });

    if (connectedAccounts > 0) {
      throw new BadRequestException(
        'Cannot delete app configuration that is being used by connected accounts. Please unlink accounts first.',
      );
    }

    const deleted = await this.prisma.socialApp.delete({
      where: { id: appId },
    });

    this.logger.log(
      `Deleted app configuration: ${deleted.name} (${deleted.platform}) for user ${userId}`,
    );

    return deleted;
  }

  /**
   * Nhập app configuration từ environment variables cho user
   */
  async importSystemDefaults(userId: string, platforms: SocialPlatform[]) {
    const results = [];

    for (const platform of platforms) {
      try {
        const systemConfig = this.getSystemDefaultConfig(platform);

        if (!systemConfig.appId || !systemConfig.appSecret) {
          this.logger.warn(`No system default config for platform ${platform}`);
          continue;
        }

        // Kiểm tra xem đã có app này chưa
        const existingApp = await this.prisma.socialApp.findFirst({
          where: {
            userId,
            platform,
            appId: systemConfig.appId,
          },
        });

        if (existingApp) {
          this.logger.debug(`App already exists for platform ${platform}`);
          continue;
        }

        const app = await this.createApp(userId, {
          name: `Imported ${platform} App`,
          platform,
          appId: systemConfig.appId,
          appSecret: systemConfig.appSecret,
          redirectUri: systemConfig.redirectUri,
          isDefault: true,
        });

        results.push(app);
      } catch (error) {
        this.logger.warn(
          `Failed to import ${platform} default config:`,
          error.message,
        );
      }
    }

    return results;
  }

  /**
   * Lấy thống kê apps của user
   */
  async getUserAppStats(userId: string) {
    const stats = await this.prisma.socialApp.groupBy({
      by: ['platform'],
      where: { userId },
      _count: {
        id: true,
      },
    });

    const accountStats = await this.prisma.socialAccount.groupBy({
      by: ['platform'],
      where: { userId },
      _count: {
        id: true,
      },
    });

    return {
      totalApps: stats.reduce((sum, s) => sum + s._count.id, 0),
      totalAccounts: accountStats.reduce((sum, s) => sum + s._count.id, 0),
      byPlatform: Object.values(SocialPlatform).map((platform) => ({
        platform,
        appsCount: stats.find((s) => s.platform === platform)?._count.id || 0,
        accountsCount:
          accountStats.find((s) => s.platform === platform)?._count.id || 0,
      })),
    };
  }

  /**
   * Kiểm tra health của tất cả user apps
   */
  async checkUserAppsHealth(userId: string) {
    const apps = await this.prisma.socialApp.findMany({
      where: { userId },
    });

    const results = [];

    for (const app of apps) {
      const validation = await this.validateAppConfig(
        app.appId,
        app.appSecret,
        app.platform,
      );
      results.push({
        id: app.id,
        name: app.name,
        platform: app.platform,
        isHealthy: validation.isValid,
        error: validation.error,
        lastChecked: new Date(),
      });
    }

    return results;
  }

  /**
   * Kiểm tra health của một app cụ thể
   */
  async checkAppHealth(userId: string, appId: string) {
    const app = await this.prisma.socialApp.findFirst({
      where: {
        id: appId,
        userId,
      },
    });

    if (!app) {
      throw new NotFoundException('App not found');
    }

    const validation = await this.validateAppConfig(
      app.appId,
      app.appSecret,
      app.platform,
    );

    return {
      id: app.id,
      name: app.name,
      platform: app.platform,
      isHealthy: validation.isValid,
      isValid: validation.isValid,
      error: validation.error,
      errorMessage: validation.error,
      lastChecked: new Date(),
    };
  }

  /**
   * Set app làm default cho platform
   */
  async setDefaultApp(userId: string, appId: string) {
    const app = await this.prisma.socialApp.findFirst({
      where: {
        id: appId,
        userId,
      },
    });

    if (!app) {
      throw new NotFoundException('App not found');
    }

    // Bỏ default của các app khác cùng platform
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

    // Set app này làm default
    const updatedApp = await this.prisma.socialApp.update({
      where: { id: appId },
      data: { isDefault: true },
    });

    this.logger.log(
      `Set app ${app.name} as default for ${app.platform} (User: ${userId})`,
    );

    return updatedApp;
  }

  /**
   * Check if credentials are placeholder values that need to be replaced
   */
  private isPlaceholderCredentials(appId: string, appSecret: string): boolean {
    const placeholderPatterns = [
      /^your-.*-client-id/i,
      /^your-.*-client-secret/i,
      /^your-.*-app-id/i,
      /^your-.*-app-secret/i,
      /^your-.*-key/i,
      /placeholder/i,
      /example/i,
      /demo/i,
      /test.*123/i,
    ];

    const isPlaceholderAppId = placeholderPatterns.some((pattern) =>
      pattern.test(appId),
    );
    const isPlaceholderSecret = placeholderPatterns.some((pattern) =>
      pattern.test(appSecret),
    );

    return isPlaceholderAppId || isPlaceholderSecret;
  }
}
