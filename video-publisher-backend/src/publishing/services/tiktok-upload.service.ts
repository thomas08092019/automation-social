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
  PlatformAPIError 
} from '../utils/errors';
import axios from 'axios';
import * as FormData from 'form-data';
import * as fs from 'fs';

@Injectable()
export class TiktokUploadService extends BasePlatformUploadService {
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
    const platform = 'tiktok';
    
    try {
      this.logger.log(`Starting TikTok upload for video ${context.video.id}`);

      // Validate video against TikTok requirements
      await VideoValidator.validateVideo(platform, context.video.storagePath, {
        duration: context.video.duration || undefined,
        size: context.video.size,
      });

      // Check rate limits
      await RateLimiter.waitForRateLimit(platform, 'upload');

      // Upload with retry mechanism
      return await RetryUtil.withRetry(
        () => this.performUpload(context),
        this.RETRY_OPTIONS,
        `TikTok upload for video ${context.video.id}`,
      );

    } catch (error) {
      this.logger.error(`TikTok upload failed for video ${context.video.id}:`, error);
      
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
          errorMessage: 'Authentication failed. Please reconnect your TikTok account.',
        };
      }

      return {
        success: false,
        errorMessage: error.message || 'Unknown error occurred during TikTok upload',
      };
    }
  }

  private async performUpload(context: UploadContext): Promise<UploadResult> {
    try {
      // Refresh token if needed
      const tokenResult = await this.tokenManager.refreshTokenIfNeeded(context.socialAccount.id);
      if (!tokenResult.success) {
        throw new TokenExpiredError('tiktok');
      }

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

      this.logger.log('Step 1: Initializing TikTok upload...');
      // Step 1: Initialize upload
      const uploadInitResponse = await this.initializeTikTokUpload(
        context.socialAccount.platformAccountId,
        tokenResult.accessToken,
      );

      if (!uploadInitResponse.success) {
        throw new PlatformAPIError('tiktok', uploadInitResponse.errorMessage || 'Failed to initialize upload');
      }

      this.logger.log('Step 2: Uploading video file...');
      // Step 2: Upload video
      const videoUploadResponse = await this.uploadVideoToTikTok(
        uploadInitResponse.uploadUrl!,
        context.video.storagePath,
        uploadInitResponse.uploadHeaders!,
      );

      if (!videoUploadResponse.success) {
        throw new PlatformAPIError('tiktok', videoUploadResponse.errorMessage || 'Failed to upload video file');
      }

      this.logger.log('Step 3: Creating TikTok post...');
      // Step 3: Create post
      const title = context.customTitle || context.video.title;
      const description = context.customDescription || context.video.description || '';

      const postResponse = await this.createTikTokPost(
        context.socialAccount.platformAccountId,
        uploadInitResponse.videoId!,
        title,
        description,
        tokenResult.accessToken,
        publishingJob?.scheduledAt,
      );

      if (!postResponse.success) {
        throw new PlatformAPIError('tiktok', postResponse.errorMessage || 'Failed to create TikTok post');
      }

      this.logger.log(`Successfully uploaded to TikTok: ${postResponse.platformPostId}`);
      return {
        success: true,
        platformPostId: postResponse.platformPostId,
      };

    } catch (error) {
      // Convert API errors to our error types
      if (error.response?.status === 401) {
        throw new TokenExpiredError('tiktok');
      }
      
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'] ? 
          parseInt(error.response.headers['retry-after']) : undefined;
        throw new RateLimitError('tiktok', undefined, retryAfter);
      }

      if (error.response?.status >= 500) {
        throw new PlatformAPIError('tiktok', error.message, error.response.status.toString(), error.response.status);
      }

      if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
        throw new NetworkError('tiktok', error);
      }

      if (error instanceof PublishingError) {
        throw error;
      }

      throw new PlatformAPIError('tiktok', error.message);
    }
  }

  private async initializeTikTokUpload(openId: string, accessToken: string): Promise<{
    success: boolean;
    uploadUrl?: string;
    videoId?: string;
    uploadHeaders?: any;
    errorMessage?: string;
  }> {
    try {
      this.logger.debug(`Initializing TikTok upload for open ID: ${openId}`);
      
      const response = await axios.post(
        'https://business-api.tiktok.com/open_api/v1.3/tt_video/upload/init/',
        {
          open_id: openId,
        },
        {
          headers: {
            'Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 second timeout
        },
      );

      if (response.data.code !== 0) {
        throw new Error(response.data.message || 'TikTok API returned error code');
      }

      return {
        success: true,
        uploadUrl: response.data.data.upload_url,
        videoId: response.data.data.video_id,
        uploadHeaders: response.data.data.upload_headers,
      };
    } catch (error) {
      this.logger.error(`TikTok upload initialization failed:`, error);
      
      if (error.response?.status === 401) {
        throw new TokenExpiredError('tiktok');
      }
      
      if (error.response?.status === 429) {
        throw new RateLimitError('tiktok');
      }

      const errorMessage = error.response?.data?.message || error.message;
      return {
        success: false,
        errorMessage: `Failed to initialize upload: ${errorMessage}`,
      };
    }
  }

  private async uploadVideoToTikTok(
    uploadUrl: string,
    videoPath: string,
    uploadHeaders: any,
  ): Promise<{
    success: boolean;
    errorMessage?: string;
  }> {
    try {
      this.logger.debug(`Uploading video file to TikTok: ${videoPath}`);
      
      const videoBuffer = fs.readFileSync(videoPath);

      const response = await axios.put(uploadUrl, videoBuffer, {
        headers: {
          ...uploadHeaders,
          'Content-Type': 'video/mp4',
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 300000, // 5 minute timeout for video upload
      });

      return {
        success: true,
      };
    } catch (error) {
      this.logger.error(`TikTok video upload failed:`, error);
      
      if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
        throw new NetworkError('tiktok', error);
      }

      return {
        success: false,
        errorMessage: `Failed to upload video file: ${error.message}`,
      };
    }
  }

  private async createTikTokPost(
    openId: string,
    videoId: string,
    title: string,
    description: string,
    accessToken: string,
    scheduledAt?: Date,
  ): Promise<UploadResult> {
    try {
      this.logger.debug(`Creating TikTok post with video ID: ${videoId}`);
      
      const text = `${title}\n\n${description}`.substring(0, 2200); // TikTok text limit
      const payload: any = {
        open_id: openId,
        video_id: videoId,
        text: text,
        privacy_level: 'PUBLIC_TO_EVERYONE', // Change to SELF_ONLY for private posts
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      };

      // Handle scheduled publishing
      if (scheduledAt && scheduledAt > new Date()) {
        payload.schedule_time = Math.floor(scheduledAt.getTime() / 1000);
        this.logger.log(`Scheduling TikTok post for: ${scheduledAt.toISOString()}`);
      }

      const response = await axios.post(
        'https://business-api.tiktok.com/open_api/v1.3/tt_video/upload/commit/',
        payload,
        {
          headers: {
            'Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      if (response.data.code !== 0) {
        throw new Error(response.data.message || 'TikTok API returned error code');
      }

      return {
        success: true,
        platformPostId: response.data.data.share_id || response.data.data.video_id,
      };
    } catch (error) {
      this.logger.error(`TikTok post creation failed:`, error);
      
      if (error.response?.status === 401) {
        throw new TokenExpiredError('tiktok');
      }
      
      if (error.response?.status === 429) {
        throw new RateLimitError('tiktok');
      }

      const errorMessage = error.response?.data?.message || error.message;
      return {
        success: false,
        errorMessage: `Failed to create TikTok post: ${errorMessage}`,
      };
    }
  }
}
