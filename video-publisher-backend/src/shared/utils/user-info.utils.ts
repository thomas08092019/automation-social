import { SocialPlatform } from '@prisma/client';
import axios from 'axios';

export interface UserInfoConfig {
  url: string;
  method: 'GET' | 'POST';
  authHeader: 'Bearer' | 'OAuth';
  tokenParam?: string;
  fields?: string;
  dataPath?: string;
}

export interface NormalizedUserInfo {
  id: string;
  name: string;
  email?: string;
  profilePicture?: string;
  username?: string;
  metadata?: Record<string, any>;
}

export class UserInfoUtils {
  private static readonly PLATFORM_USER_INFO_CONFIGS: Record<SocialPlatform, UserInfoConfig> = {
    [SocialPlatform.FACEBOOK]: {
      url: 'https://graph.facebook.com/me',
      method: 'GET',
      authHeader: 'Bearer',
      tokenParam: 'access_token',
      fields: 'id,name,email,picture',
    },
    [SocialPlatform.YOUTUBE]: {
      url: 'https://www.googleapis.com/oauth2/v2/userinfo',
      method: 'GET',
      authHeader: 'Bearer',
    },
    [SocialPlatform.TIKTOK]: {
      url: 'https://open.tiktokapis.com/v2/user/info/',
      method: 'GET',
      authHeader: 'Bearer',
      dataPath: 'data.user',
    },
    [SocialPlatform.X]: {
      url: 'https://api.twitter.com/2/users/me',
      method: 'GET',
      authHeader: 'Bearer',
      dataPath: 'data',
    },
    [SocialPlatform.INSTAGRAM]: {
      url: 'https://graph.instagram.com/me',
      method: 'GET',
      authHeader: 'Bearer',
      tokenParam: 'access_token',
      fields: 'id,username',
    },
    [SocialPlatform.ZALO]: {
      url: 'https://graph.zalo.me/v2.0/me',
      method: 'GET',
      authHeader: 'Bearer',
      tokenParam: 'access_token',
      fields: 'id,name,picture',
    },
    [SocialPlatform.TELEGRAM]: {
      url: 'https://api.telegram.org/bot',
      method: 'GET',
      authHeader: 'Bearer',
    },
  };

  /**
   * Fetch user info from any platform using generic approach
   */
  static async fetchUserInfo(platform: SocialPlatform, accessToken: string): Promise<any> {
    const config = this.PLATFORM_USER_INFO_CONFIGS[platform];
    if (!config) {
      throw new Error(`User info configuration not found for platform: ${platform}`);
    }

    // Special handling for Telegram
    if (platform === SocialPlatform.TELEGRAM) {
      return {
        id: 'telegram_user',
        username: 'telegram_user',
        first_name: 'Telegram User',
      };
    }

    try {
      let url = config.url;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Handle authentication
      if (config.tokenParam) {
        // Use token as URL parameter (Facebook, Instagram, Zalo style)
        const params = new URLSearchParams();
        params.set(config.tokenParam, accessToken);
        if (config.fields) {
          params.set('fields', config.fields);
        }
        url = `${url}?${params.toString()}`;
      } else {
        // Use Authorization header (YouTube, TikTok, X style)
        headers['Authorization'] = `${config.authHeader} ${accessToken}`;
      }

      const response = await axios({
        method: config.method,
        url,
        headers,
      });

      // Extract data from nested path if configured
      let userData = response.data;
      if (config.dataPath) {
        const pathParts = config.dataPath.split('.');
        for (const part of pathParts) {
          userData = userData?.[part];
        }
      }

      return userData;
    } catch (error) {
      throw new Error(`Failed to fetch user info from ${platform}: ${error.message}`);
    }
  }

  /**
   * Normalize user info to common format
   */
  static normalizeUserInfo(platform: SocialPlatform, rawUserInfo: any): NormalizedUserInfo {
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

      case SocialPlatform.INSTAGRAM:
        return {
          id: rawUserInfo.id,
          name: rawUserInfo.username,
          username: rawUserInfo.username,
          metadata: rawUserInfo,
        };

      case SocialPlatform.ZALO:
        return {
          id: rawUserInfo.id,
          name: rawUserInfo.name,
          profilePicture: rawUserInfo.picture?.data?.url,
          username: rawUserInfo.name,
          metadata: rawUserInfo,
        };

      case SocialPlatform.TELEGRAM:
        return {
          id: rawUserInfo.id || 'telegram_user',
          name: rawUserInfo.first_name || 'Telegram User',
          username: rawUserInfo.username || 'telegram_user',
          metadata: rawUserInfo,
        };

      default:
        // Generic fallback
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
