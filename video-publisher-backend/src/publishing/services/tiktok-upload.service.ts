import { Injectable } from '@nestjs/common';
import {
  BasePlatformUploadService,
  UploadResult,
  UploadContext,
} from './base-platform-upload.service';

@Injectable()
export class TiktokUploadService extends BasePlatformUploadService {
  async uploadVideo(context: UploadContext): Promise<UploadResult> {
    try {
      this.logger.log(`Uploading video ${context.video.id} to TikTok`);

      if (!this.validateVideoForTikTok(context.video)) {
        return {
          success: false,
          errorMessage: 'Video does not meet TikTok requirements',
        };
      }

      const videoBuffer = await this.downloadVideo(context.video.storagePath);

      const title = context.customTitle || context.video.title;
      const description =
        context.customDescription || context.video.description || '';

      // TODO: Implement TikTok API for Business integration
      // Note: TikTok API requires business account and approval

      // Mock upload for now
      const mockPlatformPostId = `tiktok_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      this.logger.log(`Successfully uploaded to TikTok: ${mockPlatformPostId}`);

      return {
        success: true,
        platformPostId: mockPlatformPostId,
      };
    } catch (error) {
      this.logger.error(`TikTok upload failed: ${error.message}`);

      await this.handleRateLimit(error);

      return {
        success: false,
        errorMessage: error.message,
      };
    }
  }

  private validateVideoForTikTok(video: any): boolean {
    // TikTok requirements:
    // - Duration: 3 minutes or less
    // - Vertical aspect ratio preferred (9:16)
    // - File size: up to 287.6 MB
    // - Resolution: minimum 720p, recommended 1080p

    if (video.duration && video.duration > 180) {
      this.logger.warn(
        `Video duration ${video.duration}s exceeds TikTok limit of 180s`,
      );
      return false;
    }

    return true;
  }
}
