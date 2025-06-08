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
  SocialAccountQueryDto,
  SocialAccountsResponseDto,
} from './dto/social-account.dto';

@Injectable()
export class SocialAccountService {
  constructor(private prisma: PrismaService) {}

  async create(
    userId: string,
    createDto: CreateSocialAccountDto,
  ): Promise<SocialAccountResponseDto> {
    // Check if account already exists for this user and platform
    const existingAccount = await this.prisma.socialAccount.findFirst({
      where: {
        platform: createDto.platform,
        accountId: createDto.platformAccountId,
        userId,
      },
    });

    if (existingAccount) {
      throw new ConflictException('Social account already connected');
    }

    const account = await this.prisma.socialAccount.create({
      data: {
        platform: createDto.platform,
        accountType: 'PROFILE', // Use valid enum value
        accountId: createDto.platformAccountId,
        accountName: createDto.username,
        accessToken: createDto.accessToken,
        refreshToken: createDto.refreshToken,
        expiresAt: createDto.expiresAt,
        profilePicture: createDto.profilePictureUrl,
        userId,
        socialAppId: 'default-social-app-id', // You may need to provide this properly
      },
      select: {
        id: true,
        platform: true,
        accountId: true,
        accountName: true,
        profilePicture: true,
        isActive: true,
      },
    });

    // Map schema fields to DTO fields
    return {
      id: account.id,
      platform: account.platform,
      platformAccountId: account.accountId,
      username: account.accountName,
      scopes: createDto.scopes,
      profilePictureUrl: account.profilePicture,
      isActive: account.isActive,
      createdAt: new Date(), // Default value since not in schema
      updatedAt: new Date(), // Default value since not in schema
    };
  }

  async findAllByUser(userId: string): Promise<SocialAccountResponseDto[]> {
    const accounts = await this.prisma.socialAccount.findMany({
      where: { userId },
      select: {
        id: true,
        platform: true,
        accountType: true,
        accountId: true,
        accountName: true,
        profilePicture: true,
        isActive: true,
        metadata: true,
        expiresAt: true,
      },
    });

    // Map schema fields to DTO fields
    return accounts.map(account => ({
      id: account.id,
      platform: account.platform,
      accountType: account.accountType,
      platformAccountId: account.accountId,
      username: account.accountName,
      scopes: [], // Default empty array since not in schema
      profilePictureUrl: account.profilePicture,
      isActive: account.isActive,
      expiresAt: account.expiresAt ? new Date(account.expiresAt) : null,
      metadata: account.metadata || {}, // Default to empty object if not set
      createdAt: new Date(), // Default value since not in schema
      updatedAt: new Date(), // Default value since not in schema
    }));
  }

