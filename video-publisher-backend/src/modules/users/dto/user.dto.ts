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
