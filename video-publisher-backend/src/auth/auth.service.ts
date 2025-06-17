import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import {
  LoginDto,
  CreateUserDto,
  UserResponseDto,
  SocialLoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from '../user/dto/user.dto';
import * as crypto from 'crypto';
import { PrismaService } from '../common/prisma.service';
import { EmailService } from 'src/common/services/email.service';
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
  }  async socialLogin(socialLoginDto: any): Promise<AuthResponse> {
    const {
      email,
      name,
      providerId,
      profilePicture,
      platform,
      youtubeChannels,
      youtubeAccessToken,
      youtubeRefreshToken,
      facebookPages,
      facebookAccessToken,
      metadata,
    } = socialLoginDto;

    try {
      // Use the data already provided from OAuth callback instead of verifying token again
      const userData = {
        email,
        name,
        providerId,
      };

      if (!userData.email) {
        throw new UnauthorizedException('Email is required for social login');
      }
      
      // Check if user already exists
      let user: UserResponseDto = await this.userService.findByEmail(
        userData.email,
      );

      if (!user) {
        // Create new user for social login
        const createUserDto: CreateUserDto = {
          email: userData.email,
          username: userData.name || userData.email.split('@')[0],
          password: crypto.randomBytes(32).toString('hex'),
        };
        user = await this.userService.create(createUserDto);
      }
      
      // Only update user profile picture if user doesn't have one already
      if (profilePicture && !user.profilePicture) {
        user = await this.userService.updateProfile(user.id, {
          profilePicture,
        });
      }

      // If user has YouTube channels, automatically create social accounts for each channel
      if (youtubeChannels && youtubeChannels.length > 0 && youtubeAccessToken) {
        const oauthConfig = this.socialConnectService.getOAuthConfig(SocialPlatform.YOUTUBE);
        await this.socialConnectService.processMultipleAccounts(
          user.id,
          SocialPlatform.YOUTUBE,
          youtubeChannels,
          youtubeAccessToken,
          youtubeRefreshToken,
          oauthConfig,
        );
      }

      // If user has Facebook pages, automatically create social accounts for each page
      if (facebookPages && facebookPages.length > 0 && facebookAccessToken) {
        const oauthConfig = this.socialConnectService.getOAuthConfig(SocialPlatform.FACEBOOK);
        await this.socialConnectService.processMultipleAccounts(
          user.id,
          SocialPlatform.FACEBOOK,
          facebookPages,
          facebookAccessToken,
          undefined,
          oauthConfig,
        );
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
      throw new UnauthorizedException('Social login failed');
    }
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;

    // Check if user exists
    const user = await this.userService.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists or not for security
      return {
        message:
          'If an account with that email exists, a password reset link has been sent.',
      };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Save reset token to user
    await this.userService.savePasswordResetToken(
      user.id,
      resetToken,
      resetTokenExpiry,
    );

    // Send reset email
    await this.emailService.sendPasswordResetEmail(email, resetToken);

    return {
      message:
        'If an account with that email exists, a password reset link has been sent.',
    };
  }
  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<AuthResponse> {
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

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const { currentPassword, newPassword } = changePasswordDto;

    // Find user and verify current password
    const user = await this.userService.findByEmail(
      await this.getUserEmail(userId),
    );
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
  }  async validateUser(payload: JwtPayload): Promise<UserResponseDto> {
    try {
      const user = await this.userService.findById(payload.userId);
      return user;
    } catch (error) {
      throw error;
    }
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
  async connectSocialAccount(
    userId: string, 
    platform: string, 
    accountData: SocialAccountData
  ) {
    try {
      const platformEnum = platform.toUpperCase() as SocialPlatform;
      
      // Validate platform
      if (!Object.values(SocialPlatform).includes(platformEnum)) {
        throw new BadRequestException(`Unsupported platform: ${platform}`);
      }

      // Create or update social account using shared service
      const result = await this.socialConnectService.createOrUpdateSocialAccount(
        userId,
        { ...accountData, platform: platformEnum }
      );

      return {
        message: 'Social account connected successfully',
        account: result,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to connect social account: ${error.message}`);
    }
  }

  async disconnectSocialAccount(userId: string, accountId: string) {
    try {
      await this.socialConnectService.deleteSocialAccount(userId, accountId);
      return { message: 'Social account disconnected successfully' };
    } catch (error) {
      throw new BadRequestException(`Failed to disconnect social account: ${error.message}`);
    }
  }

  async getConnectedAccounts(userId: string) {
    return this.socialConnectService.getUserSocialAccounts(userId);
  }
}
