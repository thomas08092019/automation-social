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
      'youtube': SocialPlatform.YOUTUBE,
      'facebook': SocialPlatform.FACEBOOK,
      'instagram': SocialPlatform.INSTAGRAM,
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
    // Start timer to track authorization code processing speed
    const startTime = Date.now();
    
    console.log('=== SOCIAL ACCOUNT OAUTH CALLBACK START ===');
    console.log('Received body:', {
      code: body.code ? `${body.code.substring(0, 10)}...` : 'MISSING',
      state: body.state,
      platform: body.platform,
      appId: body.appId,
    });
    
    try {
      // Parse state to get user ID and platform
      const [userId, platform, timestamp] = body.state.split(':');
      
      console.log('=== STATE PARSING DEBUG ===');
      console.log('State parts:', { userId, platform, timestamp });
      console.log('========================');
      
      if (!userId || !platform) {
        throw new BadRequestException('Invalid state parameter');
      }

      // Check if authorization code is potentially expired based on timestamp
      const codeTimestamp = parseInt(timestamp);
      const codeAge = Date.now() - codeTimestamp;
      
      console.log('=== OAuth Callback Timing Debug ===');
      console.log(`Code age: ${codeAge}ms`);
      console.log(`Processing start: ${Date.now() - startTime}ms`);
      
      if (codeAge > 300000) { // 5 minutes
        console.warn(`⚠️  Authorization code is ${codeAge}ms old - may be expired`);
      }

      const socialPlatform = platform as SocialPlatform;

      // IMMEDIATE token exchange to prevent code expiration
      console.log(`🚀 Starting immediate token exchange for ${socialPlatform}`);
      const tokenResult = await this.oauthAuthorizationService.exchangeCodeForToken(
        socialPlatform,
        body.code,
        userId,
        body.appId,
        body.state, // Pass the state for PKCE verification
      );

      const tokenExchangeTime = Date.now() - startTime;
      console.log(`⏱️  Token exchange completed in ${tokenExchangeTime}ms`);

      if (!tokenResult.success) {
        console.error(`❌ Token exchange failed after ${tokenExchangeTime}ms:`, tokenResult.errorMessage);
        return {
          success: false,
          message: tokenResult.errorMessage || 'Failed to exchange authorization code',
          timing: {
            tokenExchangeTime,
            codeAge,
          }
        };
      }      // Debug token result
      console.log('=== Token Result Debug ===');
      console.log('Success:', tokenResult.success);
      console.log('Access Token:', tokenResult.accessToken ? `${tokenResult.accessToken.substring(0, 10)}...` : 'MISSING');
      console.log('Refresh Token:', tokenResult.refreshToken ? 'Present' : 'Missing');
      console.log('Expires In:', tokenResult.expiresIn);
      console.log('Scope:', tokenResult.scope);

      // Validate access token immediately
      if (!tokenResult.accessToken) {
        console.error('=== ACCESS TOKEN MISSING ERROR ===');
        console.error('Token Result:', {
          success: tokenResult.success,
          hasAccessToken: !!tokenResult.accessToken,
          hasRefreshToken: !!tokenResult.refreshToken,
          errorMessage: tokenResult.errorMessage,
          scope: tokenResult.scope,
          expiresIn: tokenResult.expiresIn
        });
        console.error('===================================');
        throw new BadRequestException(`Access token is missing from OAuth response. Platform: ${socialPlatform}, Error: ${tokenResult.errorMessage || 'Unknown error'}`);
      }

      // Additional validation for TikTok
      if (socialPlatform === SocialPlatform.TIKTOK && !tokenResult.accessToken.trim()) {
        console.error('=== TIKTOK TOKEN VALIDATION ERROR ===');
        console.error('Empty or whitespace-only access token received');
        console.error('=====================================');
        throw new BadRequestException('TikTok access token is empty or invalid');
      }

      console.log('=== ACCESS TOKEN VALIDATION PASSED ===');
      console.log(`Token length: ${tokenResult.accessToken.length}`);
      console.log(`Token prefix: ${tokenResult.accessToken.substring(0, 20)}...`);
      console.log('=======================================');      // Fetch platform-specific user information with timeout
      let userInfo;
      const userInfoStartTime = Date.now();
      
      try {
        console.log(`🔍 Fetching user info for ${socialPlatform}`);
        
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
        console.log(`✅ User info fetched in ${userInfoTime}ms`);
        
      } catch (error) {
        const userInfoTime = Date.now() - userInfoStartTime;
        console.error(`❌ Failed to fetch platform user info for ${socialPlatform} after ${userInfoTime}ms:`, error.message);
        
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
          }
        };
      }// Create social account with the obtained tokens and user info
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
        profilePicture: userInfo.profilePictureUrl,
        metadata: userInfo.metadata || {},
      };

      // Debug social account data
      console.log('=== Social Account Data Debug ===');
      console.log('Platform:', socialAccountData.platform);
      console.log('Access Token:', socialAccountData.accessToken ? 'Present' : 'MISSING');
      console.log('User Info:', {
        platformAccountId: userInfo.platformAccountId,
        username: userInfo.username,
        displayName: userInfo.displayName,
      });      const socialAccount = await this.socialAccountService.create(userId, socialAccountData);      console.log('=== SOCIAL ACCOUNT CREATION RESULT ===');
      console.log('Created account ID:', socialAccount.id);
      console.log('Created account platform:', socialAccount.platform);
      console.log('Created account metadata present:', !!socialAccount.metadata);
      console.log('Created account metadata keys:', socialAccount.metadata ? Object.keys(socialAccount.metadata) : 'No metadata');
      console.log('Created account metadata content:', socialAccount.metadata);
      console.log('=====================================');

      const totalTime = Date.now() - startTime;
      console.log(`🎉 OAuth flow completed successfully in ${totalTime}ms`);
      console.log('=== Final Timing Summary ===');
      console.log(`Code age: ${codeAge}ms`);
      console.log(`Token exchange: ${tokenExchangeTime}ms`);
      console.log(`User info fetch: ${Date.now() - userInfoStartTime}ms`);
      console.log(`Total process: ${totalTime}ms`);
      console.log('============================');

      return {
        success: true,
        data: socialAccount,
        message: `${socialPlatform} account connected successfully`,
        timing: {
          totalTime,
          tokenExchangeTime,
          codeAge,
          userInfoTime: Date.now() - userInfoStartTime,
        }
      };
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`❌ OAuth callback failed after ${totalTime}ms:`, error);
      return {
        success: false,
        message: `OAuth callback failed: ${error.message}`,
        timing: {
          totalTime,
          failedAt: totalTime,
        }
      };
    }
  }
  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Request() req,
    @Query() query: SocialAccountQueryDto,
  ): Promise<SocialAccountsResponseDto> {
    const result = await this.socialAccountService.findAllByUserWithPagination(req.user.id, query);
    
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
  }  @Delete(':id')
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
    console.log('=== BULK DELETE CONTROLLER DEBUG ===');
    console.log('User ID from request:', req.user.id);
    console.log('Request body:', body);
    console.log('Account IDs:', body.accountIds);
    console.log('Account IDs type:', typeof body.accountIds);
    console.log('Account IDs length:', body.accountIds?.length);
    console.log('Timestamp:', new Date().toISOString());
    console.log('======================================');
    
    return this.socialAccountService.deleteBulk(req.user.id, body.accountIds);  }

  @Post('bulk/refresh')
  @UseGuards(JwtAuthGuard)
  async refreshTokensBulk(
    @Request() req,
    @Body() body: { accountIds: string[] },
  ) {
    console.log('=== BULK REFRESH CONTROLLER DEBUG ===');
    console.log('User ID from request:', req.user.id);
    console.log('Request body:', body);
    console.log('Account IDs:', body.accountIds);
    console.log('Account IDs type:', typeof body.accountIds);
    console.log('Account IDs length:', body.accountIds?.length);
    console.log('Timestamp:', new Date().toISOString());
    console.log('=======================================');
    
    try {
      const result = await this.socialAccountService.refreshTokensBulk(req.user.id, body.accountIds);
      
      console.log('=== BULK REFRESH CONTROLLER RESULT ===');
      console.log('Service result:', result);
      console.log('Success count:', result.successCount);
      console.log('Failure count:', result.failureCount);
      console.log('Results length:', result.results?.length);
      console.log('=====================================');
      
      return {
        success: true,
        data: result,
        message: `Refreshed ${result.successCount} out of ${body.accountIds.length} accounts`,
      };
    } catch (error) {
      console.log('=== BULK REFRESH CONTROLLER ERROR ===');
      console.log('Error message:', error.message);
      console.log('Error stack:', error.stack);
      console.log('====================================');
      
      return {
        success: false,
        message: `Failed to refresh tokens: ${error.message}`,
      };
    }
  }

  @Post(':id/refresh')
  @UseGuards(JwtAuthGuard)
  async refreshToken(
    @Request() req,
    @Param('id') id: string,
  ) {
    console.log('=== SINGLE REFRESH CONTROLLER DEBUG ===');
    console.log('User ID from request:', req.user.id);
    console.log('Account ID from params:', id);
    console.log('Timestamp:', new Date().toISOString());
    console.log('=======================================');
    
    try {
      const refreshedAccount = await this.socialAccountService.refreshToken(req.user.id, id);
      
      console.log('=== SINGLE REFRESH CONTROLLER RESULT ===');
      console.log('Refreshed account ID:', refreshedAccount.id);
      console.log('Refreshed account platform:', refreshedAccount.platform);
      console.log('======================================');
      
      return {
        success: true,
        data: refreshedAccount,
        message: 'Token refreshed successfully',
      };
    } catch (error) {
      console.log('=== SINGLE REFRESH CONTROLLER ERROR ===');
      console.log('Error message:', error.message);
      console.log('====================================');
      
      return {
        success: false,
        message: `Failed to refresh token: ${error.message}`,
      };
    }
  }
}
