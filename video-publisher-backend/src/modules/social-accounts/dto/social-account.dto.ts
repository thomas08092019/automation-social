import {
  IsEnum,
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SocialPlatform } from '@prisma/client';
import { BaseDto, PaginationQueryDto, PaginatedResponseDto } from '../../../shared/dto';

export class CreateSocialAccountDto {
  @ApiProperty({ enum: SocialPlatform, description: 'Social media platform' })
  @IsEnum(SocialPlatform)
  platform: SocialPlatform;

  @ApiProperty({ description: 'Platform-specific account ID' })
  @IsString()
  platformAccountId: string;

  @ApiProperty({ description: 'Legacy account ID field' })
  @IsString()
  accountId: string;

  @ApiProperty({ description: 'Username on the platform' })
  @IsString()
  username: string;

  @ApiProperty({ description: 'Display name', required: false })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiProperty({ description: 'Account type', required: false })
  @IsOptional()
  @IsString()
  accountType?: string;

  @ApiProperty({ description: 'OAuth access token' })
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @ApiProperty({ description: 'OAuth refresh token', required: false })
  @IsOptional()
  @IsString()
  refreshToken?: string;

  @ApiProperty({ description: 'Token expiration date', required: false })
  @IsOptional()
  expiresAt?: Date;

  @ApiProperty({ description: 'OAuth scopes', type: [String] })
  @IsArray()
  @IsString({ each: true })
  scopes: string[];

  @ApiProperty({ description: 'Profile picture URL', required: false })
  @IsOptional()
  @IsString()
  profilePicture?: string;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsOptional()
  metadata?: any;
}

export class UpdateSocialAccountDto {
  @ApiProperty({ description: 'Username on the platform', required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ description: 'OAuth access token', required: false })
  @IsOptional()
  @IsString()
  accessToken?: string;

  @ApiProperty({ description: 'OAuth refresh token', required: false })
  @IsOptional()
  @IsString()
  refreshToken?: string;

  @ApiProperty({ description: 'Token expiration date', required: false })
  @IsOptional()
  expiresAt?: Date;

  @ApiProperty({ description: 'OAuth scopes', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];

  @ApiProperty({ description: 'Profile picture URL', required: false })
  @IsOptional()
  @IsString()
  profilePictureUrl?: string;

  @ApiProperty({ description: 'Whether account is active', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SocialAccountQueryDto extends PaginationQueryDto {
  @ApiProperty({ enum: SocialPlatform, description: 'Filter by platform', required: false })
  @IsOptional()
  @IsEnum(SocialPlatform)
  platform?: SocialPlatform;

  @ApiProperty({ description: 'Filter by account type', required: false })
  @IsOptional()
  @IsString()
  accountType?: string;

  @ApiProperty({ description: 'Filter by active status', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ 
    description: 'Filter by status', 
    enum: ['active', 'inactive', 'expired'],
    required: false 
  })
  @IsOptional()
  @IsString()
  status?: 'active' | 'inactive' | 'expired';
}

export class SocialAccountResponseDto extends BaseDto {
  @ApiProperty({ enum: SocialPlatform, description: 'Social media platform' })
  platform: SocialPlatform;

  @ApiProperty({ description: 'Legacy account ID field' })
  accountId: string;

  @ApiProperty({ description: 'Account name/display name' })
  accountName: string;

  @ApiProperty({ description: 'Account type', required: false })
  accountType?: string;

  @ApiProperty({ description: 'Platform-specific account ID' })
  platformAccountId: string;

  @ApiProperty({ description: 'Username on the platform' })
  username: string;

  @ApiProperty({ description: 'OAuth scopes', type: [String] })
  scopes: string[];

  @ApiProperty({ description: 'Profile picture URL', required: false })
  profilePictureUrl?: string;

  @ApiProperty({ description: 'Whether account is active' })
  isActive: boolean;
  @ApiProperty({ description: 'Token expiration date', required: false })
  expiresAt?: Date | null;
  @ApiProperty({ description: 'Whether the token is expired', required: false })
  isExpired?: boolean;

  @ApiProperty({ description: 'Days until token expiry', required: false })
  daysUntilExpiry?: number | null;

  @ApiProperty({ description: 'Additional metadata', required: false })
  metadata?: any;
}

export class SocialAccountsResponseDto extends PaginatedResponseDto<SocialAccountResponseDto> {
  @ApiProperty({ type: [SocialAccountResponseDto], description: 'Array of social accounts' })
  data: SocialAccountResponseDto[];
}
