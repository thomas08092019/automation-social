import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Param,
  Res,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsString, IsNotEmpty } from 'class-validator';
import { AuthService, AuthResponse } from './auth.service';
import { OAuthService } from './oauth.service';
import { UserInfoService } from './user-info.service';
import { FirebaseAuthService } from './firebase-auth.service';
import { SocialPlatform } from '@prisma/client';
import {
  CreateUserDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from '../users/dto/user.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { 
  ValidationException,
  OAuthException
} from '../../shared/exceptions/custom.exceptions';

// Firebase Login DTO
export class FirebaseLoginDto {
  @IsString()
  @IsNotEmpty()
  idToken: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
    private oauthService: OAuthService,
    private userInfoService: UserInfoService,
    private firebaseAuthService: FirebaseAuthService,
  ) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto): Promise<AuthResponse> {
    return this.authService.register(createUserDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(loginDto);
  }

  @Post('firebase-login')
  @HttpCode(HttpStatus.OK)
  async firebaseLogin(@Body() firebaseLoginDto: FirebaseLoginDto): Promise<AuthResponse> {
    try {
      // Validate request body
      if (!firebaseLoginDto || !firebaseLoginDto.idToken) {
        throw new ValidationException('ID token is required');
      }

      if (typeof firebaseLoginDto.idToken !== 'string' || firebaseLoginDto.idToken.trim() === '') {
        throw new ValidationException('ID token must be a non-empty string');
      }

      // Verify Firebase token and get user data
      const userData = await this.firebaseAuthService.verifyAndGetUserData(firebaseLoginDto.idToken);
      
      // Use Firebase authentication directly
      const authResponse = await this.authService.firebaseAuth({
        email: userData.email,
        name: userData.name || 'Firebase User',
        profilePicture: userData.picture,
        provider: userData.provider,
        providerId: userData.providerId,
      });

      return authResponse;
    } catch (error) {
      throw new ValidationException(`Firebase authentication failed: ${error.message}`);
    }
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<AuthResponse> {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req) {
    return this.authService.getMe(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Request() req,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.changePassword(req.user.id, changePasswordDto);
  }  @Get('oauth/:provider')
  async initiateOAuth(@Param('provider') provider: string, @Res() res: any) {
    const platform = this.validatePlatform(provider);
      // Check if OAuth credentials are configured for this platform
    if (!this.oauthService.hasCredentials(platform)) {
      const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
      const errorMessage = `OAuth not configured for ${platform}. Please contact administrator.`;
      const redirectUrl = `${frontendUrl}/auth/callback?error=${encodeURIComponent(errorMessage)}&platform=${platform}`;
      return res.redirect(redirectUrl);
    }

    const state = this.generateOAuthState(provider);

    try {
      const result = await this.oauthService.generateAuthorizationUrl({
        userId: 'anonymous',
        platform,
        state,
      });

      res.redirect(result.authorizationUrl);
    } catch (error) {
      const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
      const errorMessage = error.message || `Failed to initialize OAuth for ${platform}`;
      const redirectUrl = `${frontendUrl}/auth/callback?error=${encodeURIComponent(errorMessage)}&platform=${platform}`;
      return res.redirect(redirectUrl);
    }
  }

  @Get('oauth/callback')
  async handleOAuthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: any,
  ) {
    if (error) {
      throw new OAuthException('unknown', `OAuth error: ${error}`);
    }

    if (!code || !state) {
      throw new ValidationException('Missing authorization code or state parameter');
    }

    const { provider } = this.parseOAuthState(state);
    const platform = this.validatePlatform(provider);

    const tokenResult = await this.oauthService.exchangeCodeForToken(platform, code, state);
    const userInfoResult = await this.userInfoService.fetchUserInfo(platform, tokenResult.accessToken);

    // All OAuth flows are now for social account connection
    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
    const redirectUrl = `${frontendUrl}/auth/callback?social_connection=success&platform=${platform}&account_name=${encodeURIComponent(userInfoResult.userInfo.name || 'Connected Account')}`;
    return res.redirect(redirectUrl);
  }

  private validatePlatform(provider: string): SocialPlatform {
    const platformMap: Record<string, SocialPlatform> = {
      'facebook': SocialPlatform.FACEBOOK,
      'instagram': SocialPlatform.INSTAGRAM,
      'youtube': SocialPlatform.YOUTUBE,
      'tiktok': SocialPlatform.TIKTOK,
      'x': SocialPlatform.X,
      'twitter': SocialPlatform.X,
      'zalo': SocialPlatform.ZALO,
      'telegram': SocialPlatform.TELEGRAM,
    };

    const platform = platformMap[provider.toLowerCase()];
    if (!platform) {
      throw new Error(`Unsupported OAuth provider: ${provider}`);
    }

    return platform;
  }

  private generateOAuthState(provider: string): string {
    // Generate state for social account connection only
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `connect-${provider}-${timestamp}-${random}`;
  }

  private parseOAuthState(state: string): { provider: string; isLoginFlow: boolean } {
    // All OAuth flows are now for social account connection
    const isLoginFlow = false;
    
    if (state.startsWith('connect-')) {
      const parts = state.split('-');
      return {
        provider: parts[1] || 'unknown',
        isLoginFlow: false,
      };
    }

    // Legacy state format support
    const parts = state.split(':');
    return {
      provider: parts[1] || 'unknown',
      isLoginFlow: false,
    };
  }
}