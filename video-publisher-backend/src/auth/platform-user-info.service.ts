import { Injectable, Logger } from '@nestjs/common';
import { SocialPlatform } from '@prisma/client';
import axios from 'axios';

export interface PlatformUserInfo {
  platformAccountId: string;
  username: string;
  displayName?: string;
  profilePictureUrl?: string;
  accountType?: string;
  metadata?: any;
}

@Injectable()
export class PlatformUserInfoService {
  private readonly logger = new Logger(PlatformUserInfoService.name);

  /**
   * Fetch user information from the platform using the access token
   */
  async fetchUserInfo(
    platform: SocialPlatform,
    accessToken: string,
  ): Promise<PlatformUserInfo> {
    try {
      switch (platform) {
        case SocialPlatform.YOUTUBE:
          return await this.fetchYouTubeUserInfo(accessToken);
        case SocialPlatform.FACEBOOK:
          return await this.fetchFacebookUserInfo(accessToken);
        case SocialPlatform.INSTAGRAM:
          return await this.fetchInstagramUserInfo(accessToken);
        case SocialPlatform.TIKTOK:
          return await this.fetchTikTokUserInfo(accessToken);
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }
    } catch (error) {
      this.logger.error(`Failed to fetch user info for ${platform}:`, error);
      throw error;
    }
  }

  /**
   * Fetch YouTube channel information
   */
  private async fetchYouTubeUserInfo(accessToken: string): Promise<PlatformUserInfo> {
    try {
      // First get the authenticated user's channels
      const channelsResponse = await axios.get(
        'https://www.googleapis.com/youtube/v3/channels',
        {
          params: {
            part: 'snippet,statistics,brandingSettings',
            mine: true,
          },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!channelsResponse.data.items || channelsResponse.data.items.length === 0) {
        throw new Error('No YouTube channels found for this account');
      }

      // Use the first (primary) channel
      const channel = channelsResponse.data.items[0];
      
      return {
        platformAccountId: channel.id,
        username: channel.snippet.customUrl || channel.snippet.title,
        displayName: channel.snippet.title,
        profilePictureUrl: channel.snippet.thumbnails?.high?.url || channel.snippet.thumbnails?.default?.url,
        accountType: 'CREATOR',
        metadata: {
          channelId: channel.id,
          channelTitle: channel.snippet.title,
          channelDescription: channel.snippet.description,
          customUrl: channel.snippet.customUrl,
          subscriberCount: channel.statistics?.subscriberCount,
          videoCount: channel.statistics?.videoCount,
          viewCount: channel.statistics?.viewCount,
          thumbnails: channel.snippet.thumbnails,
          publishedAt: channel.snippet.publishedAt,
          country: channel.snippet.country,
          defaultLanguage: channel.snippet.defaultLanguage,
          brandingSettings: channel.brandingSettings,
        },
      };
    } catch (error) {
      this.logger.error('Failed to fetch YouTube user info:', error);
      throw new Error(`Failed to fetch YouTube channel information: ${error.message}`);
    }
  }

  /**
   * Fetch Facebook page information
   */
  private async fetchFacebookUserInfo(accessToken: string): Promise<PlatformUserInfo> {
    try {
      // Get user's Facebook pages
      const pagesResponse = await axios.get(
        'https://graph.facebook.com/v18.0/me/accounts',
        {
          params: {
            access_token: accessToken,
            fields: 'id,name,category,picture,access_token,fan_count,about,website,instagram_business_account',
          },
        }
      );

      if (!pagesResponse.data.data || pagesResponse.data.data.length === 0) {
        throw new Error('No Facebook pages found for this account');
      }

      // Use the first page or find the most suitable one
      const page = pagesResponse.data.data[0];
      
      return {
        platformAccountId: page.id,
        username: page.name,
        displayName: page.name,
        profilePictureUrl: page.picture?.data?.url,
        accountType: 'PAGE',
        metadata: {
          pageId: page.id,
          pageName: page.name,
          category: page.category,
          fanCount: page.fan_count,
          about: page.about,
          website: page.website,
          pageAccessToken: page.access_token,
          instagramBusinessAccount: page.instagram_business_account,
          picture: page.picture,
        },
      };
    } catch (error) {
      this.logger.error('Failed to fetch Facebook user info:', error);
      throw new Error(`Failed to fetch Facebook page information: ${error.message}`);
    }
  }

  /**
   * Fetch Instagram business account information
   */
  private async fetchInstagramUserInfo(accessToken: string): Promise<PlatformUserInfo> {
    try {
      // First get Facebook pages to find Instagram Business Account
      const pagesResponse = await axios.get(
        'https://graph.facebook.com/v18.0/me/accounts',
        {
          params: {
            access_token: accessToken,
            fields: 'instagram_business_account',
          },
        }
      );

      const page = pagesResponse.data.data.find((p: any) => p.instagram_business_account);
      if (!page?.instagram_business_account?.id) {
        throw new Error('No Instagram Business Account found');
      }

      const instagramUserId = page.instagram_business_account.id;

      // Get Instagram account details
      const instagramResponse = await axios.get(
        `https://graph.facebook.com/v18.0/${instagramUserId}`,
        {
          params: {
            access_token: accessToken,
            fields: 'id,username,name,account_type,media_count,followers_count,follows_count,profile_picture_url,biography,website',
          },
        }
      );

      const instagramAccount = instagramResponse.data;

      return {
        platformAccountId: instagramAccount.id,
        username: instagramAccount.username,
        displayName: instagramAccount.name,
        profilePictureUrl: instagramAccount.profile_picture_url,
        accountType: instagramAccount.account_type || 'BUSINESS',
        metadata: {
          instagramUserId: instagramAccount.id,
          username: instagramAccount.username,
          name: instagramAccount.name,
          accountType: instagramAccount.account_type,
          mediaCount: instagramAccount.media_count,
          followersCount: instagramAccount.followers_count,
          followsCount: instagramAccount.follows_count,
          profilePictureUrl: instagramAccount.profile_picture_url,
          biography: instagramAccount.biography,
          website: instagramAccount.website,
        },
      };
    } catch (error) {
      this.logger.error('Failed to fetch Instagram user info:', error);
      throw new Error(`Failed to fetch Instagram account information: ${error.message}`);
    }
  }

  /**
   * Fetch TikTok user information
   */  private async fetchTikTokUserInfo(accessToken: string): Promise<PlatformUserInfo> {
    try {
      // Get TikTok user information using the new API
      const userResponse = await axios.post(
        'https://open.tiktokapis.com/v2/user/info/',
        {
          fields: ['open_id', 'union_id', 'avatar_url', 'display_name', 'username', 'follower_count', 'following_count', 'likes_count', 'video_count']
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!userResponse.data.data || !userResponse.data.data.user) {
        throw new Error('Failed to fetch TikTok user data');
      }

      const userData = userResponse.data.data.user;

      return {
        platformAccountId: userData.open_id,
        username: userData.username || userData.display_name,
        displayName: userData.display_name,
        profilePictureUrl: userData.avatar_url,
        accountType: 'CREATOR',
        metadata: {
          openId: userData.open_id,
          unionId: userData.union_id,
          username: userData.username,
          displayName: userData.display_name,
          avatarUrl: userData.avatar_url,
          followerCount: userData.follower_count,
          followingCount: userData.following_count,
          likesCount: userData.likes_count,
          videoCount: userData.video_count,
        },
      };
    } catch (error) {
      this.logger.error('Failed to fetch TikTok user info:', error);
      throw new Error(`Failed to fetch TikTok user information: ${error.message}`);
    }
  }
}
