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
  
  // Circuit breaker for TikTok API
  private tiktokCircuitBreaker = {
    isOpen: false,
    failures: 0,
    maxFailures: 3,
    resetTimeout: 60000, // 1 minute
    lastFailureTime: 0,
  };

  /**
   * Reset circuit breaker if enough time has passed
   */
  private resetCircuitBreakerIfNeeded() {
    if (this.tiktokCircuitBreaker.isOpen && 
        Date.now() - this.tiktokCircuitBreaker.lastFailureTime > this.tiktokCircuitBreaker.resetTimeout) {
      this.tiktokCircuitBreaker.isOpen = false;
      this.tiktokCircuitBreaker.failures = 0;
      this.logger.debug('TikTok circuit breaker reset');
    }
  }

  /**
   * Handle circuit breaker failure
   */
  private recordCircuitBreakerFailure() {
    this.tiktokCircuitBreaker.failures++;
    this.tiktokCircuitBreaker.lastFailureTime = Date.now();
    
    if (this.tiktokCircuitBreaker.failures >= this.tiktokCircuitBreaker.maxFailures) {
      this.tiktokCircuitBreaker.isOpen = true;
      this.logger.warn(`TikTok circuit breaker opened after ${this.tiktokCircuitBreaker.failures} failures`);
    }
  }

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
  }  /**
   * Fetch TikTok user information with enhanced endpoint discovery and circuit breaker
   */
  private async fetchTikTokUserInfo(accessToken: string): Promise<PlatformUserInfo> {
    try {
      this.logger.debug('=== TikTok User Info API Call Debug ===');
      this.logger.debug(`Access Token: ${accessToken ? `${accessToken.substring(0, 10)}...` : 'MISSING'}`);
      
      // Check circuit breaker
      this.resetCircuitBreakerIfNeeded();
      
      if (this.tiktokCircuitBreaker.isOpen) {
        this.logger.warn('TikTok circuit breaker is open, using fallback profile immediately');
        return this.createTikTokFallbackProfile(accessToken, 'Circuit breaker open - API temporarily unavailable');
      }
      
      // TikTok API endpoints - ordered by likelihood of success
      const endpoints = [
        'https://open.tiktokapis.com/v2/user/info/',
        'https://open-api.tiktok.com/platform/oauth/connect/userinfo/',
        'https://business-api.tiktok.com/open_api/v1.3/user/info/',
        'https://open.tiktokapis.com/v1/user/info/', // v1 fallback
      ];

      let lastError: any;
      let successfulEndpoint: string | null = null;
      
      for (let i = 0; i < endpoints.length; i++) {
        const endpoint = endpoints[i];
        try {
          this.logger.debug(`Trying endpoint ${i + 1}/${endpoints.length}: ${endpoint}`);
          
          // Try different request formats with fast timeout
          const requestFormats = [
            // Format 1: POST with fields in body (most common)
            {
              method: 'POST',
              data: {
                fields: ['open_id', 'union_id', 'avatar_url', 'display_name', 'username', 'follower_count', 'following_count', 'likes_count', 'video_count']
              },
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
              }
            },
            // Format 2: GET with query parameters
            {
              method: 'GET',
              params: {
                fields: 'open_id,union_id,avatar_url,display_name,username,follower_count,following_count,likes_count,video_count'
              },
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Cache-Control': 'no-cache',
              }
            },
            // Format 3: POST with minimal fields (compatibility)
            {
              method: 'POST',
              data: {
                fields: ['open_id', 'display_name', 'avatar_url']
              },
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
              }
            },
            // Format 4: Simple GET without additional fields
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Cache-Control': 'no-cache',
              }
            }
          ];

          for (let j = 0; j < requestFormats.length; j++) {
            const requestConfig = requestFormats[j];
            try {
              this.logger.debug(`Trying format ${j + 1}/${requestFormats.length}: ${requestConfig.method}`);
              
              const userResponse = await axios({
                url: endpoint,
                method: requestConfig.method,
                timeout: 8000, // Fast timeout to prevent delays
                maxRedirects: 0,
                ...requestConfig
              });

              this.logger.debug('Raw response:', JSON.stringify(userResponse.data, null, 2));
              
              // Try to extract user data from various response structures
              let userData = null;
              const responseData = userResponse.data;
              
              // Multiple extraction strategies
              if (responseData.data?.data?.user) {
                userData = responseData.data.data.user;
              } else if (responseData.data?.user) {
                userData = responseData.data.user;
              } else if (responseData.data && responseData.data.open_id) {
                userData = responseData.data;
              } else if (responseData.user) {
                userData = responseData.user;
              } else if (responseData.open_id) {
                userData = responseData;
              }

              if (userData && userData.open_id) {
                this.logger.debug('Successfully extracted user data:', JSON.stringify(userData, null, 2));
                successfulEndpoint = endpoint;
                
                // Reset circuit breaker on success
                this.tiktokCircuitBreaker.failures = 0;
                
                return {
                  platformAccountId: userData.open_id,
                  username: userData.username || userData.display_name || 'TikTok User',
                  displayName: userData.display_name || userData.username || 'TikTok User',
                  profilePictureUrl: userData.avatar_url || userData.avatar_large_url,
                  accountType: 'CREATOR',
                  metadata: {
                    openId: userData.open_id,
                    unionId: userData.union_id,
                    username: userData.username,
                    displayName: userData.display_name,
                    avatarUrl: userData.avatar_url || userData.avatar_large_url,
                    followerCount: userData.follower_count,
                    followingCount: userData.following_count,
                    likesCount: userData.likes_count,
                    videoCount: userData.video_count,
                    apiEndpoint: endpoint,
                    requestFormat: j + 1,
                    circuitBreakerState: 'closed',
                  },
                };
              } else {
                this.logger.debug(`No user data in response format ${j + 1}`);
              }
            } catch (formatError) {
              this.logger.debug(`Format ${j + 1} failed: ${formatError.response?.status} ${formatError.response?.statusText}`);
              lastError = formatError;
              continue;
            }
          }
        } catch (endpointError) {
          this.logger.debug(`Endpoint ${i + 1} failed: ${endpointError.response?.status} ${endpointError.response?.statusText}`);
          lastError = endpointError;
          continue;
        }
      }

      // Record failure for circuit breaker
      this.recordCircuitBreakerFailure();

      // If all API calls failed, create a fallback user profile with better info
      this.logger.warn('All TikTok user info endpoints failed, creating enhanced fallback profile');
      
      return this.createTikTokFallbackProfile(accessToken, lastError?.message);
      
    } catch (error) {
      this.recordCircuitBreakerFailure();
      this.logger.error('Failed to fetch TikTok user info:', error);
      throw new Error(`Failed to fetch TikTok user information: ${error.message}`);
    }
  }

  /**
   * Create fallback TikTok profile
   */
  private createTikTokFallbackProfile(accessToken: string, errorReason?: string): PlatformUserInfo {
    // Try to extract some info from the access token if possible
    let fallbackData: any = {};
    try {
      // TikTok access tokens sometimes contain encoded user info
      const tokenParts = accessToken.split('.');
      if (tokenParts.length > 1) {
        // Attempt to decode if it's a JWT-like structure
        const payload = Buffer.from(tokenParts[1], 'base64').toString();
        fallbackData = JSON.parse(payload);
      }
    } catch (tokenDecodeError) {
      // Token decoding failed, continue with basic fallback
    }
    
    const fallbackId = fallbackData.sub || fallbackData.user_id || `tiktok_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      platformAccountId: fallbackId,
      username: fallbackData.username || 'TikTok User',
      displayName: fallbackData.display_name || fallbackData.name || 'TikTok User',
      profilePictureUrl: fallbackData.avatar_url || null,
      accountType: 'CREATOR',
      metadata: {
        openId: fallbackId,
        note: 'Fallback profile - TikTok user info API unavailable',
        accessTokenPrefix: accessToken ? `${accessToken.substring(0, 10)}...` : 'missing',
        errorReason: errorReason,
        fallbackData: fallbackData,
        timestamp: new Date().toISOString(),
        circuitBreakerState: this.tiktokCircuitBreaker.isOpen ? 'open' : 'closed',
        circuitBreakerFailures: this.tiktokCircuitBreaker.failures,
      },
    };
  }
}