  async findByPlatform(
    userId: string,
    platform: SocialPlatform,
  ): Promise<SocialAccountResponseDto[]> {
    const accounts = await this.prisma.socialAccount.findMany({
      where: {
        userId,
        platform,
        isActive: true,
      },
      select: {
        id: true,
        platform: true,
        accountType: true,
        accountId: true,
        accountName: true,
        profilePicture: true,
        isActive: true,
        metadata: true,
        expiresAt: true,
      },
    });

    // Map schema fields to DTO fields
    return accounts.map(account => ({
      id: account.id,
      platform: account.platform,
      accountType: account.accountType,
      platformAccountId: account.accountId,
      username: account.accountName,
      scopes: [], // Default empty array since not in schema
      profilePictureUrl: account.profilePicture,
      isActive: account.isActive,
      expiresAt: account.expiresAt ? new Date(account.expiresAt) : null,
      metadata: account.metadata || {}, // Default to empty object if not set
      createdAt: new Date(), // Default value since not in schema
      updatedAt: new Date(), // Default value since not in schema
    }));
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
        accountId: true,
        accountName: true,
        profilePicture: true,
        isActive: true,
      },
    });

    if (!account) {
      throw new NotFoundException('Social account not found');
    }

    // Map schema fields to DTO fields
    return {
      id: account.id,
      platform: account.platform,
      platformAccountId: account.accountId,
      username: account.accountName,
      scopes: [], // Default empty array since not in schema
      profilePictureUrl: account.profilePicture,
      isActive: account.isActive,
      createdAt: new Date(), // Default value since not in schema
      updatedAt: new Date(), // Default value since not in schema
    };
  }

  async update(
    userId: string,
    accountId: string,
    updateDto: UpdateSocialAccountDto,
  ): Promise<SocialAccountResponseDto> {
    // Check if account exists and belongs to user
    await this.findById(userId, accountId);

    // Map DTO fields to schema fields
    const updateData: any = {};
    if (updateDto.username) updateData.accountName = updateDto.username;
    if (updateDto.accessToken) updateData.accessToken = updateDto.accessToken;
    if (updateDto.refreshToken) updateData.refreshToken = updateDto.refreshToken;
    if (updateDto.expiresAt) updateData.expiresAt = updateDto.expiresAt;
    if (updateDto.profilePictureUrl) updateData.profilePicture = updateDto.profilePictureUrl;
    if (updateDto.isActive !== undefined) updateData.isActive = updateDto.isActive;

    const account = await this.prisma.socialAccount.update({
      where: { id: accountId },
      data: updateData,
      select: {
        id: true,
        platform: true,
        accountId: true,
        accountName: true,
        profilePicture: true,
        isActive: true,
      },
    });

    // Map schema fields to DTO fields
    return {
      id: account.id,
      platform: account.platform,
      platformAccountId: account.accountId,
      username: account.accountName,
      scopes: updateDto.scopes || [], // Use provided scopes or empty array
      profilePictureUrl: account.profilePicture,
      isActive: account.isActive,
      createdAt: new Date(), // Default value since not in schema
      updatedAt: new Date(), // Default value since not in schema
    };
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
        expiresAt: true,
      },
    });

    if (!account) {
      throw new NotFoundException('Social account not found or inactive');
    }

    // Check token expiry and handle refresh if needed
    if (account.expiresAt && account.expiresAt < new Date()) {
      throw new Error('Access token expired - refresh required');
    }

    return account.accessToken;
  }
  async findAllByUserWithPagination(
    userId: string,
    query: SocialAccountQueryDto,
  ): Promise<SocialAccountsResponseDto> {
    const {
      search,
      platform,
      accountType,
      status,
      page = 1,
      limit = 10,
      sortBy = 'accountName',
      sortOrder = 'desc',
    } = query;

    // Build where clause
    const where: any = {
      userId,
    };

    // Platform filter
    if (platform) {
      where.platform = platform;
    }

    // Account type filter
    if (accountType) {
      where.accountType = accountType;
    }

    // Status filter
    if (status) {
      if (status === 'active') {
        where.isActive = true;
        where.OR = [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ];
      } else if (status === 'inactive') {
        where.isActive = false;
      } else if (status === 'expired') {
        where.isActive = true;
        where.expiresAt = { lte: new Date() };
      }
    }

    // Search filter (search in account name and account ID)
    if (search) {
      where.OR = [
        { accountName: { contains: search, mode: 'insensitive' } },
        { accountId: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Count total records
    const total = await this.prisma.socialAccount.count({ where });

    // Calculate pagination
    const skip = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;    // Build order by - validate sortBy field exists in schema
    const validSortFields = ['accountName', 'platform', 'accountType', 'isActive', 'expiresAt'];
    const validSortBy = validSortFields.includes(sortBy) ? sortBy : 'accountName';
    
    const orderBy: any = {};
    orderBy[validSortBy] = sortOrder;// Fetch accounts
    const accounts = await this.prisma.socialAccount.findMany({
      where,
      select: {
        id: true,
        platform: true,
        accountType: true,
        accountId: true,
        accountName: true,
        profilePicture: true,
        isActive: true,
        metadata: true,
        expiresAt: true,
      },
      orderBy,
      skip,
      take: limit,
    });    // Map schema fields to DTO fields
    const data = accounts.map(account => ({
      id: account.id,
      platform: account.platform,
      accountType: account.accountType,
      platformAccountId: account.accountId,
      username: account.accountName,
      scopes: [], // Default empty array since not in schema
      profilePictureUrl: account.profilePicture,
      isActive: account.isActive,
      expiresAt: account.expiresAt,
      metadata: account.metadata || {}, // Default to empty object if not set
      createdAt: new Date(), // Default value since not in schema
      updatedAt: new Date(), // Default value since not in schema
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages,
      hasNextPage,
      hasPrevPage,
    };
  }
}
