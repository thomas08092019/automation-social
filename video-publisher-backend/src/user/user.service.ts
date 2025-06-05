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
    // Note: Password reset functionality requires additional schema fields
    // Add resetToken and resetTokenExpiry fields to User model when implementing
    throw new Error('Password reset functionality not implemented - requires schema update');
  }

  async findByPasswordResetToken(token: string): Promise<User | null> {
    // Note: Password reset functionality requires additional schema fields
    // Add resetToken and resetTokenExpiry fields to User model when implementing
    throw new Error('Password reset functionality not implemented - requires schema update');
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }

  async clearPasswordResetToken(userId: string): Promise<void> {
    // Note: Password reset functionality requires additional schema fields
    // Add resetToken and resetTokenExpiry fields to User model when implementing
    throw new Error('Password reset functionality not implemented - requires schema update');
  }
}
