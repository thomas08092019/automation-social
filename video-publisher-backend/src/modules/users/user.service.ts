import { Injectable } from '@nestjs/common';
import {
  CreateUserDto,
  UserResponseDto,
  LoginDto,
} from './dto/user.dto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../shared/database/prisma.service';
import { UserMapper } from '../../shared/mappers/user.mapper';
import { SocialPlatform } from '@prisma/client';
// Phase 5: Custom exceptions
import { 
  UserNotFoundException, 
  UserAlreadyExistsException,
  InvalidCredentialsException 
} from '../../shared/exceptions/custom.exceptions';
import { AppLoggerService } from '../../shared/services/logger.service';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private userMapper: UserMapper,
    private logger: AppLoggerService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const hashedPassword = createUserDto.password 
      ? await this.hashPassword(createUserDto.password)
      : null;

    const user = await this.prisma.user.create({
      data: {
        ...createUserDto,        password: hashedPassword,
      },
    });

    return this.userMapper.mapToDto(user);
  }

  async findByEmail(email: string): Promise<UserResponseDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    return user ? this.userMapper.mapToDto(user) : null;
  }
  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });    if (!user) {
      this.logger.error('User not found by ID', {
        operation: 'findById',
        resource: 'user',
        metadata: { userId: id },
      });
      throw new UserNotFoundException(id, {
        operation: 'findById',
        resource: 'user',
        metadata: { userId: id },
      });
    }

    return this.userMapper.mapToDto(user);
  }
  // Internal method that includes password - for authentication purposes only
  async findByIdWithPassword(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      this.logger.error('User not found by ID (with password)', {
        operation: 'findByIdWithPassword',
        resource: 'user',
        metadata: { userId: id },
      });
      throw new UserNotFoundException(id, {
        operation: 'findByIdWithPassword',
        resource: 'user',
        metadata: { userId: id },
      });
    }

    return user;
  }

  async findByPlatformUserId(
    platform: SocialPlatform,
    platformUserId: string,
  ): Promise<UserResponseDto | null> {
    const socialAccount = await this.prisma.socialAccount.findFirst({
      where: {
        platform,
        accountId: platformUserId,
        deletedAt: null,
      },
      include: { user: true },
    });

    return socialAccount?.user ? this.userMapper.mapToDto(socialAccount.user) : null;
  }

  async validateUser(email: string, password: string): Promise<UserResponseDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      return null;
    }

    const isPasswordValid = await this.validatePassword(password, user.password);
    if (!isPasswordValid) {      return null;
    }

    return this.userMapper.mapToDto(user);
  }

  async updateProfile(
    userId: string,
    updates: Partial<{ username: string; profilePicture: string }>,
  ): Promise<UserResponseDto> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updates,    });

    return this.userMapper.mapToDto(user);
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);  }
}
