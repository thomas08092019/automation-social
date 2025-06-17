import {
  Injectable,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { SocialPlatform, AccountType } from '@prisma/client';

export interface SocialAccountData {
  platform: SocialPlatform;
  accountType: AccountType;
  accountId: string;
  accountName: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  profilePicture?: string;
  metadata?: any;
  // OAuth App Configuration
  appId?: string;
  appSecret?: string;
  redirectUri?: string;
}

export interface CreateSocialAccountResult {
  id: string;
  platform: SocialPlatform;
  accountType: AccountType;
  accountId: string;
  accountName: string;
  profilePicture?: string;
  isActive: boolean;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class SocialConnectService {
  private readonly logger = new Logger(SocialConnectService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Universal function to create or update social account
   * Used by both OAuth callback and manual social account connection
   */
  async createOrUpdateSocialAccount(
    userId: string,
    accountData: SocialAccountData,
  ): Promise<CreateSocialAccountResult> {
    try {
      // Check if account already exists for this user
      const existingAccount = await this.prisma.socialAccount.findFirst({
        where: {
          userId,
          platform: accountData.platform,
          accountId: accountData.accountId,
          deletedAt: null, // Only consider non-deleted accounts
        },
      });

      if (existingAccount) {
        // Update existing account with new tokens and metadata
        const updatedAccount = await this.prisma.socialAccount.update({
          where: { id: existingAccount.id },
          data: {
            accessToken: accountData.accessToken,
            refreshToken: accountData.refreshToken,
            expiresAt: accountData.expiresAt,
            profilePicture: accountData.profilePicture || existingAccount.profilePicture,
            metadata: accountData.metadata || existingAccount.metadata,
            appId: accountData.appId || existingAccount.appId,
            appSecret: accountData.appSecret || existingAccount.appSecret,
            redirectUri: accountData.redirectUri || existingAccount.redirectUri,
            isActive: true,
            updatedAt: new Date(),
            updatedBy: userId,
          },
        });

        this.logger.log(
          `Updated existing ${accountData.platform} account for user ${userId}`,
        );

        return this.mapToResponseDto(updatedAccount);
      }

      // Check if account ID is already used by another user (for platforms like YouTube)
      const accountUsedByOtherUser = await this.prisma.socialAccount.findFirst({
        where: {
          platform: accountData.platform,
          accountId: accountData.accountId,
          userId: { not: userId },
          deletedAt: null,
        },
      });

      if (accountUsedByOtherUser) {
        throw new ConflictException(
          `This ${accountData.platform} account is already connected to another user`,
        );
      }

      // Create new social account
      const newAccount = await this.prisma.socialAccount.create({
        data: {
          userId,
          platform: accountData.platform,
          accountType: accountData.accountType,
          accountId: accountData.accountId,
          accountName: accountData.accountName,
          accessToken: accountData.accessToken,
          refreshToken: accountData.refreshToken,
          expiresAt: accountData.expiresAt,
          profilePicture: accountData.profilePicture,
          metadata: accountData.metadata,
          appId: accountData.appId,
          appSecret: accountData.appSecret,
          redirectUri: accountData.redirectUri,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: userId,
          updatedBy: userId,
        },
      });

      this.logger.log(
        `Created new ${accountData.platform} account for user ${userId}`,
      );

      return this.mapToResponseDto(newAccount);
    } catch (error) {
      this.logger.error(
        `Failed to create/update social account: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get OAuth configuration for a platform
   */
  getOAuthConfig(platform: SocialPlatform): {
    appId: string;
    appSecret: string;
    redirectUri: string;
    scopes: string[];
  } {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    switch (platform) {
      case SocialPlatform.YOUTUBE:
        return {
          appId: process.env.GOOGLE_CLIENT_ID || '',
          appSecret: process.env.GOOGLE_CLIENT_SECRET || '',
          redirectUri: `${baseUrl}/auth/callback/youtube`,
          scopes: [
            'https://www.googleapis.com/auth/youtube',
            'https://www.googleapis.com/auth/youtube.upload',
            'https://www.googleapis.com/auth/youtube.readonly',
            'openid',
            'email',
            'profile',
          ],
        };

      case SocialPlatform.FACEBOOK:
        return {
          appId: process.env.FACEBOOK_APP_ID || '',
          appSecret: process.env.FACEBOOK_APP_SECRET || '',
          redirectUri: `${baseUrl}/auth/callback/facebook`,
          scopes: [
            'email',
            'public_profile',
            'pages_manage_posts',
            'pages_read_engagement',
            'pages_show_list',
          ],
        };

      case SocialPlatform.INSTAGRAM:
        return {
          appId: process.env.INSTAGRAM_APP_ID || process.env.FACEBOOK_APP_ID || '',
          appSecret: process.env.INSTAGRAM_APP_SECRET || process.env.FACEBOOK_APP_SECRET || '',
          redirectUri: `${baseUrl}/auth/callback/instagram`,
          scopes: [
            'instagram_basic',
            'instagram_content_publish',
            'pages_show_list',
            'pages_read_engagement',
          ],
        };

      case SocialPlatform.TIKTOK:
        return {
          appId: process.env.TIKTOK_CLIENT_ID || '',
          appSecret: process.env.TIKTOK_CLIENT_SECRET || '',
          redirectUri: `${baseUrl}/auth/callback/tiktok`,
          scopes: ['user.info.basic', 'video.publish', 'video.upload'],
        };      case SocialPlatform.X:
        return {
          appId: process.env.X_CLIENT_ID || process.env.TWITTER_CLIENT_ID || '',
          appSecret: process.env.X_CLIENT_SECRET || process.env.TWITTER_CLIENT_SECRET || '',
          redirectUri: `${baseUrl}/auth/callback/x`,
          scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
        };

      case SocialPlatform.TELEGRAM:
        return {
          appId: process.env.TELEGRAM_BOT_TOKEN || '',
          appSecret: process.env.TELEGRAM_BOT_SECRET || '',
          redirectUri: `${baseUrl}/auth/callback/telegram`,
          scopes: ['bot'],
        };

      case SocialPlatform.ZALO:
        return {
          appId: process.env.ZALO_APP_ID || '',
          appSecret: process.env.ZALO_APP_SECRET || '',
          redirectUri: `${baseUrl}/auth/callback/zalo`,
          scopes: ['id', 'name', 'picture'],
        };

      default:
        throw new BadRequestException(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Process multiple accounts from OAuth callback (e.g., YouTube channels, Facebook pages)
   */
  async processMultipleAccounts(
    userId: string,
    platform: SocialPlatform,
    accounts: any[],
    accessToken: string,
    refreshToken?: string,
    oauthConfig?: any,
  ): Promise<CreateSocialAccountResult[]> {
    const results: CreateSocialAccountResult[] = [];

    for (const account of accounts) {
      try {
        let accountData: SocialAccountData;

        switch (platform) {
          case SocialPlatform.YOUTUBE:
            accountData = this.mapYouTubeChannelData(
              account,
              accessToken,
              refreshToken,
              oauthConfig,
            );
            break;

          case SocialPlatform.FACEBOOK:
            accountData = this.mapFacebookPageData(
              account,
              account.access_token || accessToken,
              oauthConfig,
            );
            break;

          default:
            throw new BadRequestException(`Multiple accounts not supported for ${platform}`);
        }

        const result = await this.createOrUpdateSocialAccount(userId, accountData);
        results.push(result);
      } catch (error) {
        this.logger.error(
          `Failed to process ${platform} account ${account.id}: ${error.message}`,
        );
        // Continue with other accounts even if one fails
      }
    }

    return results;
  }

  /**
   * Map YouTube channel data to SocialAccountData
   */
  private mapYouTubeChannelData(
    channel: any,
    accessToken: string,
    refreshToken?: string,
    oauthConfig?: any,
  ): SocialAccountData {
    return {
      platform: SocialPlatform.YOUTUBE,
      accountType: AccountType.CREATOR,
      accountId: channel.id,
      accountName: channel.snippet.title,
      accessToken,
      refreshToken,
      profilePicture:
        channel.snippet.thumbnails?.high?.url ||
        channel.snippet.thumbnails?.default?.url,
      metadata: {
        channelId: channel.id,
        channelTitle: channel.snippet.title,
        channelDescription: channel.snippet.description,
        subscriberCount: channel.statistics?.subscriberCount,
        videoCount: channel.statistics?.videoCount,
        viewCount: channel.statistics?.viewCount,
        thumbnails: channel.snippet.thumbnails,
        customUrl: channel.snippet.customUrl,
        publishedAt: channel.snippet.publishedAt,
      },
      appId: oauthConfig?.appId,
      appSecret: oauthConfig?.appSecret,
      redirectUri: oauthConfig?.redirectUri,
    };
  }

  /**
   * Map Facebook page data to SocialAccountData
   */
  private mapFacebookPageData(
    page: any,
    accessToken: string,
    oauthConfig?: any,
  ): SocialAccountData {
    return {
      platform: SocialPlatform.FACEBOOK,
      accountType: AccountType.PAGE,
      accountId: page.id,
      accountName: page.name,
      accessToken,
      profilePicture: page.picture?.data?.url,
      metadata: {
        pageId: page.id,
        pageName: page.name,
        pageCategory: page.category,
        fanCount: page.fan_count || 0,
        about: page.about,
        description: page.description,
        picture: page.picture?.data?.url,
        website: page.website,
        location: page.location,
      },
      appId: oauthConfig?.appId,
      appSecret: oauthConfig?.appSecret,
      redirectUri: oauthConfig?.redirectUri,
    };
  }

  /**
   * Soft delete social account
   */
  async deleteSocialAccount(userId: string, accountId: string): Promise<void> {
    const account = await this.prisma.socialAccount.findFirst({
      where: {
        id: accountId,
        userId,
        deletedAt: null,
      },
    });

    if (!account) {
      throw new BadRequestException('Social account not found or already deleted');
    }

    await this.prisma.socialAccount.update({
      where: { id: accountId },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
        isActive: false,
      },
    });

    this.logger.log(`Soft deleted social account ${accountId} for user ${userId}`);
  }

  /**
   * Get user's connected social accounts
   */
  async getUserSocialAccounts(userId: string): Promise<CreateSocialAccountResult[]> {
    const accounts = await this.prisma.socialAccount.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return accounts.map(account => this.mapToResponseDto(account));
  }

  /**
   * Map database model to response DTO
   */
  private mapToResponseDto(account: any): CreateSocialAccountResult {
    return {
      id: account.id,
      platform: account.platform,
      accountType: account.accountType,
      accountId: account.accountId,
      accountName: account.accountName,
      profilePicture: account.profilePicture,
      isActive: account.isActive,
      metadata: account.metadata,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }
}
