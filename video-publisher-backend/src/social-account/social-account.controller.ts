import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { SocialPlatform } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SocialAccountService } from './social-account.service';
import { OAuthAuthorizationService } from '../auth/oauth-authorization.service';
import { PlatformUserInfoService } from '../auth/platform-user-info.service';
import {
  CreateSocialAccountDto,
  UpdateSocialAccountDto,
  SocialAccountResponseDto,
  SocialAccountQueryDto,
  SocialAccountsResponseDto,
} from './dto/social-account.dto';

@Controller('social-accounts')
export class SocialAccountController {
  constructor(
    private socialAccountService: SocialAccountService,
    private oauthAuthorizationService: OAuthAuthorizationService,
    private platformUserInfoService: PlatformUserInfoService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Request() req,
    @Body() createDto: CreateSocialAccountDto,
  ): Promise<SocialAccountResponseDto> {
    return this.socialAccountService.create(req.user.id, createDto);
  }
  @Post('connect/:platform')
  @UseGuards(JwtAuthGuard)
  async connectSocialAccount(
    @Request() req,
    @Param('platform') platform: string,
    @Query('appId') appId?: string,
  ) {
    // Map frontend platform names to backend enum values
    const platformMapping: Record<string, SocialPlatform> = {
      youtube: SocialPlatform.YOUTUBE,
      facebook: SocialPlatform.FACEBOOK,
      instagram: SocialPlatform.INSTAGRAM,
      tiktok: SocialPlatform.TIKTOK,
    };

    const lowerPlatform = platform.toLowerCase();
    const socialPlatform = platformMapping[lowerPlatform];

    if (!socialPlatform) {
      const validPlatforms = Object.keys(platformMapping);
      throw new BadRequestException(
        `Invalid platform: ${platform}. Valid platforms: ${validPlatforms.join(', ')}`,
      );
    }

    try {
      const result =
        await this.oauthAuthorizationService.generateAuthorizationUrl({
          userId: req.user.id,
          platform: socialPlatform,
          preferredAppId: appId,
          state: `${req.user.id}:${socialPlatform}:${Date.now()}`, // Include timestamp for uniqueness
        });

      if (!result.success) {
        // Check if the error is related to missing OAuth credentials
        if (
          result.errorMessage?.includes('No app configuration available') ||
          result.errorMessage?.includes('placeholder values')
        ) {
          return {
            success: false,
            message: `OAuth credentials not configured for ${platform}. Please set up real ${platform} OAuth credentials in your environment configuration. See OAUTH_SETUP_GUIDE.md for instructions.`,
            error: 'OAUTH_CREDENTIALS_NOT_CONFIGURED',
          };
        }

        return {
          success: false,
          message:
            result.errorMessage || 'Failed to generate authorization URL',
        };
      }

      return {
        success: true,
        data: {
          authUrl: result.authorizationUrl,
          platform: socialPlatform,
        },
        message: 'Authorization URL generated successfully',
      };
    } catch (error) {
      // Check if the error is related to missing OAuth credentials
      if (
        error.message?.includes('No app configuration available') ||
        error.message?.includes('placeholder values')
      ) {
        return {
          success: false,
          message: `OAuth credentials not configured for ${platform}. Please set up real ${platform} OAuth credentials in your environment configuration. See OAUTH_SETUP_GUIDE.md for instructions.`,
          error: 'OAUTH_CREDENTIALS_NOT_CONFIGURED',
        };
      }

      return {
        success: false,
        message: `Failed to connect ${platform}: ${error.message}`,
      };
    }
  }
  @Post('oauth/callback')
  async handleOAuthCallback(
    @Body()
    body: {
      code: string;
      state: string;
      platform: string;
      appId?: string;
    },
  ) {    // Start timer to track authorization code processing speed
    const startTime = Date.now();

    try {
      // Parse state to get user ID and platform
      const [userId, platform, timestamp] = body.state.split(':');

      if (!userId || !platform) {
        throw new BadRequestException('Invalid state parameter');
      }      // Check if authorization code is potentially expired based on timestamp
      const codeTimestamp = parseInt(timestamp);
      const codeAge = Date.now() - codeTimestamp;

      if (codeAge > 300000) {
        // 5 minutes - Log warning but continue processing
      }

      const socialPlatform = platform as SocialPlatform;

      // IMMEDIATE token exchange to prevent code expiration
      const tokenResult =
        await this.oauthAuthorizationService.exchangeCodeForToken(
          socialPlatform,
          body.code,
          userId,
          body.appId,
          body.state, // Pass the state for PKCE verification
        );

      const tokenExchangeTime = Date.now() - startTime;

      if (!tokenResult.success) {
        return {
          success: false,
          message:
            tokenResult.errorMessage || 'Failed to exchange authorization code',
          timing: {
            tokenExchangeTime,
            codeAge,
          },        };
      } 

      // Validate access token immediately
      if (!tokenResult.accessToken) {
        throw new BadRequestException(
          `Access token is missing from OAuth response. Platform: ${socialPlatform}, Error: ${tokenResult.errorMessage || 'Unknown error'}`,
        );
      }      // Additional validation for TikTok
      if (
        socialPlatform === SocialPlatform.TIKTOK &&
        !tokenResult.accessToken.trim()
      ) {
        throw new BadRequestException(
          'TikTok access token is empty or invalid',
        );      }

      // Fetch platform-specific user information with timeout
      let userInfo;
      const userInfoStartTime = Date.now();

      try {
        // Use Promise.race to timeout user info fetching if it takes too long
        const userInfoPromise = this.platformUserInfoService.fetchUserInfo(
          socialPlatform,
          tokenResult.accessToken,
        );

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('User info fetch timeout')), 15000); // 15 second timeout
        });

        userInfo = await Promise.race([userInfoPromise, timeoutPromise]);

        const userInfoTime = Date.now() - userInfoStartTime;
      } catch (error) {
        const userInfoTime = Date.now() - userInfoStartTime;

        // Don't create account if we can't fetch user info - return error instead
        return {
          success: false,
          message: `Failed to connect ${socialPlatform} account: ${error.message}`,
          error: 'USER_INFO_FETCH_FAILED',
          timing: {
            totalTime: Date.now() - startTime,
            tokenExchangeTime: Date.now() - startTime,
            userInfoTime,
            failedAt: 'user_info_fetch',
          },
        };
      } // Create social account with the obtained tokens and user info
      const socialAccountData: CreateSocialAccountDto = {
        platform: socialPlatform,
        platformAccountId: userInfo.platformAccountId,
        username: userInfo.username,
        displayName: userInfo.displayName,
        accountType: userInfo.accountType,
        accessToken: tokenResult.accessToken, // Remove the ! assertion
        refreshToken: tokenResult.refreshToken,
        expiresAt: tokenResult.expiresIn
          ? new Date(Date.now() + tokenResult.expiresIn * 1000)
          : undefined,
        scopes: tokenResult.scope ? tokenResult.scope.split(' ') : [],
        profilePicture: userInfo.profilePictureUrl,        metadata: userInfo.metadata || {},
      };      const socialAccount = await this.socialAccountService.create(
        userId,
        socialAccountData,
      );

      const totalTime = Date.now() - startTime;

      return {
        success: true,
        data: socialAccount,
        message: `${socialPlatform} account connected successfully`,
        timing: {
          totalTime,
          tokenExchangeTime,
          codeAge,
          userInfoTime: Date.now() - userInfoStartTime,
        },
      };
    } catch (error) {
      const totalTime = Date.now() - startTime;
      return {
        success: false,
        message: `OAuth callback failed: ${error.message}`,
        timing: {
          totalTime,
          failedAt: totalTime,
        },
      };
    }
  }
  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Request() req,
    @Query() query: SocialAccountQueryDto,
  ): Promise<SocialAccountsResponseDto> {
    const result = await this.socialAccountService.findAllByUserWithPagination(
      req.user.id,
      query,
    );

    return {
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage,
    };
  }
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(
    @Request() req,
    @Param('id') id: string,
  ): Promise<SocialAccountResponseDto> {
    return this.socialAccountService.findById(req.user.id, id);
  }
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateSocialAccountDto,
  ): Promise<SocialAccountResponseDto> {
    return this.socialAccountService.update(req.user.id, id, updateDto);
  }
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Request() req, @Param('id') id: string): Promise<void> {
    return this.socialAccountService.delete(req.user.id, id);
  }  @Delete('bulk/delete')
  @UseGuards(JwtAuthGuard)
  async removeBulk(
    @Request() req,
    @Body() body: { accountIds: string[] },
  ): Promise<{ success: boolean; deletedCount: number; errors?: any[] }> {
    return this.socialAccountService.deleteBulk(req.user.id, body.accountIds);
  }
  @Post('bulk/refresh')
  @UseGuards(JwtAuthGuard)
  async refreshTokensBulk(
    @Request() req,
    @Body() body: { accountIds: string[] },
  ) {
    try {
      const result = await this.socialAccountService.refreshTokensBulk(
        req.user.id,
        body.accountIds,
      );

      return {
        success: true,
        data: result,
        message: `Refreshed ${result.successCount} out of ${body.accountIds.length} accounts`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to refresh tokens: ${error.message}`,
      };
    }
  }
  @Post(':id/refresh')
  @UseGuards(JwtAuthGuard)
  async refreshToken(@Request() req, @Param('id') id: string) {
    try {
      const refreshedAccount = await this.socialAccountService.refreshToken(
        req.user.id,
        id,
      );

      return {
        success: true,
        data: refreshedAccount,
        message: 'Token refreshed successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to refresh token: ${error.message}`,
      };
    }
  }
}
