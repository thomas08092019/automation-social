import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  username: string;

  @IsString()
  @MinLength(6)
  password: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class UserResponseDto {
  id: string;
  email: string;
  username?: string;
  profilePicture?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class SocialLoginDto {
  @IsString()
  provider: string; // 'google' | 'facebook'

  @IsString()
  accessToken: string;

  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsString()
  providerId: string;

  // Profile picture from OAuth provider
  profilePicture?: string;

  // Optional YouTube data - now supports multiple channels
  youtubeChannels?: any[];
  youtubeAccessToken?: string;
  youtubeRefreshToken?: string;

  // Optional Facebook data - now supports multiple pages
  facebookPages?: any[];
  facebookAccessToken?: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}
