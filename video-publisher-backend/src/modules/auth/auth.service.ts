import { Injectable } from '@nestjs/common';
import { UserService } from '../users/user.service';
import {
  LoginDto,
  CreateUserDto,
  UserResponseDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from '../users/dto/user.dto';
import { TokenService, AuthResponse, JwtPayload } from './token.service';
import { PasswordService } from './password.service';
// Phase 5: Custom exceptions
import { InvalidCredentialsException } from '../../shared/exceptions/custom.exceptions';
import { AppLoggerService } from '../../shared/services/logger.service';

// Re-export types for backward compatibility
export { JwtPayload, AuthResponse } from './token.service';

// Firebase Auth DTO
interface FirebaseAuthDto {
  email: string;
  name: string;
  profilePicture?: string;
  provider: string;
  providerId: string;
}

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private tokenService: TokenService,
    private passwordService: PasswordService,
    private logger: AppLoggerService,
  ) {}

  async firebaseAuth(firebaseAuthDto: FirebaseAuthDto): Promise<AuthResponse> {
    // Find or create user based on email
    let user = await this.userService.findByEmail(firebaseAuthDto.email);

    if (!user) {
      // Create new user
      const createUserDto: CreateUserDto = {
        email: firebaseAuthDto.email,
        username: firebaseAuthDto.name || firebaseAuthDto.email.split('@')[0],
        password: null, // Firebase users don't have passwords
        profilePicture: firebaseAuthDto.profilePicture,
      };

      user = await this.userService.create(createUserDto);

      this.logger.logAuth('firebase-register', {
        userId: user.id,
        email: firebaseAuthDto.email,
        provider: firebaseAuthDto.provider,
        success: true,
        operation: 'firebase-register',
      });
    } else {
      // Update existing user's profile picture if provided
      if (
        firebaseAuthDto.profilePicture &&
        user.profilePicture !== firebaseAuthDto.profilePicture
      ) {
        await this.userService.updateProfile(user.id, {
          profilePicture: firebaseAuthDto.profilePicture,
        });
        user.profilePicture = firebaseAuthDto.profilePicture;
      }

      this.logger.logAuth('firebase-login', {
        userId: user.id,
        email: firebaseAuthDto.email,
        provider: firebaseAuthDto.provider,
        success: true,
        operation: 'firebase-login',
      });
    }

    return this.tokenService.createAuthResponse(user);
  }
  async register(createUserDto: CreateUserDto): Promise<AuthResponse> {
    const user = await this.userService.create(createUserDto);
    return this.tokenService.createAuthResponse(user);
  }
  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.userService.validateUser(
      loginDto.email,
      loginDto.password,
    );

    if (!user) {
      this.logger.logAuth('login', {
        email: loginDto.email,
        success: false,
        operation: 'login',
      });
      throw new InvalidCredentialsException({
        operation: 'login',
        resource: 'user',
        metadata: { email: loginDto.email },
      });
    }

    this.logger.logAuth('login', {
      userId: user.id,
      email: loginDto.email,
      success: true,
      operation: 'login',
    });

    return this.tokenService.createAuthResponse(user);
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    return this.passwordService.forgotPassword(forgotPasswordDto);
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<AuthResponse> {
    return this.passwordService.resetPassword(resetPasswordDto);
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return this.passwordService.changePassword(userId, changePasswordDto);
  }

  async getMe(userId: string): Promise<UserResponseDto> {
    return this.userService.findById(userId);
  }

  async validateUser(payload: JwtPayload): Promise<UserResponseDto> {
    return this.tokenService.validateUser(payload);
  }
}
