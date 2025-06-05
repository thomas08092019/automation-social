import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { EnhancedSocialAppService } from './enhanced-social-app.service';
import { SocialPlatform } from '@prisma/client';
import axios from 'axios';

export interface TokenRefreshResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  errorMessage?: string;
}

@Injectable()
export class TokenManagerService {
  private readonly logger = new Logger(TokenManagerService.name);

  constructor(
    private prisma: PrismaService,
    private enhancedSocialAppService: EnhancedSocialAppService
  ) {}

  async refreshTokenIfNeeded(socialAccountId: string): Promise<TokenRefreshResult> {
    try {
      const socialAccount = await this.prisma.socialAccount.findUnique({
        where: { id: socialAccountId },
      });

      if (!socialAccount) {
        return {
          success: false,
          errorMessage: 'Social account not found',
        };
      }

      // Check if token is expired or will expire soon (within 5 minutes)
      const expiresAt = socialAccount.expiresAt;
      const now = new Date();
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

      if (!expiresAt || expiresAt > fiveMinutesFromNow) {
        // Token is still valid
        return {
          success: true,
          accessToken: socialAccount.accessToken,
        };
      }

      // Token needs refresh
      return await this.refreshToken(socialAccount);
    } catch (error) {
      this.logger.error(`Token refresh check failed: ${error.message}`);
      return {
        success: false,
        errorMessage: error.message,
      };
    }
  }

  private async refreshToken(socialAccount: any): Promise<TokenRefreshResult> {
    try {
      let refreshResult: TokenRefreshResult;

      switch (socialAccount.platform) {
        case SocialPlatform.FACEBOOK:
        case SocialPlatform.INSTAGRAM:
          refreshResult = await this.refreshFacebookToken(socialAccount);
          break;
        case SocialPlatform.YOUTUBE:
          refreshResult = await this.refreshGoogleToken(socialAccount);
          break;
        case SocialPlatform.TIKTOK:
          refreshResult = await this.refreshTikTokToken(socialAccount);
          break;
        default:
          return {
            success: false,
            errorMessage: `Unsupported platform: ${socialAccount.platform}`,
          };
      }

      if (refreshResult.success) {
        // Update database with new tokens
        await this.updateTokens(socialAccount.id, refreshResult);
      }

      return refreshResult;
    } catch (error) {
      this.logger.error(`Token refresh failed: ${error.message}`);
      return {
        success: false,
        errorMessage: error.message,
      };
    }
  }

