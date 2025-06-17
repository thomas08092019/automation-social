import { SocialPlatform } from '@prisma/client';
import { SOCIAL_PLATFORM_CONFIGS } from '@shared/constants/platform.constants';

export class PlatformUtils {
  static getDefaultScopes(platform: SocialPlatform): string[] {
    return SOCIAL_PLATFORM_CONFIGS[platform]?.scopes || [];
  }

  static getPlatformConfig(platform: SocialPlatform) {
    return SOCIAL_PLATFORM_CONFIGS[platform];
  }

  static getEnvironmentKey(platform: SocialPlatform, type: 'CLIENT_ID' | 'CLIENT_SECRET'): string {
    const platformName = platform.toUpperCase();
    return `${platformName}_${type}`;
  }

  static buildAuthUrl(platform: SocialPlatform, params: Record<string, string>): string {
    const config = this.getPlatformConfig(platform);
    if (!config) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    const url = new URL(config.authUrl);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    return url.toString();
  }

  static generateState(prefix: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${prefix}-${timestamp}-${random}`;
  }
}

export class ValidationUtils {
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  }
}

export class DateUtils {
  static isExpired(expiresAt: Date | null): boolean {
    if (!expiresAt) return false;
    return new Date() >= expiresAt;
  }

  static willExpireSoon(expiresAt: Date | null, minutesFromNow = 5): boolean {
    if (!expiresAt) return false;
    const warningTime = new Date(Date.now() + minutesFromNow * 60 * 1000);
    return expiresAt <= warningTime;
  }

  static addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60 * 1000);
  }

  static addHours(date: Date, hours: number): Date {
    return new Date(date.getTime() + hours * 60 * 60 * 1000);
  }
}
