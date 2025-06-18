import {
  Injectable,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { SocialAccountMapper } from '../../shared/mappers/social-account.mapper';
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

  constructor(
    private prisma: PrismaService,
    private socialAccountMapper: SocialAccountMapper,
  ) {}

  async connectAccount(
    userId: string,
    accountData: SocialAccountData,
  ): Promise<SocialAccountResponseDto> {
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

      return this.socialAccountMapper.mapToDto(updatedAccount);
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

      return this.socialAccountMapper.mapToDto(newAccount);
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

  async refreshAccountToken(
    userId: string,
    accountId: string,
  ): Promise<SocialAccountResponseDto> {
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
    this.logger.log(
      `Token refresh requested for account ${accountId} on ${account.platform}`,
    );
    return this.socialAccountMapper.mapToDto(account);
  }
}
