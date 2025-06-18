import { Injectable } from '@nestjs/common';
import { SocialAccount } from '@prisma/client';
import { BaseMapper } from './base.mapper';
import { SocialAccountResponseDto } from '../../modules/social-accounts/dto/social-account.dto';

@Injectable()
export class SocialAccountMapper extends BaseMapper<
  SocialAccount,
  SocialAccountResponseDto
> {
  /**
   * Map SocialAccount entity to response DTO
   */ mapToDto(account: any): SocialAccountResponseDto {
    const expirationStatus = this.calculateExpirationStatus(account.expiresAt);

    return {
      id: account.id,
      platform: account.platform,
      accountType: account.accountType,
      accountId: account.accountId,
      accountName: account.accountName,
      platformAccountId: account.accountId, // Legacy compatibility
      username: account.accountName, // Legacy compatibility
      scopes: [], // Schema doesn't have scopes field
      profilePictureUrl: this.mapOptional(account.profilePicture),
      isActive: this.mapBoolean(account.isActive, true),
      expiresAt: account.expiresAt,
      metadata: this.mapMetadata(account.metadata),
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
      isExpired: expirationStatus.isExpired,
      daysUntilExpiry: expirationStatus.daysUntilExpiry,
    };
  }

  /**
   * Map with user relationship
   */
  mapToDtoWithUser(
    account: SocialAccount & { user?: any },
  ): SocialAccountResponseDto & { user?: any } {
    const baseDto = this.mapToDto(account);

    if (account.user) {
      return {
        ...baseDto,
        user: {
          id: account.user.id,
          email: account.user.email,
          name: account.user.name,
          avatar: account.user.avatar,
        },
      };
    }

    return baseDto;
  }

  /**
   * Parse scopes from string or array
   */
  private parseScopes(scopes: string | string[] | null): string[] {
    if (!scopes) return [];

    if (Array.isArray(scopes)) {
      return scopes;
    }

    if (typeof scopes === 'string') {
      try {
        // Try to parse as JSON array first
        const parsed = JSON.parse(scopes);
        return Array.isArray(parsed) ? parsed : [scopes];
      } catch {
        // If not JSON, split by comma or space
        return scopes
          .split(/[,\s]+/)
          .filter((scope) => scope.trim().length > 0);
      }
    }

    return [];
  }

  /**
   * Map for connection/linking response
   */ mapToConnectionDto(account: SocialAccount): {
    success: boolean;
    platform: string;
    accountId: string;
    accountName: string;
    isActive: boolean;
    connectedAt: string;
  } {
    return {
      success: true,
      platform: account.platform,
      accountId: account.accountId,
      accountName: account.accountName,
      isActive: this.mapBoolean(account.isActive, true),
      connectedAt: account.createdAt.toISOString(),
    };
  }

  /**
   * Map for analytics/stats response
   */ mapToStatsDto(
    account: SocialAccount,
    stats?: any,
  ): {
    id: string;
    platform: string;
    accountName: string;
    isActive: boolean;
    lastUsed: string | null;
    postCount: number;
    engagementRate: number;
  } {
    return {
      id: account.id,
      platform: account.platform,
      accountName: account.accountName,
      isActive: this.mapBoolean(account.isActive, true),
      lastUsed: account.updatedAt.toISOString(),
      postCount: stats?.postCount || 0,
      engagementRate: stats?.engagementRate || 0,
    };
  }

  /**
   * Map multiple accounts grouped by platform
   */
  mapToGroupedDto(
    accounts: SocialAccount[],
  ): Record<string, SocialAccountResponseDto[]> {
    const grouped: Record<string, SocialAccountResponseDto[]> = {};

    accounts.forEach((account) => {
      const platform = account.platform;
      if (!grouped[platform]) {
        grouped[platform] = [];
      }
      grouped[platform].push(this.mapToDto(account));
    });

    return grouped;
  }

  /**
   * Map for minimal response (list views)
   */
  mapToMinimalDto(account: SocialAccount): {
    id: string;
    platform: string;
    accountName: string;
    profilePictureUrl: string | null;
    isActive: boolean;
    isExpired: boolean;
  } {
    const expirationStatus = this.calculateExpirationStatus(account.expiresAt);

    return {
      id: account.id,
      platform: account.platform,
      accountName: account.accountName,
      profilePictureUrl: this.mapOptional(account.profilePicture),
      isActive: this.mapBoolean(account.isActive, true),
      isExpired: expirationStatus.isExpired,
    };
  }
}
