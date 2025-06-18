import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../users/user.service';
import {
  CreateUserDto,
  UserResponseDto,
  SocialLoginDto,
} from '../users/dto/user.dto';
import { PrismaService } from '../../shared/database/prisma.service';
import {
  SocialConnectService,
  SocialAccountData,
} from './social-connect.service';
import { AccountType } from '@prisma/client';
import { JwtPayload, AuthResponse } from './token.service';

@Injectable()
export class SocialAuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private socialConnectService: SocialConnectService,
  ) {}

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
      await this.prisma.socialAccount.create({
        data: {
          userId: user.id,
          platform: socialLoginDto.platform as any,
          accountType: AccountType.PROFILE,
          accountId: socialLoginDto.platformUserId,
          accountName: socialLoginDto.name || user.username,
          accessToken: socialLoginDto.accessToken,
          refreshToken: socialLoginDto.refreshToken,
          expiresAt: socialLoginDto.expiresAt,
          profilePicture: socialLoginDto.profilePicture,
          metadata: socialLoginDto.metadata,
          isActive: true,
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
}
