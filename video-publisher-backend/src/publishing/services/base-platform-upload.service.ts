import { Injectable, Logger } from '@nestjs/common';
import { PublishingTask, Video, SocialAccount } from '@prisma/client';

export interface UploadResult {
  success: boolean;
  platformPostId?: string;
  errorMessage?: string;
}

export interface UploadContext {
  task: PublishingTask;
  video: Video;
  socialAccount: SocialAccount;
  customTitle?: string;
  customDescription?: string;
}

@Injectable()
export abstract class BasePlatformUploadService {
  protected readonly logger = new Logger(this.constructor.name);

  abstract uploadVideo(context: UploadContext): Promise<UploadResult>;

  protected async downloadVideo(storagePath: string): Promise<Buffer> {
    // Implementation for downloading video from storage
    // This could be from local filesystem, AWS S3, etc.
    const fs = require('fs').promises;
    return await fs.readFile(storagePath);
  }

  protected validateVideoForPlatform(video: Video): boolean {
    // Base validation - override in specific platform services
    return true;
  }

  protected async handleRateLimit(error: any): Promise<void> {
    // Base rate limit handling
    if (error.status === 429) {
      const retryAfter = error.headers?.['retry-after'] || 60;
      this.logger.warn(`Rate limited, waiting ${retryAfter} seconds`);
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
    }
  }
}
