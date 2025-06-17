import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SocialPlatform, AccountType } from '@prisma/client';
import { PrismaService, PaginationService } from '../common';
import { SocialConnectService, SocialAccountData } from '../auth/social-connect.service';
import {
  CreateSocialAccountDto,
  UpdateSocialAccountDto,
  SocialAccountResponseDto,
  SocialAccountQueryDto,
  SocialAccountsResponseDto,
} from './dto/social-account.dto';

@Injectable()
export class SocialAccountService {
  constructor(
    private prisma: PrismaService,
    private socialConnectService: SocialConnectService,
  ) {}

  async create(
    userId: string,
    createDto: CreateSocialAccountDto,
  ): Promise<SocialAccountResponseDto> {
    const accountData: SocialAccountData = {
      platform: createDto.platform,
      accountType: AccountType.PROFILE,
      accountId: createDto.platformAccountId,
      accountName: createDto.username,
      accessToken: createDto.accessToken,
      refreshToken: createDto.refreshToken,
      expiresAt: createDto.expiresAt,
      profilePicture: createDto.profilePicture,
      metadata: createDto.metadata,
      ...this.socialConnectService.getOAuthConfig(createDto.platform),
    };

    const result = await this.socialConnectService.createOrUpdateSocialAccount(
      userId,
      accountData,
    );

    return {
      id: result.id,
      platform: result.platform,
      accountType: result.accountType,
      platformAccountId: result.accountId,
      username: result.accountName,
      scopes: [],
      profilePictureUrl: result.profilePicture,
      isActive: result.isActive,
      expiresAt: createDto.expiresAt,
      metadata: result.metadata,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }
  async findAll(
    userId: string,
    query: SocialAccountQueryDto,
  ): Promise<SocialAccountsResponseDto> {
    // Build where clause
    const where: any = {
      userId,
      deletedAt: null,
    };

    if (query.platform) {
      where.platform = query.platform;
    }

    if (query.accountType) {
      where.accountType = query.accountType;
    }

    if (query.status) {
      switch (query.status) {
        case 'active':
          where.isActive = true;
          break;
        case 'inactive':
          where.isActive = false;
          break;
        case 'expired':
          where.expiresAt = {
            lt: new Date(),
          };
          break;
      }
    }

    if (query.search) {
      where.OR = [
        { accountName: { contains: query.search, mode: 'insensitive' } },
        { accountId: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Get pagination parameters
    const { skip, take } = PaginationService.getPaginationParams(query);
    const orderBy = PaginationService.getOrderBy(query);

    // Get total count
    const total = await this.prisma.socialAccount.count({ where });

    // Get paginated data
    const accounts = await this.prisma.socialAccount.findMany({
      where,
      skip,
      take,
      orderBy,
      select: {
        id: true,
        platform: true,
        accountType: true,
        accountId: true,
        accountName: true,
        profilePicture: true,
        isActive: true,
        expiresAt: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        createdBy: true,
        updatedBy: true,
        deletedBy: true,
      },
    });

    // Map to response DTOs
    const mappedAccounts: SocialAccountResponseDto[] = accounts.map((account) => ({
      id: account.id,
      platform: account.platform,
      accountType: account.accountType,
      platformAccountId: account.accountId,
      username: account.accountName,
      scopes: [], // This would come from metadata if stored
      profilePictureUrl: account.profilePicture,
      isActive: account.isActive,
      expiresAt: account.expiresAt,
      metadata: account.metadata || {},
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
      deletedAt: account.deletedAt,
      createdBy: account.createdBy,
      updatedBy: account.updatedBy,
      deletedBy: account.deletedBy,
    }));    // Use PaginationService to create response
    return PaginationService.paginateFromQuery(mappedAccounts, total, {
      page: query.page || 1,
      limit: query.limit || 10,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  async remove(userId: string, accountId: string): Promise<void> {
    await this.socialConnectService.deleteSocialAccount(userId, accountId);
  }
}