  private async refreshFacebookToken(socialAccount: any): Promise<TokenRefreshResult> {
    try {
      // Get app configuration for Facebook
      const platform = socialAccount.platform === SocialPlatform.INSTAGRAM ? SocialPlatform.INSTAGRAM : SocialPlatform.FACEBOOK;
      const appConfig = await this.enhancedSocialAppService.getAppConfig({
        userId: socialAccount.userId,
        platform,
        socialAccountId: socialAccount.id,
      });

      const response = await axios.get('https://graph.facebook.com/oauth/access_token', {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: appConfig.appId,
          client_secret: appConfig.appSecret,
          fb_exchange_token: socialAccount.accessToken,
        },
      });

      return {
        success: true,
        accessToken: response.data.access_token,
        expiresIn: response.data.expires_in,
      };
    } catch (error) {
      this.logger.error(`Facebook token refresh failed: ${error.message}`);
      return {
        success: false,
        errorMessage: error.response?.data?.error?.message || error.message,
      };
    }
  }

  private async refreshGoogleToken(socialAccount: any): Promise<TokenRefreshResult> {
    try {
      if (!socialAccount.refreshToken) {
        return {
          success: false,
          errorMessage: 'No refresh token available',
        };
      }
      
      // Get app configuration for YouTube
      const appConfig = await this.enhancedSocialAppService.getAppConfig({
        userId: socialAccount.userId,
        platform: SocialPlatform.YOUTUBE,
        socialAccountId: socialAccount.id,
      });

      const response = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: appConfig.appId,
        client_secret: appConfig.appSecret,
        refresh_token: socialAccount.refreshToken,
        grant_type: 'refresh_token',
      });

      return {
        success: true,
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token || socialAccount.refreshToken,
        expiresIn: response.data.expires_in,
      };
    } catch (error) {
      this.logger.error(`Google token refresh failed: ${error.message}`);
      return {
        success: false,
        errorMessage: error.response?.data?.error_description || error.message,
      };
    }
  }

  private async refreshTikTokToken(socialAccount: any): Promise<TokenRefreshResult> {
    try {
      if (!socialAccount.refreshToken) {
        return {
          success: false,
          errorMessage: 'No refresh token available',
        };
      }

      // Get app configuration for TikTok
      const appConfig = await this.enhancedSocialAppService.getAppConfig({
        userId: socialAccount.userId,
        platform: SocialPlatform.TIKTOK,
        socialAccountId: socialAccount.id,
      });

      const response = await axios.post('https://business-api.tiktok.com/open_api/v1.3/oauth2/refresh_token/', {
        app_id: appConfig.appId,
        secret: appConfig.appSecret,
        refresh_token: socialAccount.refreshToken,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.data.code !== 0) {
        return {
          success: false,
          errorMessage: response.data.message,
        };
      }

      return {
        success: true,
        accessToken: response.data.data.access_token,
        refreshToken: response.data.data.refresh_token,
        expiresIn: response.data.data.expires_in,
      };
    } catch (error) {
      this.logger.error(`TikTok token refresh failed: ${error.message}`);
      return {
        success: false,
        errorMessage: error.response?.data?.message || error.message,
      };
    }
  }

  private async updateTokens(socialAccountId: string, tokens: TokenRefreshResult): Promise<void> {
    const expiresAt = tokens.expiresIn 
      ? new Date(Date.now() + tokens.expiresIn * 1000)
      : null;    await this.prisma.socialAccount.update({
      where: { id: socialAccountId },
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: expiresAt,
      },
    });
  }

  /**
   * Get Facebook Page Access Token from User Access Token
   * This is needed for posting to Facebook Pages
   */
  async getPageAccessToken(userAccessToken: string, pageId: string): Promise<{ success: boolean; pageToken?: string; errorMessage?: string }> {
    try {
      const response = await axios.get(`https://graph.facebook.com/v18.0/${pageId}`, {
        params: {
          fields: 'access_token',
          access_token: userAccessToken,
        },
      });

      return {
        success: true,
        pageToken: response.data.access_token,
      };
    } catch (error) {
      this.logger.error('Failed to get page access token:', error);
      return {
        success: false,
        errorMessage: 'Failed to get page access token',
      };
    }
  }

  /**
   * Get Instagram Business Account ID from Facebook Page
   * This is needed for Instagram uploads
   */
  async getInstagramBusinessAccountId(pageAccessToken: string, pageId: string): Promise<{ success: boolean; igUserId?: string; errorMessage?: string }> {
    try {
      const response = await axios.get(`https://graph.facebook.com/v18.0/${pageId}`, {
        params: {
          fields: 'instagram_business_account',
          access_token: pageAccessToken,
        },
      });

      const igUserId = response.data.instagram_business_account?.id;
      if (!igUserId) {
        return {
          success: false,
          errorMessage: 'No Instagram Business Account linked to this Facebook Page',
        };
      }

      return {
        success: true,
        igUserId,
      };
    } catch (error) {
      this.logger.error('Failed to get Instagram Business Account ID:', error);
      return {
        success: false,
        errorMessage: 'Failed to get Instagram Business Account ID',
      };
    }
  }

  /**
   * Get TikTok Creator/Business Account Token
   * This handles both Creator and Business account token flows
   */
  async getTikTokCreatorToken(refreshToken: string, userId: string): Promise<TokenRefreshResult> {
    try {
      // Get the app configuration for TikTok from the enhanced app service
      const appConfig = await this.enhancedSocialAppService.getAppConfig({
        userId,
        platform: SocialPlatform.TIKTOK,
      });

      const response = await axios.post('https://open-api.tiktok.com/oauth/refresh_token/', {
        client_key: appConfig.appId,
        client_secret: appConfig.appSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = response.data;
      if (data.error_code !== 0) {
        throw new Error(data.message || 'TikTok token refresh failed');
      }

      return {
        success: true,
        accessToken: data.data.access_token,
        refreshToken: data.data.refresh_token,
        expiresIn: data.data.expires_in,
      };
    } catch (error) {
      this.logger.error('TikTok token refresh failed:', error);
      return {
        success: false,
        errorMessage: error.message || 'TikTok token refresh failed',
      };
    }
  }

  /**
   * Validate and convert token types based on platform requirements
   */
  async getValidTokenForPlatform(socialAccountId: string, platform: string, pageId?: string): Promise<{ success: boolean; token?: string; additionalData?: any; errorMessage?: string }> {
    try {
      const socialAccount = await this.prisma.socialAccount.findUnique({
        where: { id: socialAccountId },
      });

      if (!socialAccount) {
        return {
          success: false,
          errorMessage: 'Social account not found',
        };
      }

      // Refresh token if needed
      const tokenResult = await this.refreshTokenIfNeeded(socialAccountId);
      if (!tokenResult.success) {
        return tokenResult;
      }

      const userToken = tokenResult.accessToken;

      switch (platform) {
        case 'facebook':
          if (pageId) {
            // Get page access token for posting to Facebook Page
            const pageTokenResult = await this.getPageAccessToken(userToken, pageId);
            return {
              success: pageTokenResult.success,
              token: pageTokenResult.pageToken,
              errorMessage: pageTokenResult.errorMessage,
            };
          }
          return {
            success: true,
            token: userToken,
          };

        case 'instagram':
          if (pageId) {
            // First get page token, then get Instagram Business Account ID
            const pageTokenResult = await this.getPageAccessToken(userToken, pageId);
            if (!pageTokenResult.success) {
              return pageTokenResult;
            }

            const igAccountResult = await this.getInstagramBusinessAccountId(pageTokenResult.pageToken, pageId);
            return {
              success: igAccountResult.success,
              token: pageTokenResult.pageToken,
              additionalData: { igUserId: igAccountResult.igUserId },
              errorMessage: igAccountResult.errorMessage,
            };
          }
          return {
            success: false,
            errorMessage: 'Page ID required for Instagram uploads',
          };

        case 'youtube':
          // YouTube uses user token directly
          return {
            success: true,
            token: userToken,
          };

        case 'tiktok':
          // TikTok token is already refreshed, use directly
          return {
            success: true,
            token: userToken,
          };

        default:
          return {
            success: false,
            errorMessage: `Unsupported platform: ${platform}`,
          };
      }
    } catch (error) {
      this.logger.error(`Failed to get valid token for platform ${platform}:`, error);
      return {
        success: false,
        errorMessage: error.message || 'Failed to get valid token',
      };
    }
  }
}
