import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { SocialPlatform } from '@prisma/client';
import { PrismaService } from '../common';
import {
  CreateSocialAccountDto,
  UpdateSocialAccountDto,
  SocialAccountResponseDto,
} from './dto/social-account.dto';

@Injectable()
export class SocialAccountService {
  constructor(private prisma: PrismaService) {}

  async create(
    userId: string,
    createDto: CreateSocialAccountDto,
  ): Promise<SocialAccountResponseDto> {
    // Check if account already exists for this user and platform
    const existingAccount = await this.prisma.socialAccount.findUnique({
      where: {
        platform_platformAccountId_userId: {
          platform: createDto.platform,
          platformAccountId: createDto.platformAccountId,
          userId,
        },
      },
    });

    if (existingAccount) {
      throw new ConflictException('Social account already connected');
    }

    const account = await this.prisma.socialAccount.create({
      data: {
        ...createDto,
        userId,
      },
      select: {
        id: true,
        platform: true,
        platformAccountId: true,
        username: true,
        scopes: true,
        profilePictureUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return account;
  }

  async findAllByUser(userId: string): Promise<SocialAccountResponseDto[]> {
    return this.prisma.socialAccount.findMany({
      where: { userId },
      select: {
        id: true,
        platform: true,
        platformAccountId: true,
        username: true,
        scopes: true,
        profilePictureUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByPlatform(
    userId: string,
    platform: SocialPlatform,
  ): Promise<SocialAccountResponseDto[]> {
    return this.prisma.socialAccount.findMany({
      where: {
        userId,
        platform,
        isActive: true,
      },
      select: {
        id: true,
        platform: true,
        platformAccountId: true,
        username: true,
        scopes: true,
        profilePictureUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findById(
    userId: string,
    accountId: string,
  ): Promise<SocialAccountResponseDto> {
    const account = await this.prisma.socialAccount.findFirst({
      where: {
        id: accountId,
        userId,
      },
      select: {
        id: true,
        platform: true,
        platformAccountId: true,
        username: true,
        scopes: true,
        profilePictureUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!account) {
      throw new NotFoundException('Social account not found');
    }

    return account;
  }

  async update(
    userId: string,
    accountId: string,
    updateDto: UpdateSocialAccountDto,
  ): Promise<SocialAccountResponseDto> {
    // Check if account exists and belongs to user
    await this.findById(userId, accountId);

    const account = await this.prisma.socialAccount.update({
      where: { id: accountId },
      data: updateDto,
      select: {
        id: true,
        platform: true,
        platformAccountId: true,
        username: true,
        scopes: true,
        profilePictureUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return account;
  }

  async delete(userId: string, accountId: string): Promise<void> {
    // Check if account exists and belongs to user
    await this.findById(userId, accountId);

    await this.prisma.socialAccount.delete({
      where: { id: accountId },
    });
  }

  async getAccessToken(userId: string, accountId: string): Promise<string> {
    const account = await this.prisma.socialAccount.findFirst({
      where: {
        id: accountId,
        userId,
        isActive: true,
      },
      select: {
        accessToken: true,
        refreshToken: true,
        tokenExpiresAt: true,
      },
    });

    if (!account) {
      throw new NotFoundException('Social account not found or inactive');
    }

    // TODO: Implement token refresh logic if expired
    if (account.tokenExpiresAt && account.tokenExpiresAt < new Date()) {
      // Token expired, need to refresh
      throw new Error('Access token expired, refresh needed');
    }

    return account.accessToken;
  }
}
