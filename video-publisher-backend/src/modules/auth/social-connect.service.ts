import {
  Injectable,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { SocialPlatform, AccountType } from '@prisma/client';
import { SocialAccountResponseDto } from '../social-accounts/dto/social-account.dto';

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

@Injectable()
export class SocialConnectService {
  private readonly logger = new Logger(SocialConnectService.name);

  constructor(private prisma: PrismaService) {}

  async connectAccount(userId: string, accountData: SocialAccountData): Promise<SocialAccountResponseDto> {
    // Check if account already exists
    const existingAccount = await this.prisma.socialAccount.findFirst({
      where: {
        userId,
        platform: accountData.platform,
        accountId: accountData.accountId,
        deletedAt: null,
      },
    });

    if (existingAccount) {
      // Update existing account
      const updatedAccount = await this.prisma.socialAccount.update({
        where: { id: existingAccount.id },
        data: {
          accountName: accountData.accountName,
          accessToken: accountData.accessToken,
          refreshToken: accountData.refreshToken,
          expiresAt: accountData.expiresAt,
          profilePicture: accountData.profilePicture,
          metadata: accountData.metadata,
          isActive: true,
        },
      });

      return this.mapToResponseDto(updatedAccount);
    } else {
      // Create new account
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
        },
      });

      return this.mapToResponseDto(newAccount);
    }
  }

  async disconnectAccount(userId: string, accountId: string): Promise<void> {
    const account = await this.prisma.socialAccount.findFirst({
      where: {
        id: accountId,
        userId,
        deletedAt: null,
      },
    });

    if (!account) {
      throw new BadRequestException('Social account not found');
    }

    await this.prisma.socialAccount.update({
      where: { id: accountId },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }

  async refreshAccountToken(userId: string, accountId: string): Promise<SocialAccountResponseDto> {
    const account = await this.prisma.socialAccount.findFirst({
      where: {
        id: accountId,
        userId,
        deletedAt: null,
      },
    });

    if (!account) {
      throw new BadRequestException('Social account not found');
    }

    // Here you would implement platform-specific token refresh logic
    // For now, we'll just return the existing account
    this.logger.log(`Token refresh requested for account ${accountId} on ${account.platform}`);

    return this.mapToResponseDto(account);
  }
  private mapToResponseDto(account: any): SocialAccountResponseDto {
    return {
      id: account.id,
      platform: account.platform,
      accountType: account.accountType,
      accountId: account.accountId,
      accountName: account.accountName,
      platformAccountId: account.accountId, // Using accountId as platformAccountId
      username: account.accountName, // Using accountName as username
      scopes: [], // Default empty array
      profilePictureUrl: account.profilePicture,
      isActive: account.isActive,
      expiresAt: account.expiresAt,
      metadata: account.metadata,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
      isExpired: account.expiresAt ? new Date() > new Date(account.expiresAt) : false,
      daysUntilExpiry: account.expiresAt 
        ? Math.max(0, Math.ceil((new Date(account.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
        : null,
    };
  }
}
