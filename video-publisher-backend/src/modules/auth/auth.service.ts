import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from '../users/user.service';
import {
  LoginDto,
  CreateUserDto,
  UserResponseDto,
  SocialLoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from '../users/dto/user.dto';
import { SocialAccountData } from './social-connect.service';
import { TokenService, AuthResponse, JwtPayload } from './token.service';
import { PasswordService } from './password.service';
import { SocialAuthService } from './social-auth.service';

// Re-export types for backward compatibility
export { JwtPayload, AuthResponse } from './token.service';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private tokenService: TokenService,
    private passwordService: PasswordService,
    private socialAuthService: SocialAuthService,
  ) {}
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
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.tokenService.createAuthResponse(user);
  }  async socialLogin(socialLoginDto: SocialLoginDto): Promise<AuthResponse> {
    return this.socialAuthService.socialLogin(socialLoginDto);
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    return this.passwordService.forgotPassword(forgotPasswordDto);
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<AuthResponse> {
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

  async connectSocialAccount(
    userId: string,
    provider: string,
    accountData: SocialAccountData,
  ) {
    return this.socialAuthService.connectSocialAccount(userId, provider, accountData);
  }

  async getConnectedAccounts(userId: string) {
    return this.socialAuthService.getConnectedAccounts(userId);
  }

  async validateUser(payload: JwtPayload): Promise<UserResponseDto> {
    return this.tokenService.validateUser(payload);
  }
}
