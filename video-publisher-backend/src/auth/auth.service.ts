import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { LoginDto, CreateUserDto, UserResponseDto, SocialLoginDto, ForgotPasswordDto, ResetPasswordDto } from '../user/dto/user.dto';
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
  }

  async socialLogin(socialLoginDto: SocialLoginDto): Promise<AuthResponse> {
    const { provider, accessToken, email, name, providerId } = socialLoginDto;

    try {
      let userData;
      if (provider === 'google') {
        userData = await this.oauthService.verifyGoogleToken(accessToken);
      } else if (provider === 'facebook') {
        userData = await this.oauthService.verifyFacebookToken(accessToken);
      } else {
        throw new UnauthorizedException('Unsupported social provider');
      }

      // Check if user already exists
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

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
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

    return { message: 'Password has been reset successfully' };
  }

  async validateUser(payload: JwtPayload): Promise<UserResponseDto> {
    return this.userService.findById(payload.userId);
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
}
