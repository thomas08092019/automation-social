import {
  IsEnum,
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { SocialPlatform } from '@prisma/client';

export class CreateSocialAccountDto {
  @IsEnum(SocialPlatform)
  platform: SocialPlatform;

  @IsString()
  platformAccountId: string;

  @IsString()
  username: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  accountType?: string;

  @IsString()
  accessToken: string;

  @IsOptional()
  @IsString()
  refreshToken?: string;

  @IsOptional()
  expiresAt?: Date;

  @IsArray()
  @IsString({ each: true })
  scopes: string[];

  @IsOptional()
  @IsString()
  profilePicture?: string;

  @IsOptional()
  metadata?: any;
}

export class UpdateSocialAccountDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  accessToken?: string;

  @IsOptional()
  @IsString()
  refreshToken?: string;

  @IsOptional()
  expiresAt?: Date;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];

  @IsOptional()
  @IsString()
  profilePictureUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SocialAccountQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(SocialPlatform)
  platform?: SocialPlatform;

  @IsOptional()
  @IsString()
  accountType?: string;

  @IsOptional()
  @IsString()
  status?: 'active' | 'inactive' | 'expired';

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: string = 'accountName';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class SocialAccountsResponseDto {
  data: SocialAccountResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export class SocialAccountResponseDto {
  id: string;
  platform: SocialPlatform;
  accountType?: string;
  platformAccountId: string;
  username: string;
  scopes: string[];
  profilePictureUrl?: string;
  isActive: boolean;
  expiresAt?: Date | null;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}
