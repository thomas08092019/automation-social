import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../common';
import { CreateUserDto, UserResponseDto } from './dto/user.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const { email, password, username } = createUserDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        username,
      },
      select: {
        id: true,
        email: true,
        username: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string): Promise<UserResponseDto> {
    if (!id) {
      throw new Error('No id provided to findById');
    }
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async validatePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async savePasswordResetToken(
    userId: string,
    resetToken: string,
    expiryDate: Date,
  ): Promise<void> {
    // For this demo, we'll store the reset token in the user record
    // In a production app, you might want a separate table for reset tokens
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        // Note: You'll need to add these fields to your Prisma schema
        // resetToken: resetToken,
        // resetTokenExpiry: expiryDate,
      },
    });

    // For now, we'll just log it since we haven't added the fields to the schema
    console.log(
      `Reset token saved for user ${userId}: ${resetToken} (expires: ${expiryDate})`,
    );
  }

  async findByPasswordResetToken(token: string): Promise<User | null> {
    // In production, you would query by resetToken and check expiry
    // For now, we'll return null as a placeholder
    console.log(`Looking for user with reset token: ${token}`);
    return null; // Placeholder - implement when schema is updated
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }

  async clearPasswordResetToken(userId: string): Promise<void> {
    // Clear the reset token fields
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        // Note: You'll need to add these fields to your Prisma schema
        // resetToken: null,
        // resetTokenExpiry: null,
      },
    });

    console.log(`Reset token cleared for user ${userId}`);
  }
}
