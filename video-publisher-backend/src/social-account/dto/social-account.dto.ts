import {
  IsEnum,
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { SocialPlatform } from '@prisma/client';

export class CreateSocialAccountDto {
  @IsEnum(SocialPlatform)
  platform: SocialPlatform;

  @IsString()
  platformAccountId: string;

  @IsString()
  username: string;

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
  profilePictureUrl?: string;
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

export class SocialAccountResponseDto {
  id: string;
  platform: SocialPlatform;
  platformAccountId: string;
  username: string;
  scopes: string[];
  profilePictureUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
