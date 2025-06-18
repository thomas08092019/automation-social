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
import { AuthService, AuthResponse } from './auth.service';
import { OAuthService } from './oauth.service';
import { UserInfoService } from './user-info.service';
import { SocialPlatform } from '@prisma/client';
import {
  CreateUserDto,
  LoginDto,
  SocialLoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from '../users/dto/user.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  ValidationException,
  OAuthException,
} from '../../shared/exceptions/custom.exceptions';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
    private oauthService: OAuthService,
    private userInfoService: UserInfoService,
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

  @Post('social-login')
  @HttpCode(HttpStatus.OK)
  async socialLogin(
    @Body() socialLoginDto: SocialLoginDto,
  ): Promise<AuthResponse> {
    return this.authService.socialLogin(socialLoginDto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<AuthResponse> {
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
  }
  @Get('oauth/:provider')
  async initiateOAuth(@Param('provider') provider: string, @Res() res: any) {
    const platform = this.validatePlatform(provider);
    // Check if OAuth credentials are configured for this platform
    if (!this.oauthService.hasCredentials(platform)) {
      const frontendUrl =
        this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
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
      const frontendUrl =
        this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
      const errorMessage =
        error.message || `Failed to initialize OAuth for ${platform}`;
      const redirectUrl = `${frontendUrl}/auth/callback?error=${encodeURIComponent(errorMessage)}&platform=${platform}`;
      return res.redirect(redirectUrl);
    }
  }

  @Get('oauth/callback') async handleOAuthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: any,
  ) {
    if (error) {
      throw new OAuthException('unknown', `OAuth error: ${error}`);
    }

    if (!code || !state) {
      throw new ValidationException(
        'Missing authorization code or state parameter',
      );
    }

    const { provider, isLoginFlow } = this.parseOAuthState(state);
    const platform = this.validatePlatform(provider);

    const tokenResult = await this.oauthService.exchangeCodeForToken(
      platform,
      code,
      state,
    );
    const userInfoResult = await this.userInfoService.fetchUserInfo(
      platform,
      tokenResult.accessToken,
    );

    if (isLoginFlow) {
      const authResult = await this.authService.socialLogin({
        platform,
        platformUserId: userInfoResult.userInfo.id,
        email: userInfoResult.userInfo.email,
        name: userInfoResult.userInfo.name,
        profilePicture: userInfoResult.userInfo.profilePicture,
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken,
        expiresAt: tokenResult.expiresIn
          ? new Date(Date.now() + tokenResult.expiresIn * 1000)
          : null,
        metadata: userInfoResult.userInfo.metadata,
      });

      const frontendUrl =
        this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/auth/callback?success=true&token=${authResult.accessToken}`;
      return res.redirect(redirectUrl);
    } else {
      // Handle social account connection
      const frontendUrl =
        this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/auth/callback?social_connection=success&platform=${platform}`;
      return res.redirect(redirectUrl);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('connect-social')
  async connectSocialAccount(
    @Request() req,
    @Body('provider') provider: string,
    @Body('accountData') accountData: any,
  ) {
    return this.authService.connectSocialAccount(
      req.user.id,
      provider,
      accountData,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('connected-accounts')
  async getConnectedAccounts(@Request() req) {
    return this.authService.getConnectedAccounts(req.user.id);
  }

  private validatePlatform(provider: string): SocialPlatform {
    const platformMap: Record<string, SocialPlatform> = {
      facebook: SocialPlatform.FACEBOOK,
      instagram: SocialPlatform.INSTAGRAM,
      youtube: SocialPlatform.YOUTUBE,
      tiktok: SocialPlatform.TIKTOK,
      x: SocialPlatform.X,
      twitter: SocialPlatform.X,
      zalo: SocialPlatform.ZALO,
      telegram: SocialPlatform.TELEGRAM,
    };

    const platform = platformMap[provider.toLowerCase()];
    if (!platform) {
      throw new Error(`Unsupported OAuth provider: ${provider}`);
    }

    return platform;
  }

  private generateOAuthState(provider: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `login-${provider}-${timestamp}-${random}`;
  }

  private parseOAuthState(state: string): {
    provider: string;
    isLoginFlow: boolean;
  } {
    const isLoginFlow = state.startsWith('login-');

    if (isLoginFlow) {
      const parts = state.split('-');
      return {
        provider: parts[1] || 'unknown',
        isLoginFlow: true,
      };
    }

    const parts = state.split(':');
    return {
      provider: parts[1] || 'unknown',
      isLoginFlow: false,
    };
  }

  // New endpoint to get OAuth URL as JSON (for frontend API calls)
  @Get('oauth/:provider/url')
  async getOAuthUrl(@Param('provider') provider: string) {
    const platform = this.validatePlatform(provider);

    // Check if OAuth credentials are configured for this platform
    if (!this.oauthService.hasCredentials(platform)) {
      return {
        success: false,
        error: `OAuth not configured for ${platform}. Please contact administrator.`,
        message: `OAuth credentials not found for ${platform}`,
      };
    }

    const state = this.generateOAuthState(provider);

    try {
      const result = await this.oauthService.generateAuthorizationUrl({
        userId: 'anonymous',
        platform,
        state,
      });

      return {
        success: true,
        authorizationUrl: result.authorizationUrl,
        platform: platform,
        message: `OAuth URL generated for ${platform}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || `Failed to generate OAuth URL for ${platform}`,
        message: `OAuth URL generation failed`,
      };
    }
  }
}
