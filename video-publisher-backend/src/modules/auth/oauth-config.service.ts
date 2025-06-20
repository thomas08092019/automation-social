import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SocialPlatform } from '@prisma/client';
import { OAuthUtils } from '../../shared/utils/oauth.utils';

@Injectable()
export class OAuthConfigService {
  constructor(private configService: ConfigService) {}
  getOAuthCredentials(platform: SocialPlatform): {
    clientId: string;
    clientSecret: string;
  } {
    const platformName = platform.toLowerCase();
    const clientId = this.configService.get(
      `${platformName.toUpperCase()}_CLIENT_ID`,
    );
    const clientSecret = this.configService.get(
      `${platformName.toUpperCase()}_CLIENT_SECRET`,
    );

    if (!clientId || !clientSecret) {
      throw new Error(
        `OAuth credentials not configured for ${platform}. Please set ${platformName.toUpperCase()}_CLIENT_ID and ${platformName.toUpperCase()}_CLIENT_SECRET environment variables.`,
      );
    }

    return { clientId, clientSecret };
  }

  hasOAuthCredentials(platform: SocialPlatform): boolean {
    const platformName = platform.toLowerCase();
    const clientId = this.configService.get(
      `${platformName.toUpperCase()}_CLIENT_ID`,
    );
    const clientSecret = this.configService.get(
      `${platformName.toUpperCase()}_CLIENT_SECRET`,
    );

    return !!(
      clientId &&
      clientSecret &&
      clientId !== 'your-' + platformName + '-client-id' &&
      clientSecret !== 'your-' + platformName + '-client-secret'
    );
  }

  getRedirectUri(): string {
    return (
      this.configService.get('OAUTH_REDIRECT_URI') ||
      `${this.configService.get('APP_URL')}/auth/oauth/callback`
    );
  }
  getDefaultScopes(platform: SocialPlatform): string[] {
    return OAuthUtils.getDefaultScopes(platform);
  }
  getPlatformConfig(platform: SocialPlatform) {
    const config = OAuthUtils.getOAuthConfig(platform);
    if (!config) {
      throw new Error(`Unsupported platform: ${platform}`);
    }
    return config;
  }
  generateAuthUrl(
    platform: SocialPlatform,
    params: Record<string, string>,
  ): string {
    const config = this.getPlatformConfig(platform);
    const url = new URL(config.authUrl);

    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    return url.toString();
  }

  generateState(provider: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `connect-${provider}-${timestamp}-${random}`;
  }
}
