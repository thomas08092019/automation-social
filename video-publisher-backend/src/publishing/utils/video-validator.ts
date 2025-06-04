
import { VideoValidationError } from './errors';
import * as fs from 'fs';
import * as path from 'path';

export interface VideoRequirements {
  maxFileSizeMB: number;
  maxDurationSeconds: number;
  minDurationSeconds: number;
  supportedFormats: string[];
  maxResolution?: { width: number; height: number };
  minResolution?: { width: number; height: number };
  aspectRatios?: number[]; // e.g., [9/16, 16/9]
}

export class VideoValidator {
  // Platform-specific video requirements
  private static readonly PLATFORM_REQUIREMENTS: Record<string, VideoRequirements> = {
    youtube: {
      maxFileSizeMB: 128000, // 128 GB
      maxDurationSeconds: 12 * 60 * 60, // 12 hours
      minDurationSeconds: 1,
      supportedFormats: ['mp4', 'mov', 'avi', 'wmv', 'flv', 'webm'],
      maxResolution: { width: 7680, height: 4320 }, // 8K
      aspectRatios: [9/16], // YouTube Shorts: vertical
    },
    facebook: {
      maxFileSizeMB: 10240, // 10 GB
      maxDurationSeconds: 90, // Facebook Reels: max 90 seconds
      minDurationSeconds: 3,
      supportedFormats: ['mp4', 'mov'],
      maxResolution: { width: 1920, height: 1080 },
      aspectRatios: [9/16, 1/1], // Vertical or square
    },
    instagram: {
      maxFileSizeMB: 1024, // 1 GB
      maxDurationSeconds: 90, // Instagram Reels: max 90 seconds
      minDurationSeconds: 3,
      supportedFormats: ['mp4', 'mov'],
      maxResolution: { width: 1920, height: 1080 },
      aspectRatios: [9/16, 1/1], // Vertical or square preferred
    },
    tiktok: {
      maxFileSizeMB: 287, // 287 MB
      maxDurationSeconds: 180, // 3 minutes
      minDurationSeconds: 3,
      supportedFormats: ['mp4', 'mov'],
      maxResolution: { width: 1080, height: 1920 }, // Vertical HD
      aspectRatios: [9/16], // Vertical only
    },
  };

  static async validateVideo(
    platform: string,
    videoPath: string,
    videoInfo?: {
      duration?: number;
      size?: number;
      width?: number;
      height?: number;
      format?: string;
    },
  ): Promise<void> {
    const requirements = this.PLATFORM_REQUIREMENTS[platform.toLowerCase()];
    if (!requirements) {
      throw new VideoValidationError(platform, `No validation rules defined for platform: ${platform}`);
    }

    // Get file info if not provided
    if (!videoInfo) {
      videoInfo = await this.getVideoInfo(videoPath);
    }

    // Validate file size
    if (videoInfo.size && videoInfo.size > requirements.maxFileSizeMB * 1024 * 1024) {
      throw new VideoValidationError(
        platform,
        `File size ${(videoInfo.size / 1024 / 1024).toFixed(2)}MB exceeds maximum of ${requirements.maxFileSizeMB}MB`,
      );
    }

    // Validate duration
    if (videoInfo.duration) {
      if (videoInfo.duration > requirements.maxDurationSeconds) {
        throw new VideoValidationError(
          platform,
          `Duration ${videoInfo.duration}s exceeds maximum of ${requirements.maxDurationSeconds}s`,
        );
      }
      if (videoInfo.duration < requirements.minDurationSeconds) {
        throw new VideoValidationError(
          platform,
          `Duration ${videoInfo.duration}s is below minimum of ${requirements.minDurationSeconds}s`,
        );
      }
    }

    // Validate format
    const fileExt = path.extname(videoPath).toLowerCase().substring(1);
    if (!requirements.supportedFormats.includes(fileExt)) {
      throw new VideoValidationError(
        platform,
        `Format ${fileExt} not supported. Supported formats: ${requirements.supportedFormats.join(', ')}`,
      );
    }

    // Validate resolution
    if (videoInfo.width && videoInfo.height) {
      if (requirements.maxResolution) {
        if (videoInfo.width > requirements.maxResolution.width || 
            videoInfo.height > requirements.maxResolution.height) {
          throw new VideoValidationError(
            platform,
            `Resolution ${videoInfo.width}x${videoInfo.height} exceeds maximum of ${requirements.maxResolution.width}x${requirements.maxResolution.height}`,
          );
        }
      }

      if (requirements.minResolution) {
        if (videoInfo.width < requirements.minResolution.width || 
            videoInfo.height < requirements.minResolution.height) {
          throw new VideoValidationError(
            platform,
            `Resolution ${videoInfo.width}x${videoInfo.height} is below minimum of ${requirements.minResolution.width}x${requirements.minResolution.height}`,
          );
        }
      }

      // Validate aspect ratio
      if (requirements.aspectRatios && requirements.aspectRatios.length > 0) {
        const videoAspectRatio = videoInfo.width / videoInfo.height;
        const tolerance = 0.05; // 5% tolerance
        
        const isValidAspectRatio = requirements.aspectRatios.some(requiredRatio => 
          Math.abs(videoAspectRatio - requiredRatio) <= tolerance
        );

        if (!isValidAspectRatio) {
          const expectedRatios = requirements.aspectRatios.map(r => 
            r === 9/16 ? '9:16 (vertical)' : 
            r === 16/9 ? '16:9 (horizontal)' : 
            r === 1 ? '1:1 (square)' : 
            r.toFixed(2)
          ).join(', ');
          
          throw new VideoValidationError(
            platform,
            `Aspect ratio ${videoAspectRatio.toFixed(2)} not supported. Expected: ${expectedRatios}`,
          );
        }
      }
    }
  }

  private static async getVideoInfo(videoPath: string): Promise<{
    duration?: number;
    size?: number;
    width?: number;
    height?: number;
    format?: string;
  }> {
    try {
      const stats = await fs.promises.stat(videoPath);
      const format = path.extname(videoPath).toLowerCase().substring(1);
      
      // For basic validation, we return what we can get without ffprobe
      return {
        size: stats.size,
        format,
      };
    } catch (error) {
      throw new VideoValidationError('unknown', `Failed to read video file: ${error.message}`);
    }
  }

  static getRequirements(platform: string): VideoRequirements | null {
    return this.PLATFORM_REQUIREMENTS[platform.toLowerCase()] || null;
  }
}
