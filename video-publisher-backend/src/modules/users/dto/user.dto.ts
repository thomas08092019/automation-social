import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BaseDto } from '../../../shared/dto';

export class CreateUserDto {
  @ApiProperty({ description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Username' })
  @IsString()
  username: string;

  @ApiProperty({
    description: 'Password (minimum 6 characters)',
    required: false,
  })
  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @ApiProperty({ description: 'Profile picture URL', required: false })
  @IsString()
  @IsOptional()
  profilePicture?: string;
}

export class LoginDto {
  @ApiProperty({ description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'User password' })
  @IsString()
  password: string;
}

export class UserResponseDto extends BaseDto {
  @ApiProperty({ description: 'User email address' })
  email: string;

  @ApiProperty({ description: 'Username', required: false })
  username?: string;

  @ApiProperty({ description: 'Profile picture URL', required: false })
  profilePicture?: string;

  @ApiProperty({ description: 'Password reset token', required: false })
  resetToken?: string;

  @ApiProperty({ description: 'Password reset token expiry', required: false })
  resetTokenExpiry?: Date;
}

export class SocialLoginDto {
  @ApiProperty({
    description: 'Social platform',
    enum: ['GOOGLE', 'FACEBOOK', 'YOUTUBE'],
  })
  @IsString()
  platform: string;

  @ApiProperty({ description: 'Platform-specific user ID' })
  @IsString()
  platformUserId: string;

  @ApiProperty({ description: 'OAuth access token' })
  @IsString()
  accessToken: string;

  @ApiProperty({ description: 'OAuth refresh token', required: false })
  @IsOptional()
  @IsString()
  refreshToken?: string;

  @ApiProperty({ description: 'Token expiration date', required: false })
  @IsOptional()
  expiresAt?: Date;

  @ApiProperty({ description: 'User email from OAuth provider' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'User name from OAuth provider' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Profile picture URL from OAuth provider',
    required: false,
  })
  @IsOptional()
  @IsString()
  profilePicture?: string;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsOptional()
  metadata?: any;
}

export class ForgotPasswordDto {
  @ApiProperty({ description: 'User email address' })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Password reset token' })
  @IsString()
  token: string;

  @ApiProperty({ description: 'New password (minimum 6 characters)' })
  @IsString()
  @MinLength(6)
  newPassword: string;
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ description: 'New password (minimum 6 characters)' })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
