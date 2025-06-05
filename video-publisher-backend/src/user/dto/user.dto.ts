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
