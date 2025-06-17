import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../users/user.service';
import {
  LoginDto,
  CreateUserDto,
  UserResponseDto,
  SocialLoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from '../users/dto/user.dto';
import * as crypto from 'crypto';
import { PrismaService } from '../../shared/database/prisma.service';
import { EmailService } from '../../shared/services/email.service';
import { SocialConnectService, SocialAccountData } from './social-connect.service';
import { SocialPlatform, AccountType } from '@prisma/client';

export interface JwtPayload {
  userId: string;
  email: string;
}

export interface AuthResponse {
  user: UserResponseDto;
  accessToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private prisma: PrismaService,
    private socialConnectService: SocialConnectService,
  ) {}

  async register(createUserDto: CreateUserDto): Promise<AuthResponse> {
    const user = await this.userService.create(createUserDto);
    const accessToken = this.generateAccessToken({
      userId: user.id,
      email: user.email,
    });

    return {
      user,
      accessToken,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.userService.validateUser(
      loginDto.email,
      loginDto.password,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.generateAccessToken({
      userId: user.id,
      email: user.email,
    });

    return {
      user,
      accessToken,
    };
  }
  async socialLogin(socialLoginDto: SocialLoginDto): Promise<AuthResponse> {
    let user = await this.userService.findByPlatformUserId(
      socialLoginDto.platform as any,
      socialLoginDto.platformUserId,
    );

    if (!user) {
      // Create new user from social login
      const createUserDto: CreateUserDto = {
        email: socialLoginDto.email,
        username: socialLoginDto.name || socialLoginDto.email.split('@')[0],
        profilePicture: socialLoginDto.profilePicture,
      };

      user = await this.userService.create(createUserDto);

      // Create social account record
      await this.prisma.socialAccount.create({        data: {
          userId: user.id,
          platform: socialLoginDto.platform as any,
          accountType: AccountType.PROFILE,
          accountId: socialLoginDto.platformUserId,
          accountName: socialLoginDto.name || user.username,
          accessToken: socialLoginDto.accessToken,
          refreshToken: socialLoginDto.refreshToken,
          expiresAt: socialLoginDto.expiresAt,
          profilePicture: socialLoginDto.profilePicture,
          metadata: socialLoginDto.metadata,          isActive: true,
        },
      });
    } else {
      // Update existing social account
      await this.prisma.socialAccount.updateMany({
        where: {
          userId: user.id,
          platform: socialLoginDto.platform as any,
          accountId: socialLoginDto.platformUserId,
        },
        data: {
          accessToken: socialLoginDto.accessToken,
          refreshToken: socialLoginDto.refreshToken,
          expiresAt: socialLoginDto.expiresAt,
          profilePicture: socialLoginDto.profilePicture,
          metadata: socialLoginDto.metadata,
          isActive: true,
        },
      });
    }

    const accessToken = this.generateAccessToken({
      userId: user.id,
      email: user.email,
    });

    return {
      user,
      accessToken,
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.userService.findByEmail(forgotPasswordDto.email);
    if (!user) {
      throw new NotFoundException('User with this email does not exist');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    await this.emailService.sendPasswordResetEmail(user.email, resetToken);

    return { message: 'Password reset email sent' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: resetPasswordDto.token,
        resetTokenExpiry: {
          gte: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await this.userService.hashPassword(resetPasswordDto.newPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    const userResponse = await this.userService.findById(user.id);
    const accessToken = this.generateAccessToken({
      userId: user.id,
      email: user.email,
    });

    return {
      user: userResponse,
      accessToken,
    };
  }
  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.userService.findByIdWithPassword(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValidPassword = await this.userService.validatePassword(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isValidPassword) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedNewPassword = await this.userService.hashPassword(
      changePasswordDto.newPassword,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    return { message: 'Password changed successfully' };
  }

  async getMe(userId: string): Promise<UserResponseDto> {
    return this.userService.findById(userId);
  }

  async connectSocialAccount(
    userId: string,
    provider: string,
    accountData: SocialAccountData,
  ) {
    return this.socialConnectService.connectAccount(userId, accountData);
  }

  async getConnectedAccounts(userId: string) {
    return this.prisma.socialAccount.findMany({
      where: { 
        userId,
        deletedAt: null,
      },
      select: {
        id: true,
        platform: true,
        accountType: true,
        accountName: true,
        profilePicture: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  private generateAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload);
  }

  async validateUser(payload: JwtPayload): Promise<UserResponseDto> {
    return this.userService.findById(payload.userId);
  }
}
