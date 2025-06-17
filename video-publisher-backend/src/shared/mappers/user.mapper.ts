import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { BaseMapper } from './base.mapper';
import { UserResponseDto } from '../../modules/users/dto/user.dto';

@Injectable()
export class UserMapper extends BaseMapper<User, UserResponseDto> {
  
  /**
   * Map User entity to response DTO
   */
  mapToDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      profilePicture: this.mapOptional(user.profilePicture),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Map User with social accounts
   */
  mapToDtoWithSocialAccounts(user: User & { socialAccounts?: any[] }): UserResponseDto & { socialAccounts?: any[] } {
    const baseDto = this.mapToDto(user);
    
    if (user.socialAccounts) {
      return {
        ...baseDto,
        socialAccounts: user.socialAccounts.map(account => ({
          id: account.id,
          platform: account.platform,
          accountName: account.accountName,
          isActive: account.isActive,
        })),
      };
    }
    
    return baseDto;
  }

  /**
   * Map for profile response
   */
  mapToProfileDto(user: User): {
    id: string;
    email: string;
    username: string;
    profilePicture: string | null;
    joinedAt: string;
    socialAccountsCount: number;
  } {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      profilePicture: this.mapOptional(user.profilePicture),
      joinedAt: user.createdAt.toISOString(),
      socialAccountsCount: 0, // Will be populated separately
    };
  }

  /**
   * Map for minimal user info (public profile)
   */
  mapToPublicDto(user: User): {
    id: string;
    username: string;
    profilePicture: string | null;
  } {
    return {
      id: user.id,
      username: user.username,
      profilePicture: this.mapOptional(user.profilePicture),
    };
  }

  /**
   * Map for auth response
   */
  mapToAuthDto(user: User, tokens: { accessToken: string; refreshToken: string }): {
    user: UserResponseDto;
    tokens: { accessToken: string; refreshToken: string };
  } {
    return {
      user: this.mapToDto(user),
      tokens,
    };
  }

  /**
   * Map for user settings
   */
  mapToSettingsDto(user: User): {
    id: string;
    email: string;
    username: string;
    profilePicture: string | null;
    preferences: Record<string, any>;
  } {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      profilePicture: this.mapOptional(user.profilePicture),
      preferences: {}, // Will be extended later
    };
  }
}
