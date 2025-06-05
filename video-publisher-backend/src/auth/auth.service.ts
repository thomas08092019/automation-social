import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { LoginDto, CreateUserDto, UserResponseDto, SocialLoginDto, ForgotPasswordDto, ResetPasswordDto } from '../user/dto/user.dto';
import * as crypto from 'crypto';

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
      // Verify the social token with the provider (simplified for now)
      const isValidToken = await this.verifySocialToken(provider, accessToken);
      if (!isValidToken) {
        throw new UnauthorizedException('Invalid social token');
      }

      // Check if user already exists
      let user = await this.userService.findByEmail(email);
      
      if (!user) {
        // Create new user for social login
        const createUserDto: CreateUserDto = {
          email,
          username: name || email.split('@')[0],
          password: crypto.randomBytes(32).toString('hex'), // Random password for social users
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

    // Save reset token to user (you'll need to add these fields to user model)
    await this.userService.savePasswordResetToken(user.id, resetToken, resetTokenExpiry);

    // In a real application, you would send an email here
    // For now, we'll just log it (in production, use a proper email service)
    console.log(`Password reset token for ${email}: ${resetToken}`);
    console.log(`Reset URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`);

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

  private async verifySocialToken(provider: string, accessToken: string): Promise<boolean> {
    // In a real application, you would verify the token with the social provider's API
    // For Google: verify with Google's tokeninfo endpoint
    // For Facebook: verify with Facebook's debug_token endpoint
    // For this demo, we'll just return true
    
    try {
      if (provider === 'google') {
        // Example: const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`);
        // Verify the response contains valid user data
        return true; // Simplified for demo
      } else if (provider === 'facebook') {
        // Example: const response = await fetch(`https://graph.facebook.com/me?access_token=${accessToken}`);
        // Verify the response contains valid user data
        return true; // Simplified for demo
      }
      return false;
    } catch (error) {
      return false;
    }
  }
}
