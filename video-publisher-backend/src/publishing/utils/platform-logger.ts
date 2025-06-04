import { Logger } from '@nestjs/common';

export interface LogContext {
  videoId?: string;
  socialAccountId?: string;
  platform?: string;
  operation?: string;
  duration?: number;
  fileSize?: number;
  metadata?: Record<string, any>;
}

export class PlatformLogger {
  private static instance: PlatformLogger;
  private logger: Logger;

  private constructor() {
    this.logger = new Logger('PlatformUpload');
  }

  static getInstance(): PlatformLogger {
    if (!PlatformLogger.instance) {
      PlatformLogger.instance = new PlatformLogger();
    }
    return PlatformLogger.instance;
  }

  logUploadStart(context: LogContext): void {
    const { videoId, platform, socialAccountId } = context;
    this.logger.log(
      `🚀 Starting upload | Platform: ${platform} | Video: ${videoId} | Account: ${socialAccountId}`
    );
  }

  logUploadSuccess(context: LogContext, platformPostId: string, duration: number): void {
    const { videoId, platform, fileSize } = context;
    this.logger.log(
      `✅ Upload successful | Platform: ${platform} | Video: ${videoId} | PostId: ${platformPostId} | Duration: ${duration}ms | Size: ${this.formatFileSize(fileSize)}`
    );
  }

  logUploadFailure(context: LogContext, error: Error, duration: number): void {
    const { videoId, platform } = context;
    this.logger.error(
      `❌ Upload failed | Platform: ${platform} | Video: ${videoId} | Duration: ${duration}ms | Error: ${error.message}`
    );
  }

  logRetryAttempt(context: LogContext, attempt: number, maxAttempts: number, error: Error): void {
    const { videoId, platform } = context;
    this.logger.warn(
      `🔄 Retry attempt ${attempt}/${maxAttempts} | Platform: ${platform} | Video: ${videoId} | Error: ${error.message}`
    );
  }

  logRateLimit(platform: string, operation: string, retryAfter?: number): void {
    const retryMessage = retryAfter ? ` | Retry after: ${retryAfter}s` : '';
    this.logger.warn(
      `⏰ Rate limit hit | Platform: ${platform} | Operation: ${operation}${retryMessage}`
    );
  }

  logTokenRefresh(socialAccountId: string, platform: string, success: boolean): void {
    const status = success ? '✅ Success' : '❌ Failed';
    this.logger.log(
      `🔑 Token refresh ${status} | Platform: ${platform} | Account: ${socialAccountId}`
    );
  }

  logValidation(context: LogContext, validationResult: { isValid: boolean; errors?: string[] }): void {
    const { videoId, platform } = context;
    if (validationResult.isValid) {
      this.logger.log(
        `✅ Video validation passed | Platform: ${platform} | Video: ${videoId}`
      );
    } else {
      this.logger.error(
        `❌ Video validation failed | Platform: ${platform} | Video: ${videoId} | Errors: ${validationResult.errors?.join(', ')}`
      );
    }
  }

  logScheduledPublish(context: LogContext, scheduledAt: Date): void {
    const { videoId, platform } = context;
    this.logger.log(
      `📅 Scheduled publish | Platform: ${platform} | Video: ${videoId} | Scheduled: ${scheduledAt.toISOString()}`
    );
  }

  logApiCall(context: LogContext, endpoint: string, method: string, statusCode?: number): void {
    const { platform } = context;
    const status = statusCode ? ` | Status: ${statusCode}` : '';
    this.logger.debug(
      `🌐 API call | Platform: ${platform} | ${method} ${endpoint}${status}`
    );
  }

  logPerformanceMetrics(context: LogContext & { metrics: PerformanceMetrics }): void {
    const { platform, videoId, metrics } = context;
    this.logger.log(
      `📊 Performance | Platform: ${platform} | Video: ${videoId} | ` +
      `Validation: ${metrics.validationTime}ms | ` +
      `Upload: ${metrics.uploadTime}ms | ` +
      `Processing: ${metrics.processingTime}ms | ` +
      `Total: ${metrics.totalTime}ms`
    );
  }

  private formatFileSize(bytes?: number): string {
    if (!bytes) return 'Unknown';
    
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }
}

export interface PerformanceMetrics {
  validationTime: number;
  uploadTime: number;
  processingTime: number;
  totalTime: number;
}

// Usage example:
// const platformLogger = PlatformLogger.getInstance();
// platformLogger.logUploadStart({ videoId: '123', platform: 'youtube', socialAccountId: 'abc' });
