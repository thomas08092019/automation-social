import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { LoginDto, CreateUserDto, UserResponseDto, SocialLoginDto, ForgotPasswordDto, ResetPasswordDto, ChangePasswordDto } from '../user/dto/user.dto';
import { OAuthService } from '../services/oauth.service';
import { EmailService } from '../services/email.service';
import * as crypto from 'crypto';
import { PrismaService } from '../common/prisma.service';

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
    private oauthService: OAuthService,
    private emailService: EmailService,
    private prisma: PrismaService,
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
    const { email, password } = loginDto;

    // Find user by email
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Validate password
    const isPasswordValid = await this.userService.validatePassword(
      password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate access token
    const accessToken = this.generateAccessToken({
      userId: user.id,
      email: user.email,
    });

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken,
    };
  }  async socialLogin(socialLoginDto: SocialLoginDto): Promise<AuthResponse> {
    const { provider, accessToken, email, name, providerId, profilePicture, youtubeChannels, youtubeAccessToken, youtubeRefreshToken, facebookPages, facebookAccessToken } = socialLoginDto;

    try {
      // Use the data already provided from OAuth callback instead of verifying token again
      const userData = {
        email,
        name,
        providerId,
      };

      if (!userData.email) {
        throw new UnauthorizedException('Email is required for social login');
      }      // Check if user already exists
      let user: UserResponseDto = await this.userService.findByEmail(userData.email);
      
      if (!user) {
        // Create new user for social login
        const createUserDto: CreateUserDto = {
          email: userData.email,
          username: userData.name || userData.email.split('@')[0],
          password: crypto.randomBytes(32).toString('hex'),
        };
        user = await this.userService.create(createUserDto);
      }

      // Update user profile picture if available from OAuth provider
      if (profilePicture && (!user.profilePicture || user.profilePicture !== profilePicture)) {
        user = await this.userService.updateProfile(user.id, { profilePicture });
      }// If user has YouTube channels, automatically create social accounts for each channel
      if (youtubeChannels && youtubeChannels.length > 0 && youtubeAccessToken) {
        for (let i = 0; i < youtubeChannels.length; i++) {
          const channel = youtubeChannels[i];
          try {
            await this.createYoutubeSocialAccount(user.id, channel, youtubeAccessToken, youtubeRefreshToken);
          } catch (youtubeError) {
            console.error(`Failed to create social account for YouTube channel: ${channel.snippet.title}`, youtubeError);
            // Continue with other channels even if one fails
          }
        }
      }      // If user has Facebook pages, automatically create social accounts for each page
      if (facebookPages && facebookPages.length > 0 && facebookAccessToken) {
        for (let i = 0; i < facebookPages.length; i++) {
          const page = facebookPages[i];
          try {
            await this.createFacebookSocialAccount(user.id, page, page.access_token || facebookAccessToken);
          } catch (facebookError) {
            console.error(`Failed to create social account for Facebook page: ${page.name}`, facebookError);
            // Continue with other pages even if one fails
          }
        }
      }

      // Generate access token
      const accessTokenJwt = this.generateAccessToken({
        userId: user.id,
        email: user.email,
      });

      return {
        user,
        accessToken: accessTokenJwt,
      };
    } catch (error) {
      console.error('Social login error:', error);
      throw new UnauthorizedException('Social login failed');
    }
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;

    // Check if user exists
    const user = await this.userService.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists or not for security
      return { message: 'If an account with that email exists, a password reset link has been sent.' };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Save reset token to user
    await this.userService.savePasswordResetToken(user.id, resetToken, resetTokenExpiry);

    // Send reset email
    await this.emailService.sendPasswordResetEmail(email, resetToken);

    return { message: 'If an account with that email exists, a password reset link has been sent.' };
  }
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<AuthResponse> {
    const { token, newPassword } = resetPasswordDto;

    // Find user by reset token and check if it's still valid
    const user = await this.userService.findByPasswordResetToken(token);
    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Reset the password
    await this.userService.updatePassword(user.id, newPassword);

    // Clear the reset token
    await this.userService.clearPasswordResetToken(user.id);

    // Generate access token for auto-login
    const accessToken = this.generateAccessToken({
      userId: user.id,
      email: user.email,
    });

    // Get updated user data without password
    const updatedUser = await this.userService.findById(user.id);

    return {
      user: updatedUser,
      accessToken,
    };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<{ message: string }> {
    const { currentPassword, newPassword } = changePasswordDto;

    // Find user and verify current password
    const user = await this.userService.findByEmail(await this.getUserEmail(userId));
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate current password
    const isPasswordValid = await this.userService.validatePassword(
      currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Update password
    await this.userService.updatePassword(userId, newPassword);

    return { message: 'Password changed successfully' };
  }

  private async getUserEmail(userId: string): Promise<string> {
    const user = await this.userService.findById(userId);
    return user.email;
  }

  async validateUser(payload: JwtPayload): Promise<UserResponseDto> {
    return this.userService.findById(payload.userId);
  }

  async getMe(userId: string): Promise<UserResponseDto> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  private generateAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload);
  }

  async connectSocialAccount(userId: string, provider: string, token: string) {
    try {
      // For now, return a simple response since OAuth service needs to be properly configured
      return {
        message: 'Social account connection feature needs OAuth configuration',
        provider,
        userId
      };
    } catch (error) {
      throw new BadRequestException('Failed to connect social account');
    }
  }

  async disconnectSocialAccount(userId: string, accountId: string) {
    const account = await this.prisma.socialAccount.findFirst({
      where: {
        id: accountId,
        userId,
      },
    });

    if (!account) {
      throw new BadRequestException('Social account not found');
    }

    await this.prisma.socialAccount.delete({
      where: { id: accountId },
    });

    return { message: 'Social account disconnected successfully' };
  }

  async getConnectedAccounts(userId: string) {
    return this.prisma.socialAccount.findMany({
      where: { userId },
    });
  }

  private async createYoutubeSocialAccount(userId: string, youtubeChannel: any, accessToken: string, refreshToken?: string) {
    try {
      // Check if YouTube account already exists for this user
      const existingAccount = await this.prisma.socialAccount.findFirst({
        where: {
          userId,
          platform: 'YOUTUBE',
          accountId: youtubeChannel.id,
        },
      });      if (existingAccount) {
        // Update existing account with new tokens
        return await this.prisma.socialAccount.update({
          where: { id: existingAccount.id },
          data: {
            accessToken,
            refreshToken,
          },
        });
      }      // Find or create a system default YouTube social app
      let youtubeApp = await this.prisma.socialApp.findFirst({
        where: {
          platform: 'YOUTUBE',
          userId,
          isDefault: true,
        },
      });

      if (!youtubeApp) {
        youtubeApp = await this.prisma.socialApp.create({
          data: {
            platform: 'YOUTUBE',
            name: 'System Default YouTube App',
            appId: process.env.GOOGLE_CLIENT_ID || '',
            appSecret: process.env.GOOGLE_CLIENT_SECRET || '',
            userId,
            isDefault: true,
            redirectUri: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback`,
          },
        });
      }

      // Create new YouTube social account
      const socialAccount = await this.prisma.socialAccount.create({
        data: {
          userId,
          platform: 'YOUTUBE',
          accountType: 'CREATOR',
          accountId: youtubeChannel.id,
          accountName: youtubeChannel.snippet.title,
          accessToken,
          refreshToken,
          socialAppId: youtubeApp.id,
          metadata: {
            channelId: youtubeChannel.id,
            channelTitle: youtubeChannel.snippet.title,
            channelDescription: youtubeChannel.snippet.description,
            subscriberCount: youtubeChannel.statistics?.subscriberCount,
            videoCount: youtubeChannel.statistics?.videoCount,
            viewCount: youtubeChannel.statistics?.viewCount,
            thumbnails: youtubeChannel.snippet.thumbnails,
          },        },
      });

      return socialAccount;
    } catch (error) {
      console.error('Error creating YouTube social account:', error);
      throw error;
    }
  }

  private async createFacebookSocialAccount(userId: string, facebookPage: any, accessToken: string) {
    try {
      // Check if Facebook page account already exists for this user
      const existingAccount = await this.prisma.socialAccount.findFirst({
        where: {
          userId,
          platform: 'FACEBOOK',
          accountId: facebookPage.id,
        },
      });      if (existingAccount) {
        // Update existing account with new tokens
        return await this.prisma.socialAccount.update({
          where: { id: existingAccount.id },
          data: {
            accessToken,
          },
        });
      }      // Find or create a system default Facebook social app
      let facebookApp = await this.prisma.socialApp.findFirst({
        where: {
          platform: 'FACEBOOK',
          userId,
          isDefault: true,
        },
      });

      if (!facebookApp) {
        facebookApp = await this.prisma.socialApp.create({
          data: {
            platform: 'FACEBOOK',
            name: 'System Default Facebook App',
            appId: process.env.FACEBOOK_APP_ID || '',
            appSecret: process.env.FACEBOOK_APP_SECRET || '',
            userId,
            isDefault: true,
            redirectUri: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback`,
          },
        });
      }

      // Create new Facebook page social account
      const socialAccount = await this.prisma.socialAccount.create({
        data: {
          userId,
          platform: 'FACEBOOK',
          accountType: 'PAGE',
          accountId: facebookPage.id,
          accountName: facebookPage.name,
          accessToken,
          socialAppId: facebookApp.id,
          metadata: {
            pageId: facebookPage.id,
            pageName: facebookPage.name,
            pageCategory: facebookPage.category,
            fanCount: facebookPage.fan_count || 0,
            about: facebookPage.about,
            description: facebookPage.description,
            picture: facebookPage.picture?.data?.url,
          },        },
      });

      return socialAccount;
    } catch (error) {
      console.error('Error creating Facebook social account:', error);
      throw error;
    }
  }
}
