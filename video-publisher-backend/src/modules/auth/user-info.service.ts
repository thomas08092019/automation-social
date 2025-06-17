import { Injectable, Logger } from '@nestjs/common';
import { SocialPlatform } from '@prisma/client';
import { SOCIAL_PLATFORM_CONFIGS } from '../../shared/constants/platform.constants';
import axios from 'axios';

export interface UserInfoResult {
  success: boolean;
  userInfo?: {
    id: string;
    name: string;
    email?: string;
    profilePicture?: string;
    username?: string;
    metadata?: Record<string, any>;
  };
  errorMessage?: string;
}

@Injectable()
export class UserInfoService {
  private readonly logger = new Logger(UserInfoService.name);

  async fetchUserInfo(platform: SocialPlatform, accessToken: string): Promise<UserInfoResult> {
    try {
      const config = SOCIAL_PLATFORM_CONFIGS[platform];
      if (!config) {
        return {
          success: false,
          errorMessage: `Unsupported platform: ${platform}`,
        };
      }

      const userInfo = await this.fetchPlatformUserInfo(platform, accessToken, config.userInfoUrl);
      
      return {
        success: true,
        userInfo: this.normalizeUserInfo(platform, userInfo),
      };
    } catch (error) {
      this.logger.error(`Failed to fetch user info for ${platform}:`, error.message);
      return {
        success: false,
        errorMessage: `Failed to fetch user info: ${error.message}`,
      };
    }
  }

  private async fetchPlatformUserInfo(platform: SocialPlatform, accessToken: string, userInfoUrl: string): Promise<any> {
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    switch (platform) {
      case SocialPlatform.FACEBOOK:
        return this.fetchFacebookUserInfo(accessToken);
      case SocialPlatform.YOUTUBE:
        return this.fetchGoogleUserInfo(accessToken);
      case SocialPlatform.TIKTOK:
        return this.fetchTikTokUserInfo(accessToken);
      case SocialPlatform.X:
        return this.fetchTwitterUserInfo(accessToken);
      case SocialPlatform.INSTAGRAM:
        return this.fetchInstagramUserInfo(accessToken);
      case SocialPlatform.ZALO:
        return this.fetchZaloUserInfo(accessToken);
      case SocialPlatform.TELEGRAM:
        return this.fetchTelegramUserInfo(accessToken);
      default:
        throw new Error(`Platform ${platform} not implemented`);
    }
  }

  private async fetchFacebookUserInfo(accessToken: string) {
    const response = await axios.get(
      `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`
    );
    return response.data;
  }

  private async fetchGoogleUserInfo(accessToken: string) {
    const response = await axios.get(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
    return response.data;
  }

  private async fetchTikTokUserInfo(accessToken: string) {
    const response = await axios.get(
      'https://open.tiktokapis.com/v2/user/info/',
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
    return response.data.data?.user;
  }

  private async fetchTwitterUserInfo(accessToken: string) {
    const response = await axios.get(
      'https://api.twitter.com/2/users/me',
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
    return response.data.data;
  }

  private async fetchInstagramUserInfo(accessToken: string) {
    const response = await axios.get(
      `https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`
    );
    return response.data;
  }

  private async fetchZaloUserInfo(accessToken: string) {
    const response = await axios.get(
      `https://graph.zalo.me/v2.0/me?fields=id,name,picture&access_token=${accessToken}`
    );
    return response.data;
  }

  private async fetchTelegramUserInfo(accessToken: string) {
    // Telegram bot API doesn't have traditional user info endpoint
    return {
      id: 'telegram_user',
      username: 'telegram_user',
      first_name: 'Telegram User',
    };
  }

  private normalizeUserInfo(platform: SocialPlatform, rawUserInfo: any) {
    switch (platform) {
      case SocialPlatform.FACEBOOK:
        return {
          id: rawUserInfo.id,
          name: rawUserInfo.name,
          email: rawUserInfo.email,
          profilePicture: rawUserInfo.picture?.data?.url,
          username: rawUserInfo.username || rawUserInfo.name,
          metadata: rawUserInfo,
        };

      case SocialPlatform.YOUTUBE:
        return {
          id: rawUserInfo.id,
          name: rawUserInfo.name,
          email: rawUserInfo.email,
          profilePicture: rawUserInfo.picture,
          username: rawUserInfo.email?.split('@')[0] || rawUserInfo.name,
          metadata: rawUserInfo,
        };

      case SocialPlatform.TIKTOK:
        return {
          id: rawUserInfo.open_id,
          name: rawUserInfo.display_name,
          username: rawUserInfo.username,
          profilePicture: rawUserInfo.avatar_url,
          metadata: rawUserInfo,
        };

      case SocialPlatform.X:
        return {
          id: rawUserInfo.id,
          name: rawUserInfo.name,
          username: rawUserInfo.username,
          profilePicture: rawUserInfo.profile_image_url,
          metadata: rawUserInfo,
        };

      default:
        return {
          id: rawUserInfo.id || rawUserInfo.open_id,
          name: rawUserInfo.name || rawUserInfo.display_name || rawUserInfo.username,
          email: rawUserInfo.email,
          username: rawUserInfo.username || rawUserInfo.name,
          profilePicture: rawUserInfo.picture || rawUserInfo.avatar_url || rawUserInfo.profile_image_url,
          metadata: rawUserInfo,
        };
    }
  }
}
