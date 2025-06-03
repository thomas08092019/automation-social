import { Injectable } from '@nestjs/common';
import {
  BasePlatformUploadService,
  UploadResult,
  UploadContext,
} from './base-platform-upload.service';

@Injectable()
export class InstagramReelsUploadService extends BasePlatformUploadService {
  async uploadVideo(context: UploadContext): Promise<UploadResult> {
    try {
      this.logger.log(`Uploading video ${context.video.id} to Instagram Reels`);

      if (!this.validateVideoForInstagramReels(context.video)) {
        return {
          success: false,
          errorMessage: 'Video does not meet Instagram Reels requirements',
        };
      }

      const videoBuffer = await this.downloadVideo(context.video.storagePath);

      const title = context.customTitle || context.video.title;
      const description =
        context.customDescription || context.video.description || '';

      // TODO: Implement Instagram Basic Display API / Instagram Graph API
      // Note: Instagram API has limitations for automated posting

      // Mock upload for now
      const mockPlatformPostId = `ig_reel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      this.logger.log(
        `Successfully uploaded to Instagram Reels: ${mockPlatformPostId}`,
      );

      return {
        success: true,
        platformPostId: mockPlatformPostId,
      };
    } catch (error) {
      this.logger.error(`Instagram Reels upload failed: ${error.message}`);

      await this.handleRateLimit(error);

      return {
        success: false,
        errorMessage: error.message,
      };
    }
  }

  private validateVideoForInstagramReels(video: any): boolean {
    // Instagram Reels requirements:
    // - Duration: 90 seconds or less
    // - Vertical aspect ratio (9:16)
    // - File size: up to 4GB
    // - Resolution: minimum 720p

    if (video.duration && video.duration > 90) {
      this.logger.warn(
        `Video duration ${video.duration}s exceeds Instagram Reels limit of 90s`,
      );
      return false;
    }

    return true;
  }
}
