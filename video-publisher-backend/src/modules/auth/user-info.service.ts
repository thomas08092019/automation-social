import { Injectable, Logger } from '@nestjs/common';
import { SocialPlatform } from '@prisma/client';
import { UserInfoUtils } from '../../shared/utils/user-info.utils';
import { ExternalServiceException } from '../../shared/exceptions/custom.exceptions';

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
      const rawUserInfo = await UserInfoUtils.fetchUserInfo(platform, accessToken);
      const normalizedUserInfo = UserInfoUtils.normalizeUserInfo(platform, rawUserInfo);
      
      return {
        success: true,
        userInfo: normalizedUserInfo,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch user info for ${platform}:`, error.message);      throw new ExternalServiceException(
        platform,
        error.message,
        { operation: 'fetch_user_info', metadata: { platform } }
      );
    }
  }
}
