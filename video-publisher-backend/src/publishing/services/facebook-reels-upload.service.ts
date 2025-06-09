import { Injectable } from '@nestjs/common';
import {
  BasePlatformUploadService,
  UploadResult,
  UploadContext,
} from './base-platform-upload.service';
import { PrismaService } from '../../common/prisma.service';
import { TokenManagerService } from '../../auth/token-manager.service';
import { EnhancedSocialAppService } from '../../auth/enhanced-social-app.service';
import { RetryUtil, RetryOptions } from '../utils/retry';
import { RateLimiter } from '../utils/rate-limiter';
import { VideoValidator } from '../utils/video-validator';
import {
  PublishingError,
  TokenExpiredError,
  RateLimitError,
  VideoValidationError,
  NetworkError,
  PlatformAPIError,
} from '../utils/errors';
import { FacebookAdsApi, Page } from 'facebook-nodejs-business-sdk';
import * as fs from 'fs';

@Injectable()
export class FacebookReelsUploadService extends BasePlatformUploadService {
  private readonly RETRY_OPTIONS: RetryOptions = {
    maxAttempts: 3,
    baseDelayMs: 2000,
    maxDelayMs: 60000,
    backoffMultiplier: 2,
    retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'],
  };

  constructor(
    private prisma: PrismaService,
    private tokenManager: TokenManagerService,
    private enhancedSocialAppService: EnhancedSocialAppService,
  ) {
    super();
  }

  async uploadVideo(context: UploadContext): Promise<UploadResult> {
    const platform = 'facebook';

    try {
      this.logger.log(
        `Starting Facebook Reels upload for video ${context.video.id}`,
      );

      // Get app configuration for this social account
      const appConfig = await this.enhancedSocialAppService.getAppConfig({
        userId: context.socialAccount.userId,
        platform: context.socialAccount.platform,
        socialAccountId: context.socialAccount.id,
      });

      this.logger.debug(
        `Using app config: ${appConfig.name} (${appConfig.source})`,
      );

      // Validate video against Facebook requirements
      await VideoValidator.validateVideo(platform, context.video.filePath, {
        duration: context.video.duration || undefined,
      });

      // Check rate limits
      await RateLimiter.waitForRateLimit(platform, 'upload');

      // Upload with retry mechanism
      return await RetryUtil.withRetry(
        () => this.performUpload(context, appConfig),
        this.RETRY_OPTIONS,
        `Facebook upload for video ${context.video.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Facebook upload failed for video ${context.video.id}:`,
        error,
      );

      if (error instanceof VideoValidationError) {
        return {
          success: false,
          errorMessage: `Video validation failed: ${error.message}`,
        };
      }

      if (error instanceof RateLimitError) {
        return {
          success: false,
          errorMessage: `Rate limit exceeded. Try again after ${error.retryAfter || 'some time'}`,
        };
      }

      if (error instanceof TokenExpiredError) {
        return {
          success: false,
          errorMessage:
            'Authentication failed. Please reconnect your Facebook account.',
        };
      }

      return {
        success: false,
        errorMessage:
          error.message || 'Unknown error occurred during Facebook upload',
      };
    }
  }

  private async performUpload(
    context: UploadContext,
    appConfig: any,
  ): Promise<UploadResult> {
    try {
      // Get Facebook Page Access Token (required for posting to Pages)
      const tokenResult = await this.tokenManager.getValidTokenForPlatform(
        context.socialAccount.id,
        'facebook',
        context.socialAccount.accountId, // Facebook Page/Account ID
      );

      if (!tokenResult.success) {
        throw new TokenExpiredError('facebook');
      }

      const pageAccessToken = tokenResult.token;
      const pageId = context.socialAccount.accountId;

      // Get publishing job for scheduled publishing
      const publishingJob = await this.prisma.publishingJob.findFirst({
        where: {
          tasks: {
            some: {
              videoId: context.video.id,
              socialAccountId: context.socialAccount.id,
            },
          },
        },
      });

      // Prepare video metadata
      const title = context.customTitle || context.video.title;
      const description =
        context.customDescription || context.video.description || '';

      this.logger.log(
        `Uploading Facebook Reel using app: ${appConfig.name}...`,
      );

      // Setup Facebook API with specific app credentials
      FacebookAdsApi.init(pageAccessToken);
      const page = new Page(pageId);

      // Prepare upload parameters with app-specific configuration
      const params: any = {
        description,
        title,
        video_asset_type: 'REELS',
        published: true,
        status: 'PUBLISHED', // Explicitly set status
        // Include app metadata for tracking
        source_app_id: appConfig.appId,
      };

      // Handle scheduled publishing
      if (
        publishingJob?.scheduleTime &&
        publishingJob.scheduleTime > new Date()
      ) {
        params.published = false;
        params.status = 'SCHEDULED';
        params.scheduled_publish_time = Math.floor(
          publishingJob.scheduleTime.getTime() / 1000,
        );
        this.logger.log(
          `Scheduling Facebook Reel for: ${publishingJob.scheduleTime.toISOString()}`,
        );
      }

      // Create video stream
      const videoStream = fs.createReadStream(context.video.filePath);

      // Upload video to Facebook Page
      const videoResponse = await page.createVideo([], {
        ...params,
        source: videoStream,
      });

      const videoId = videoResponse.id;
      this.logger.log(`Successfully uploaded to Facebook Reels: ${videoId}`);

      return {
        success: true,
        platformPostId: videoId,
      };
    } catch (error) {
      this.logger.error(`Facebook Reels upload failed:`, error);

      // Convert Facebook API errors to our error types
      if (
        error.response?.error?.code === 190 ||
        error.response?.error?.code === 102
      ) {
        throw new TokenExpiredError('facebook');
      }

      if (
        error.response?.error?.code === 4 ||
        error.response?.error?.code === 17
      ) {
        throw new RateLimitError('facebook');
      }

      if (error.response?.error?.code >= 500) {
        throw new PlatformAPIError(
          'facebook',
          error.message,
          error.response.error.code.toString(),
          error.response.error.code,
        );
      }

      if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
        throw new NetworkError('facebook', error);
      }

      if (error instanceof PublishingError) {
        throw error;
      }

      const errorMessage = error.response?.error?.message || error.message;
      throw new PlatformAPIError('facebook', errorMessage);
    }
  }
}
