import { SocialPlatform } from '@prisma/client';
import { BasePlatformAdapter } from './base-platform.adapter';
import {
  PlatformCapabilities,
  PostPublishParams,
  PostPublishResult,
  TokenResponse,
  PlatformCredentials,
} from './platform-adapter.interface';

export class TelegramAdapter extends BasePlatformAdapter {
  readonly platform = SocialPlatform.TELEGRAM;
  readonly capabilities: PlatformCapabilities = {
    supportsText: true,
    supportsImages: true,
    supportsVideos: true,
    supportsMultipleMedia: true,
    supportsScheduling: false,
    supportsHashtags: true,
    supportsLocation: true,
    supportsAnalytics: false,
    maxTextLength: 4096,
    maxMediaCount: 10,
    supportedVideoFormats: ['mp4', 'mov', 'avi'],
    supportedImageFormats: ['jpg', 'jpeg', 'png', 'gif'],
  };

  async refreshAccessToken(
    refreshToken: string,
    credentials: PlatformCredentials,
  ): Promise<TokenResponse> {
    // Telegram bot tokens don't expire, so refresh is not needed
    return {
      accessToken: refreshToken,
      tokenType: 'Bearer',
    };
  }

  async publishPost(params: PostPublishParams): Promise<PostPublishResult> {
    try {
      const botToken = params.accessToken;
      const chatId = params.options?.chatId || '@channel'; // Would need actual chat ID

      if (params.content.mediaUrls && params.content.mediaUrls.length > 0) {
        // Send media with caption
        const mediaUrl = params.content.mediaUrls[0];
        const isVideo = this.isVideo(mediaUrl);

        const endpoint = isVideo ? 'sendVideo' : 'sendPhoto';
        const mediaParam = isVideo ? 'video' : 'photo';

        const response = await this.makeRequest({
          url: `https://api.telegram.org/bot${botToken}/${endpoint}`,
          method: 'POST',
          data: {
            chat_id: chatId,
            [mediaParam]: mediaUrl,
            caption: params.content.text || '',
            parse_mode: 'HTML',
          },
        });

        return {
          success: true,
          postId: response.result.message_id.toString(),
          postUrl: `https://t.me/${chatId}/${response.result.message_id}`,
        };
      } else {
        // Send text message
        const response = await this.makeRequest({
          url: `https://api.telegram.org/bot${botToken}/sendMessage`,
          method: 'POST',
          data: {
            chat_id: chatId,
            text: params.content.text || '',
            parse_mode: 'HTML',
          },
        });

        return {
          success: true,
          postId: response.result.message_id.toString(),
          postUrl: `https://t.me/${chatId}/${response.result.message_id}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        errorMessage: `Telegram post failed: ${error.message}`,
      };
    }
  }

  async getAccountMetrics(accessToken: string): Promise<Record<string, any>> {
    try {
      const botToken = accessToken;

      // Get bot info
      const botResponse = await this.makeRequest({
        url: `https://api.telegram.org/bot${botToken}/getMe`,
        method: 'GET',
      });

      const bot = botResponse.result;

      return {
        id: bot.id,
        username: bot.username,
        firstName: bot.first_name,
        isBot: bot.is_bot,
        canJoinGroups: bot.can_join_groups,
        canReadAllGroupMessages: bot.can_read_all_group_messages,
        supportsInlineQueries: bot.supports_inline_queries,
      };
    } catch (error) {
      throw new Error(`Failed to get Telegram metrics: ${error.message}`);
    }
  }

  async getPlatformSpecificData(
    accessToken: string,
    dataType: string,
  ): Promise<any> {
    switch (dataType) {
      case 'updates':
        return this.getUpdates(accessToken);
      case 'webhookInfo':
        return this.getWebhookInfo(accessToken);
      case 'chatAdministrators':
        return this.getChatAdministrators(accessToken);
      default:
        throw new Error(`Unsupported data type: ${dataType}`);
    }
  }

  private isVideo(url: string): boolean {
    const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'wmv'];
    const extension = url.split('.').pop()?.toLowerCase();
    return videoExtensions.includes(extension || '');
  }

  private async getUpdates(accessToken: string): Promise<any> {
    const botToken = accessToken;
    return this.makeRequest({
      url: `https://api.telegram.org/bot${botToken}/getUpdates`,
      method: 'GET',
      params: {
        limit: '10',
      },
    });
  }

  private async getWebhookInfo(accessToken: string): Promise<any> {
    const botToken = accessToken;
    return this.makeRequest({
      url: `https://api.telegram.org/bot${botToken}/getWebhookInfo`,
      method: 'GET',
    });
  }

  private async getChatAdministrators(
    accessToken: string,
    chatId?: string,
  ): Promise<any> {
    if (!chatId) {
      return { error: 'Chat ID is required for this operation' };
    }

    const botToken = accessToken;
    return this.makeRequest({
      url: `https://api.telegram.org/bot${botToken}/getChatAdministrators`,
      method: 'GET',
      params: {
        chat_id: chatId,
      },
    });
  }
}
