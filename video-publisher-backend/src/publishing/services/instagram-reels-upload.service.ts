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
import axios from 'axios';
import * as FormData from 'form-data';
import * as fs from 'fs';

@Injectable()
export class InstagramReelsUploadService extends BasePlatformUploadService {
  private readonly RETRY_OPTIONS: RetryOptions = {
    maxAttempts: 3,
    baseDelayMs: 2000,
    maxDelayMs: 60000,
    backoffMultiplier: 2,
    retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'],
  };  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenManager: TokenManagerService,
    private readonly enhancedSocialAppService: EnhancedSocialAppService,
  ) {
    super();
  }

  async uploadVideo(context: UploadContext): Promise<UploadResult> {
    const platform = 'instagram';
    
    try {
      this.logger.log(`Starting Instagram Reels upload for video ${context.video.id}`);      // Validate video against Instagram requirements
      await VideoValidator.validateVideo(platform, context.video.filePath, {
        duration: context.video.duration || undefined,
      });

      // Check rate limits
      await RateLimiter.checkRateLimit(platform, context.socialAccount.id);      // Use retry mechanism for the upload
      return await RetryUtil.withRetry(
        () => this.performUpload(context),
        this.RETRY_OPTIONS,
        `Instagram upload for video ${context.video.id}`,
      );
    } catch (error) {
      this.logger.error(`Instagram upload failed for video ${context.video.id}:`, error);

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
          errorMessage: 'Authentication failed. Please reconnect your Instagram account.',
        };
      }

      return {
        success: false,
        errorMessage: error.message || 'Unknown error occurred during Instagram upload',
      };
    }
  }
  private async performUpload(context: UploadContext): Promise<UploadResult> {
    try {      // Get Instagram-specific token and business account ID
      const tokenResult = await this.tokenManager.getValidTokenForPlatform(
        context.socialAccount.id, 
        'instagram', 
        context.socialAccount.accountId // Facebook Page/Account ID linked to Instagram
      );
      
      if (!tokenResult.success) {
        throw new TokenExpiredError('instagram');
      }

      const accessToken = tokenResult.token;
      const instagramUserId = tokenResult.additionalData?.igUserId;
      
      if (!instagramUserId) {
        throw new PlatformAPIError('instagram', 'Instagram Business Account ID not found');
      }
      
      // Step 1: Initialize Upload Session
      this.logger.log(`Initializing upload session for Instagram user ${instagramUserId}`);
      const { uploadUrl, uploadId } = await this.initializeUploadSession(instagramUserId, accessToken);
        // Step 2: Upload Video File
      this.logger.log(`Uploading video file to ${uploadUrl}`);
      const { videoId } = await this.uploadVideoFile(uploadUrl, context.video.filePath);
        // Step 3: Create Media Container
      this.logger.log(`Creating media container for video ${videoId}`);
      const { containerId } = await this.createMediaContainer(
        instagramUserId,
        videoId,
        context.customDescription || '',
        accessToken,
        undefined, // No scheduled time support for now
      );
        // Step 4: Publish Reel
      this.logger.log(`Publishing reel with container ${containerId}`);
      const { postId } = await this.publishReel(instagramUserId, containerId, accessToken);
      
      this.logger.log(`Successfully published Instagram Reel with ID: ${postId}`);
      
      return {
        success: true,
        platformPostId: postId,
      };
    } catch (error) {
      this.logger.error('Instagram upload error:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new TokenExpiredError('instagram');
        }
        
        if (error.response?.status === 429) {
          throw new RateLimitError('instagram');
        }
        
        const errorMessage = error.response?.data?.error?.message || error.message;
        throw new PlatformAPIError('instagram', `API Error: ${errorMessage}`);
      }
      
      if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
        throw new NetworkError('instagram', error.message);
      }
      
      throw new PublishingError('instagram', error.message);
    }
  }

  private async getInstagramUserId(accessToken: string): Promise<string> {
    try {
      const response = await axios.get(
        `https://graph.facebook.com/v18.0/me/accounts`,
        {
          params: {
            access_token: accessToken,
            fields: 'instagram_business_account',
          },
        }
      );

      const page = response.data.data.find((page: any) => page.instagram_business_account);
      if (!page?.instagram_business_account?.id) {
        throw new PlatformAPIError('instagram', 'No Instagram Business Account found');
      }

      return page.instagram_business_account.id;
    } catch (error) {
      this.logger.error('Failed to get Instagram User ID:', error);
      throw new PlatformAPIError('instagram', 'Failed to retrieve Instagram Business Account ID');
    }
  }

  private async initializeUploadSession(instagramUserId: string, accessToken: string): Promise<{
    uploadUrl: string;
    uploadId: string;
  }> {
    try {
      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${instagramUserId}/video_reels`,
        {
          upload_phase: 'start',
        },
        {
          params: {
            access_token: accessToken,
          },
        }
      );

      const { video_id: uploadId, upload_url: uploadUrl } = response.data;
      
      if (!uploadUrl || !uploadId) {
        throw new PlatformAPIError('instagram', 'Failed to initialize upload session');
      }

      return {
        uploadUrl,
        uploadId,
      };
    } catch (error) {
      this.logger.error('Failed to initialize Instagram upload session:', error);
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error?.message || error.message;
        throw new PlatformAPIError('instagram', `Upload initialization failed: ${errorMessage}`);
      }
      throw error;
    }
  }

  private async uploadVideoFile(uploadUrl: string, videoPath: string): Promise<{
    videoId: string;
  }> {
    try {
      const videoBuffer = fs.readFileSync(videoPath);
      
      const response = await axios.post(uploadUrl, videoBuffer, {
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Length': videoBuffer.length.toString(),
        },
        maxContentLength: 100 * 1024 * 1024, // 100MB
        timeout: 300000, // 5 minutes
      });

      // Extract video ID from response or URL
      const videoId = response.data?.video_id || uploadUrl.split('/').pop();
      
      if (!videoId) {
        throw new PlatformAPIError('instagram', 'Failed to get video ID after upload');
      }

      return { videoId };
    } catch (error) {
      this.logger.error('Failed to upload video file to Instagram:', error);
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error?.message || error.message;
        throw new PlatformAPIError('instagram', `Video upload failed: ${errorMessage}`);
      }
      throw error;
    }
  }

  private async createMediaContainer(
    instagramUserId: string,
    videoId: string,
    caption: string,
    accessToken: string,
    scheduledTime?: Date,
  ): Promise<{
    containerId: string;
  }> {
    try {
      const params: any = {
        access_token: accessToken,
        media_type: 'REELS',
        video_url: videoId,
        caption: caption,
      };

      // Add scheduled publishing if specified
      if (scheduledTime) {
        const scheduledTimestamp = Math.floor(scheduledTime.getTime() / 1000);
        params.published = false;
        params.scheduled_publish_time = scheduledTimestamp;
      }

      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${instagramUserId}/media`,
        null,
        { params }
      );

      const containerId = response.data.id;
      
      if (!containerId) {
        throw new PlatformAPIError('instagram', 'Failed to create media container');
      }

      return { containerId };
    } catch (error) {
      this.logger.error('Failed to create Instagram media container:', error);
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error?.message || error.message;
        throw new PlatformAPIError('instagram', `Media container creation failed: ${errorMessage}`);
      }
      throw error;
    }
  }

  private async publishReel(
    instagramUserId: string,
    containerId: string,
    accessToken: string,
  ): Promise<{
    postId: string;
  }> {
    try {
      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${instagramUserId}/media_publish`,
        {
          creation_id: containerId,
        },
        {
          params: {
            access_token: accessToken,
          },
        }
      );

      const postId = response.data.id;
      
      if (!postId) {
        throw new PlatformAPIError('instagram', 'Failed to publish reel');
      }

      return { postId };
    } catch (error) {
      this.logger.error('Failed to publish Instagram reel:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new TokenExpiredError('instagram');
        }
        
        if (error.response?.status === 429) {
          throw new RateLimitError('instagram');
        }

        const errorMessage = error.response?.data?.error?.message || error.message;
        throw new PlatformAPIError('instagram', `Failed to publish reel: ${errorMessage}`);
      }
      
      throw error;
    }
  }
}
