import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { SocialPlatform, AccountType } from '@prisma/client';
import { PrismaService } from '../common';
import { TokenManagerService } from '../auth/token-manager.service';
import { EnhancedSocialAppService } from '../auth/enhanced-social-app.service';
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
    private tokenManagerService: TokenManagerService,
    private enhancedSocialAppService: EnhancedSocialAppService,
  ) {}

  /**
   * Convert string account type to AccountType enum
   */
  private convertToAccountType(accountType?: string): AccountType {
    if (!accountType) return AccountType.PROFILE;
    
    const upperType = accountType.toUpperCase();
    switch (upperType) {
      case 'PAGE':
        return AccountType.PAGE;
      case 'GROUP':
        return AccountType.GROUP;
      case 'PROFILE':
        return AccountType.PROFILE;
      case 'BUSINESS':
        return AccountType.BUSINESS;
      case 'CREATOR':
        return AccountType.CREATOR;
      default:
        return AccountType.PROFILE; // Default fallback
    }
  }
  async create(
    userId: string,
    createDto: CreateSocialAccountDto,
  ): Promise<SocialAccountResponseDto> {
    // Validate required fields
    if (!createDto.accessToken || !createDto.accessToken.trim()) {
      console.error('=== SOCIAL ACCOUNT CREATE ERROR ===');
      console.error('Missing or empty accessToken in createDto:', {
        platform: createDto.platform,
        platformAccountId: createDto.platformAccountId,
        username: createDto.username,
        hasAccessToken: !!createDto.accessToken,
        accessTokenLength: createDto.accessToken?.length || 0,
        accessTokenPreview: createDto.accessToken ? `${createDto.accessToken.substring(0, 10)}...` : 'NULL'
      });
      console.error('===================================');
      throw new BadRequestException(`Access token is required for creating ${createDto.platform} social account`);
    }

    console.log('=== SOCIAL ACCOUNT CREATE DEBUG ===');
    console.log('Platform:', createDto.platform);
    console.log('Username:', createDto.username);
    console.log('Access Token Length:', createDto.accessToken.length);
    console.log('Has Refresh Token:', !!createDto.refreshToken);
    console.log('====================================');// Check if account already exists for this user and platform
    const existingAccount = await this.prisma.socialAccount.findFirst({
      where: {
        platform: createDto.platform,
        accountId: createDto.platformAccountId,
        userId,
      },
    });

    if (existingAccount) {
      // Update existing account with new tokens and data instead of throwing error
      const updatedAccount = await this.prisma.socialAccount.update({
        where: { id: existingAccount.id },
        data: {
          accountName: createDto.username,
          accessToken: createDto.accessToken,
          refreshToken: createDto.refreshToken,
          expiresAt: createDto.expiresAt,
          profilePicture: createDto.profilePicture,
          accountType: createDto.accountType 
            ? this.convertToAccountType(createDto.accountType)
            : existingAccount.accountType,
          metadata: createDto.metadata || existingAccount.metadata,
          isActive: true, // Reactivate account if it was disabled
        },        select: {
          id: true,
          platform: true,
          accountType: true,
          accountId: true,
          accountName: true,
          profilePicture: true,
          isActive: true,
          expiresAt: true,
          metadata: true, // FIXED: Include metadata in select for updates
          createdAt: true,
          updatedAt: true,
        },
      });

      // Map schema fields to DTO fields for updated account
      console.log('=== UPDATED ACCOUNT RESPONSE DEBUG ===');
      console.log('Updated account metadata:', updatedAccount.metadata);
      console.log('=====================================');
        return {
        id: updatedAccount.id,
        platform: updatedAccount.platform,
        accountType: updatedAccount.accountType,
        platformAccountId: updatedAccount.accountId,
        username: updatedAccount.accountName,
        scopes: createDto.scopes,
        profilePictureUrl: updatedAccount.profilePicture,
        isActive: updatedAccount.isActive,
        metadata: updatedAccount.metadata || {}, // FIXED: Include metadata in response
        expiresAt: updatedAccount.expiresAt,
        createdAt: updatedAccount.createdAt,
        updatedAt: updatedAccount.updatedAt,
      };
    }    // Find or create appropriate social app for this user and platform
    let socialAppId: string;
    
    try {
      // First, try to find an existing social app for this user and platform
      const existingApp = await this.prisma.socialApp.findFirst({
        where: {
          userId,
          platform: createDto.platform,
          isDefault: true,
        },
      });

      if (existingApp) {
        socialAppId = existingApp.id;
      } else {
        // Try to find any app for this user and platform
        const anyApp = await this.prisma.socialApp.findFirst({
          where: {
            userId,
            platform: createDto.platform,
          },
        });

        if (anyApp) {
          socialAppId = anyApp.id;
        } else {
          // Try to get app config using the enhanced service (will use system defaults if available)
          try {
            const appConfig = await this.enhancedSocialAppService.getAppConfig({
              userId,
              platform: createDto.platform,
              requireCustomApp: false,
            });

            if (appConfig.socialAppId) {
              socialAppId = appConfig.socialAppId;
            } else {
              // Create a default app using system config
              const createdApp = await this.enhancedSocialAppService.createApp(userId, {
                name: `Default ${createDto.platform} App`,
                platform: createDto.platform,
                appId: appConfig.appId,
                appSecret: appConfig.appSecret,
                redirectUri: appConfig.redirectUri,
                isDefault: true,
              });
              socialAppId = createdApp.id;
            }
          } catch (appConfigError) {
            throw new BadRequestException(
              `No social app configuration available for ${createDto.platform}. ` +
              `Please configure your app credentials first or ensure OAuth credentials are properly set. ` +
              `Error: ${appConfigError.message}`
            );
          }
        }
      }
    } catch (error) {
      throw new BadRequestException(
        `Failed to find or create social app configuration: ${error.message}`
      );
    }    console.log("🚀 ~ SocialAccountService ~ socialAppId:", socialAppId);

    // Debug metadata before creating account
    console.log('=== CREATING SOCIAL ACCOUNT DEBUG ===');
    console.log('Platform:', createDto.platform);
    console.log('Metadata being saved:', createDto.metadata);
    console.log('Metadata keys:', createDto.metadata ? Object.keys(createDto.metadata) : 'No metadata');
    console.log('====================================');

    const account = await this.prisma.socialAccount.create({
      data: {
        platform: createDto.platform,
        accountType: this.convertToAccountType(createDto.accountType),
        accountId: createDto.platformAccountId,
        accountName: createDto.username,
        accessToken: createDto.accessToken,
        refreshToken: createDto.refreshToken,
        expiresAt: createDto.expiresAt,
        profilePicture: createDto.profilePicture,        metadata: createDto.metadata || {}, // FIXED: Include metadata in creation
        userId,
        socialAppId, // Use the proper socialAppId we found/created
      },      select: {
        id: true,
        platform: true,
        accountType: true,
        accountId: true,
        accountName: true,
        profilePicture: true,
        isActive: true,
        expiresAt: true,
        metadata: true, // FIXED: Include metadata in select
        createdAt: true,
        updatedAt: true,
      },
    });    // Map schema fields to DTO fields
    console.log('=== FINAL ACCOUNT RESPONSE DEBUG ===');
    console.log('Account metadata from DB:', account.metadata);
    console.log('Account metadata keys:', account.metadata ? Object.keys(account.metadata) : 'No metadata');
    console.log('===================================');
      return {
      id: account.id,
      platform: account.platform,
      accountType: account.accountType,
      platformAccountId: account.accountId,
      username: account.accountName,
      scopes: createDto.scopes,
      profilePictureUrl: account.profilePicture,
      isActive: account.isActive,
      metadata: account.metadata || {}, // FIXED: Include metadata in response
      expiresAt: account.expiresAt,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
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
    }));    return {
      data,
      total,
      page,
      limit,
      totalPages,
      hasNextPage,
      hasPrevPage,
    };
  }
  async refreshToken(
    userId: string,
    accountId: string,
  ): Promise<SocialAccountResponseDto> {
    console.log('=== REFRESH TOKEN DEBUG ===');
    console.log('User ID:', userId);
    console.log('Account ID:', accountId);
    console.log('Timestamp:', new Date().toISOString());
    
    // Get the social account
    const account = await this.prisma.socialAccount.findFirst({
      where: {
        id: accountId,
        userId,
      },
    });    console.log('Account found:', !!account);
    if (account) {
      console.log('Account details:', {
        id: account.id,
        platform: account.platform,
        accountName: account.accountName,
        userId: account.userId,
        isActive: account.isActive,
        hasAccessToken: !!account.accessToken,
        hasRefreshToken: !!account.refreshToken,
        accessTokenLength: account.accessToken?.length || 0,
        refreshTokenLength: account.refreshToken?.length || 0,
        expiresAt: account.expiresAt
      });
    } else {
      // Check if account exists with different userId
      const accountWithDifferentUser = await this.prisma.socialAccount.findUnique({
        where: { id: accountId },
        select: { id: true, userId: true, platform: true, accountName: true }
      });
      
      console.log('Account exists with different user:', !!accountWithDifferentUser);
      if (accountWithDifferentUser) {
        console.log('Account belongs to different user:', {
          accountId: accountWithDifferentUser.id,
          actualUserId: accountWithDifferentUser.userId,
          requestedUserId: userId,
          platform: accountWithDifferentUser.platform,
          accountName: accountWithDifferentUser.accountName
        });
      }
    }
    console.log('===========================');

    if (!account) {
      throw new NotFoundException('Social account not found');
    }    // Facebook uses access token exchange instead of refresh tokens
    if (!account.refreshToken && account.platform !== 'FACEBOOK') {
      throw new BadRequestException('No refresh token available for this account');
    }

    // Use TokenManagerService to refresh the token
    const refreshResult = await this.tokenManagerService.refreshTokenIfNeeded(accountId);

    if (!refreshResult.success) {
      throw new BadRequestException(refreshResult.errorMessage || 'Failed to refresh token');
    }

    // Get updated account data
    const updatedAccount = await this.prisma.socialAccount.findUnique({
      where: { id: accountId },
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
      },
    });    // Map to response DTO
    return {
      id: updatedAccount.id,
      platform: updatedAccount.platform,
      accountType: updatedAccount.accountType,
      platformAccountId: updatedAccount.accountId,
      username: updatedAccount.accountName,
      scopes: [], // Default empty array since not in schema
      profilePictureUrl: updatedAccount.profilePicture,
      isActive: updatedAccount.isActive,
      expiresAt: updatedAccount.expiresAt,
      metadata: updatedAccount.metadata || {},
      createdAt: new Date(), // Default value since not in schema
      updatedAt: new Date(), // Default value since not in schema
    };
  }
  async deleteBulk(userId: string, accountIds: string[]): Promise<{ success: boolean; deletedCount: number; errors?: any[] }> {
    console.log('=== DELETE BULK DEBUG START ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('User ID:', userId);
    console.log('Account IDs to delete:', accountIds);
    console.log('Account IDs count:', accountIds?.length);

    if (!accountIds || accountIds.length === 0) {
      console.log('ERROR: Account IDs array is empty or null');
      throw new BadRequestException('Account IDs array cannot be empty');
    }

    const errors: any[] = [];
    let deletedCount = 0;

    for (const accountId of accountIds) {
      try {
        console.log(`--- Processing account ID: ${accountId} ---`);
        
        // Check if account exists and belongs to user
        const account = await this.prisma.socialAccount.findFirst({
          where: {
            id: accountId,
            userId,
          },
        });

        console.log('Account found for delete:', !!account);
        if (account) {
          console.log('Account details:', {
            id: account.id,
            platform: account.platform,
            accountName: account.accountName,
            userId: account.userId,
            isActive: account.isActive
          });
        }

        if (!account) {
          console.log(`Account ${accountId} not found for user ${userId}`);
          
          // Check if account exists with different user ID for debugging
          const accountWithDifferentUser = await this.prisma.socialAccount.findFirst({
            where: { id: accountId },
            select: { id: true, userId: true, platform: true, accountName: true }
          });
          
          if (accountWithDifferentUser) {
            console.log('Account exists but with different user ID:', {
              accountId: accountWithDifferentUser.id,
              expectedUserId: userId,
              actualUserId: accountWithDifferentUser.userId,
              platform: accountWithDifferentUser.platform,
              accountName: accountWithDifferentUser.accountName
            });
          } else {
            console.log('Account does not exist in database at all');
          }
          
          errors.push({
            accountId,
            error: 'Account not found or access denied',
          });
          continue;
        }

        // Delete the account
        console.log(`Deleting account ${accountId}...`);
        await this.prisma.socialAccount.delete({
          where: { id: accountId },
        });

        console.log(`Successfully deleted account ${accountId}`);
        deletedCount++;
      } catch (error) {
        console.log(`Error deleting account ${accountId}:`, error.message);
        errors.push({
          accountId,
          error: error.message,
        });
      }
    }

    const result = {
      success: deletedCount > 0,
      deletedCount,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log('Delete bulk result:', result);
    console.log('=== DELETE BULK DEBUG END ===');

    return result;
  }
  async refreshTokensBulk(userId: string, accountIds: string[]): Promise<{
    successCount: number;
    failureCount: number;
    results: Array<{
      accountId: string;
      success: boolean;
      account?: SocialAccountResponseDto;
      error?: string;
    }>;
  }> {
    console.log('=== REFRESH BULK DEBUG START ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('User ID:', userId);
    console.log('Account IDs to refresh:', accountIds);
    console.log('Account IDs count:', accountIds?.length);

    if (!accountIds || accountIds.length === 0) {
      console.log('ERROR: Account IDs array is empty or null');
      throw new BadRequestException('Account IDs array cannot be empty');
    }

    const results: Array<{
      accountId: string;
      success: boolean;
      account?: SocialAccountResponseDto;
      error?: string;
    }> = [];

    let successCount = 0;
    let failureCount = 0;

    for (const accountId of accountIds) {
      console.log(`--- Processing refresh for account ID: ${accountId} ---`);
      
      try {
        const refreshedAccount = await this.refreshToken(userId, accountId);
        console.log(`Successfully refreshed account ${accountId}`);
        
        results.push({
          accountId,
          success: true,
          account: refreshedAccount,
        });
        successCount++;
      } catch (error) {
        console.log(`Failed to refresh account ${accountId}:`, error.message);
        
        results.push({
          accountId,
          success: false,
          error: error.message,
        });
        failureCount++;
      }
    }

    const result = {
      successCount,
      failureCount,
      results,
    };

    console.log('Refresh bulk final result:', {
      successCount: result.successCount,
      failureCount: result.failureCount,
      totalProcessed: result.results.length
    });
    console.log('=== REFRESH BULK DEBUG END ===');

    return result;
  }
}
