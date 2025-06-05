import { Injectable, Logger } from '@nestjs/common';
import {
  BasePlatformUploadService,
  UploadResult,
  UploadContext,
} from './base-platform-upload.service';
import { google } from 'googleapis';
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
  PlatformAPIError 
} from '../utils/errors';
import * as fs from 'fs';

@Injectable()
export class YoutubeUploadService extends BasePlatformUploadService {
  private readonly RETRY_OPTIONS: RetryOptions = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
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
    const platform = 'youtube';
    
    try {
      this.logger.log(`Starting YouTube Shorts upload for video ${context.video.id}`);

      // Validate video against YouTube requirements
      await VideoValidator.validateVideo(platform, context.video.filePath, {
        duration: context.video.duration || undefined,
      });

      // Check rate limits
      await RateLimiter.waitForRateLimit(platform, 'upload');

      // Upload with retry mechanism
      return await RetryUtil.withRetry(
        () => this.performUpload(context),
        this.RETRY_OPTIONS,
        `YouTube upload for video ${context.video.id}`,
      );

    } catch (error) {
      this.logger.error(`YouTube upload failed for video ${context.video.id}:`, error);
      
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
          errorMessage: 'Authentication failed. Please reconnect your YouTube account.',
        };
      }

      return {
        success: false,
        errorMessage: error.message || 'Unknown error occurred during YouTube upload',
      };
    }
  }

  private async performUpload(context: UploadContext): Promise<UploadResult> {
    try {
      // Refresh token if needed
      const tokenResult = await this.tokenManager.refreshTokenIfNeeded(context.socialAccount.id);
      if (!tokenResult.success) {
        throw new TokenExpiredError('youtube');
      }

      // Get publishing job for scheduled uploads
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

      // Setup YouTube API
      const auth = await this.getYouTubeAuth(tokenResult.accessToken, context.socialAccount.userId);
      const youtube = google.youtube({ version: 'v3', auth });

      // Prepare video metadata
      const title = context.customTitle || context.video.title;
      const description = context.customDescription || context.video.description || '';
      const finalDescription = `${description}\n\n#Shorts`;

      const videoResource: any = {
        snippet: {
          title: title.substring(0, 100), // YouTube title limit
          description: finalDescription,
          tags: ['Shorts'], // Tags field not available in Video model, use default
          categoryId: '22', // People & Blogs
        },
        status: {
          privacyStatus: 'public',
        },
      };

      // Handle scheduled publishing
      if (publishingJob?.scheduleTime && publishingJob.scheduleTime > new Date()) {
        videoResource.status.privacyStatus = 'private';
        videoResource.status.publishAt = publishingJob.scheduleTime.toISOString();
        this.logger.log(`Scheduled publish time set: ${publishingJob.scheduleTime.toISOString()}`);
      }

      // Create video stream
      const videoStream = fs.createReadStream(context.video.filePath);

      // Upload video
      this.logger.log(`Uploading video to YouTube...`);
      const uploadResponse = await youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody: videoResource,
        media: {
          body: videoStream,
        },
      });

      const videoId = uploadResponse.data.id;
      if (!videoId) {
        throw new PlatformAPIError('youtube', 'No video ID returned from YouTube API');
      }

      this.logger.log(`Successfully uploaded to YouTube: ${videoId}`);
      return {
        success: true,
        platformPostId: videoId,
      };

    } catch (error) {
      // Convert API errors to our error types
      if (error.response?.status === 401) {
        throw new TokenExpiredError('youtube');
      }
      
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'] ? 
          parseInt(error.response.headers['retry-after']) : undefined;
        throw new RateLimitError('youtube', undefined, retryAfter);
      }

      if (error.response?.status >= 500) {
        throw new PlatformAPIError('youtube', error.message, error.response.status.toString(), error.response.status);
      }

      if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
        throw new NetworkError('youtube', error);
      }

      throw new PlatformAPIError('youtube', error.message);
    }
  }

  private async getYouTubeAuth(accessToken: string, userId: string) {
    // Get app configuration for YouTube/Google
    const appConfig = await this.enhancedSocialAppService.getAppConfig({
      userId,
      platform: 'YOUTUBE', // Use correct enum value
    });

    const oauth2Client = new google.auth.OAuth2(
      appConfig.appId,
      appConfig.appSecret,
    );
    oauth2Client.setCredentials({ access_token: accessToken });
    return oauth2Client;
  }
}
