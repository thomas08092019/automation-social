import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { PaginationService } from '../../shared/services/pagination.service';
import {
  SocialConnectService,
  SocialAccountData,
} from '../auth/social-connect.service';
import { DateUtils } from '../../shared/utils/date.utils';
import { SocialAccountMapper } from '../../shared/mappers/social-account.mapper';
import {
  CreateSocialAccountDto,
  UpdateSocialAccountDto,
  SocialAccountResponseDto,
  SocialAccountQueryDto,
  SocialAccountsResponseDto,
} from './dto/social-account.dto';
import { Injectable as InjectableDecorator } from '@nestjs/common';
import { SocialPlatform, AccountType } from '@prisma/client';
import {
  SocialAccountNotFoundException,
  SocialAccountAlreadyExistsException,
  SocialAccountException,
} from '../../shared/exceptions/custom.exceptions';

@Injectable()
export class SocialAccountService {
  constructor(
    private prisma: PrismaService,
    private paginationService: PaginationService,
    private socialConnectService: SocialConnectService,
    private socialAccountMapper: SocialAccountMapper,
  ) {}
  async create(
    userId: string,
    createDto: CreateSocialAccountDto,
  ): Promise<SocialAccountResponseDto> {
    // Check if account already exists
    const existingAccount = await this.prisma.socialAccount.findFirst({
      where: {
        userId,
        platform: createDto.platform,
        accountId: createDto.accountId,
        deletedAt: null,
      },
    });
    if (existingAccount) {
      throw new SocialAccountAlreadyExistsException(createDto.platform);
    }

    const socialAccount = await this.prisma.socialAccount.create({
      data: {
        userId,
        platform: createDto.platform,
        accountType: createDto.accountType as any,
        accountId: createDto.accountId,
        accountName: createDto.username,
        accessToken: createDto.accessToken,
        refreshToken: createDto.refreshToken,
        expiresAt: createDto.expiresAt,
        profilePicture: createDto.profilePicture,
        metadata: createDto.metadata,
      },
      select: this.getSelectFields(),
    });

    return this.socialAccountMapper.mapToDto(socialAccount);
  }

  async findAll(
    userId: string,
    query: SocialAccountQueryDto,
  ): Promise<SocialAccountsResponseDto> {
    const where = this.buildWhereClause(userId, query);
    const orderBy = this.buildOrderBy(query);

    const result = await this.paginationService.paginate({
      model: this.prisma.socialAccount,
      where,
      orderBy,
      page: query.page,
      limit: query.limit,
      select: this.getSelectFields(),
    });
    return {
      data: result.data.map((account) =>
        this.socialAccountMapper.mapToDto(account),
      ),
      meta: result.pagination,
    };
  }

  async findById(
    userId: string,
    id: string,
  ): Promise<SocialAccountResponseDto> {
    const socialAccount = await this.prisma.socialAccount.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
      select: this.getSelectFields(),
    });
    if (!socialAccount) {
      throw new SocialAccountNotFoundException();
    }

    return this.socialAccountMapper.mapToDto(socialAccount);
  }

  async update(
    userId: string,
    id: string,
    updateDto: UpdateSocialAccountDto,
  ): Promise<SocialAccountResponseDto> {
    const existingAccount = await this.prisma.socialAccount.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
    });

    if (!existingAccount) {
      throw new SocialAccountNotFoundException();
    }

    const updatedAccount = await this.prisma.socialAccount.update({
      where: { id },
      data: updateDto,
      select: this.getSelectFields(),
    });

    return this.socialAccountMapper.mapToDto(updatedAccount);
  }

  async delete(userId: string, id: string): Promise<void> {
    const socialAccount = await this.prisma.socialAccount.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
    });

    if (!socialAccount) {
      throw new SocialAccountNotFoundException();
    }

    await this.prisma.socialAccount.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }

  async deleteBulk(userId: string, accountIds: string[]): Promise<void> {
    await this.prisma.socialAccount.updateMany({
      where: {
        id: { in: accountIds },
        userId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }

  async refreshToken(
    userId: string,
    id: string,
  ): Promise<SocialAccountResponseDto> {
    const socialAccount = await this.prisma.socialAccount.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
    });

    if (!socialAccount) {
      throw new SocialAccountNotFoundException();
    }

    // Implementation would involve calling the respective platform's token refresh endpoint
    // For now, we'll just return the account as-is
    return this.socialAccountMapper.mapToDto(socialAccount);
  }

  async refreshTokensBulk(userId: string, accountIds: string[]) {
    const accounts = await this.prisma.socialAccount.findMany({
      where: {
        id: { in: accountIds },
        userId,
        deletedAt: null,
      },
    });

    const successful: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const account of accounts) {
      try {
        // Refresh token logic would go here
        successful.push(account.id);
      } catch (error) {
        failed.push({
          id: account.id,
          error: error.message,
        });
      }
    }

    return { successful, failed };
  }

  async connectAccount(
    userId: string,
    accountData: SocialAccountData,
  ): Promise<SocialAccountResponseDto> {
    return this.socialConnectService.connectAccount(userId, accountData);
  }

  async findExpiredAccounts(): Promise<SocialAccountResponseDto[]> {
    const expiredAccounts = await this.prisma.socialAccount.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        expiresAt: {
          lte: new Date(),
        },
      },
      select: this.getSelectFields(),
    });

    return expiredAccounts.map((account) =>
      this.socialAccountMapper.mapToDto(account),
    );
  }

  private buildWhereClause(userId: string, query: SocialAccountQueryDto) {
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

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.search) {
      where.OR = [
        { accountName: { contains: query.search, mode: 'insensitive' } },
        { accountId: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private buildOrderBy(query: SocialAccountQueryDto) {
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';
    return { [sortBy]: sortOrder };
  }

  private getSelectFields() {
    return {
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
    };
  }
}
