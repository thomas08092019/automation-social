import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  UserResponseDto,
} from '../users/dto/user.dto';
import * as crypto from 'crypto';
import { PrismaService } from '../../shared/database/prisma.service';
import { EmailService } from '../../shared/services/email.service';
import { UserService } from '../users/user.service';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload, AuthResponse } from './token.service';

@Injectable()
export class PasswordService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private prisma: PrismaService,
  ) {}

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
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

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<AuthResponse> {
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

    const hashedPassword = await this.userService.hashPassword(
      resetPasswordDto.newPassword,
    );

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

  private generateAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload);
  }
}
