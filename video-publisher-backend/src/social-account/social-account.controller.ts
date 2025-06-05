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
import {
  CreateSocialAccountDto,
  UpdateSocialAccountDto,
  SocialAccountResponseDto,
} from './dto/social-account.dto';

@Controller('social-accounts')
@UseGuards(JwtAuthGuard)
export class SocialAccountController {
  constructor(
    private socialAccountService: SocialAccountService,
    private oauthAuthorizationService: OAuthAuthorizationService,
  ) {}

  @Post()
  async create(
    @Request() req,
    @Body() createDto: CreateSocialAccountDto,
  ): Promise<SocialAccountResponseDto> {
    return this.socialAccountService.create(req.user.id, createDto);
  }

  @Post('connect/:platform')
  async connectSocialAccount(
    @Request() req,
    @Param('platform') platform: string,
    @Query('appId') appId?: string,
  ) {
    // Map frontend platform names to backend enum values
    const platformMapping: Record<string, SocialPlatform> = {
      'youtube': SocialPlatform.YOUTUBE_SHORTS,
      'facebook': SocialPlatform.FACEBOOK_REELS,
      'instagram': SocialPlatform.INSTAGRAM_REELS,
      'tiktok': SocialPlatform.TIKTOK,
    };

    const lowerPlatform = platform.toLowerCase();
    const socialPlatform = platformMapping[lowerPlatform];
    
    if (!socialPlatform) {
      const validPlatforms = Object.keys(platformMapping);
      throw new BadRequestException(`Invalid platform: ${platform}. Valid platforms: ${validPlatforms.join(', ')}`);
    }
    
    try {
      const result = await this.oauthAuthorizationService.generateAuthorizationUrl({
        userId: req.user.id,
        platform: socialPlatform,
        preferredAppId: appId,
        state: `${req.user.id}:${socialPlatform}:${Date.now()}`, // Include timestamp for uniqueness
      });

      if (!result.success) {
        // Check if the error is related to missing OAuth credentials
        if (result.errorMessage?.includes('No app configuration available') || 
            result.errorMessage?.includes('placeholder values')) {
          return {
            success: false,
            message: `OAuth credentials not configured for ${platform}. Please set up real ${platform} OAuth credentials in your environment configuration. See OAUTH_SETUP_GUIDE.md for instructions.`,
            error: 'OAUTH_CREDENTIALS_NOT_CONFIGURED',
          };
        }
        
        return {
          success: false,
          message: result.errorMessage || 'Failed to generate authorization URL',
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
      if (error.message?.includes('No app configuration available') || 
          error.message?.includes('placeholder values')) {
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
    @Body() body: { code: string; state: string; platform: string; appId?: string },
  ) {
    try {
      // Parse state to get user ID and platform
      const [userId, platform, timestamp] = body.state.split(':');
      
      if (!userId || !platform) {
        throw new BadRequestException('Invalid state parameter');
      }

      const socialPlatform = platform as SocialPlatform;

      // Exchange code for token
      const tokenResult = await this.oauthAuthorizationService.exchangeCodeForToken(
        socialPlatform,
        body.code,
        userId,
        body.appId,
      );

      if (!tokenResult.success) {
        return {
          success: false,
          message: tokenResult.errorMessage || 'Failed to exchange authorization code',
        };
      }

      // Create social account with the obtained tokens
      const socialAccountData: CreateSocialAccountDto = {
        platform: socialPlatform,
        platformAccountId: 'temp-id', // We'll need to fetch this from the platform
        username: 'Connected Account', // We'll need to fetch this from the platform
        accessToken: tokenResult.accessToken!,
        refreshToken: tokenResult.refreshToken,
        expiresAt: tokenResult.expiresIn 
          ? new Date(Date.now() + tokenResult.expiresIn * 1000)
          : undefined,
        scopes: tokenResult.scope ? tokenResult.scope.split(' ') : [],
      };

      const socialAccount = await this.socialAccountService.create(userId, socialAccountData);

      return {
        success: true,
        data: socialAccount,
        message: 'Social account connected successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `OAuth callback failed: ${error.message}`,
      };
    }
  }

  @Get()
  async findAll(
    @Request() req,
    @Query('platform') platform?: SocialPlatform,
  ) {
    const accounts = platform 
      ? await this.socialAccountService.findByPlatform(req.user.id, platform)
      : await this.socialAccountService.findAllByUser(req.user.id);
    
    return {
      success: true,
      data: accounts,
      message: 'Social accounts retrieved successfully'
    };
  }

  @Get(':id')
  async findOne(
    @Request() req,
    @Param('id') id: string,
  ): Promise<SocialAccountResponseDto> {
    return this.socialAccountService.findById(req.user.id, id);
  }

  @Put(':id')
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateSocialAccountDto,
  ): Promise<SocialAccountResponseDto> {
    return this.socialAccountService.update(req.user.id, id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Request() req, @Param('id') id: string): Promise<void> {
    return this.socialAccountService.delete(req.user.id, id);
  }
}
