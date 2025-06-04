
import { Logger } from '@nestjs/common';
import { RateLimitError } from './errors';

interface RateLimitRule {
  maxRequests: number;
  windowMs: number;
  resetTime?: Date;
}

interface PlatformRateLimits {
  [key: string]: RateLimitRule;
}

export class RateLimiter {
  private static readonly logger = new Logger(RateLimiter.name);
  private static readonly requestCounts = new Map<string, number>();
  private static readonly windowStartTimes = new Map<string, number>();

  // Platform-specific rate limits
  private static readonly PLATFORM_LIMITS: PlatformRateLimits = {
    youtube: {
      maxRequests: 10000, // 10,000 quota units per day
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
    },
    facebook: {
      maxRequests: 200, // 200 calls per hour per user
      windowMs: 60 * 60 * 1000, // 1 hour
    },
    instagram: {
      maxRequests: 200, // Same as Facebook Graph API
      windowMs: 60 * 60 * 1000, // 1 hour
    },
    tiktok: {
      maxRequests: 100, // Conservative estimate
      windowMs: 60 * 60 * 1000, // 1 hour
    },
  };

  static async checkRateLimit(platform: string, operation: string = 'default'): Promise<void> {
    const key = `${platform}:${operation}`;
    const limits = this.PLATFORM_LIMITS[platform.toLowerCase()];

    if (!limits) {
      this.logger.warn(`No rate limits defined for platform: ${platform}`);
      return;
    }

    const now = Date.now();
    const windowStart = this.windowStartTimes.get(key) || now;
    const currentCount = this.requestCounts.get(key) || 0;

    // Reset window if it has expired
    if (now - windowStart >= limits.windowMs) {
      this.windowStartTimes.set(key, now);
      this.requestCounts.set(key, 0);
      this.logger.debug(`Rate limit window reset for ${key}`);
      return;
    }

    // Check if we've exceeded the limit
    if (currentCount >= limits.maxRequests) {
      const resetTime = new Date(windowStart + limits.windowMs);
      const retryAfter = Math.ceil((resetTime.getTime() - now) / 1000);
      
      this.logger.warn(
        `Rate limit exceeded for ${key}. Reset at ${resetTime.toISOString()}`,
      );
      
      throw new RateLimitError(platform, resetTime, retryAfter);
    }

    // Increment counter
    this.requestCounts.set(key, currentCount + 1);
    this.logger.debug(
      `Rate limit check passed for ${key}: ${currentCount + 1}/${limits.maxRequests}`,
    );
  }

  static async waitForRateLimit(platform: string, operation: string = 'default'): Promise<void> {
    try {
      await this.checkRateLimit(platform, operation);
    } catch (error) {
      if (error instanceof RateLimitError && error.retryAfter) {
        this.logger.warn(
          `Rate limit hit for ${platform}, waiting ${error.retryAfter} seconds`,
        );
        await this.sleep(error.retryAfter * 1000);
        // Try again after waiting
        await this.checkRateLimit(platform, operation);
      } else {
        throw error;
      }
    }
  }

  static getUsage(platform: string, operation: string = 'default'): {
    current: number;
    max: number;
    windowResetTime: Date | null;
  } {
    const key = `${platform}:${operation}`;
    const limits = this.PLATFORM_LIMITS[platform.toLowerCase()];
    const windowStart = this.windowStartTimes.get(key);
    
    return {
      current: this.requestCounts.get(key) || 0,
      max: limits?.maxRequests || 0,
      windowResetTime: windowStart ? new Date(windowStart + (limits?.windowMs || 0)) : null,
    };
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
