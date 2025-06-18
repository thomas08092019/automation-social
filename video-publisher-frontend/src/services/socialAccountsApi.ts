import { apiService } from './api';
import { 
  SocialPlatform, 
  SocialAccount, 
  AccountType,
  SocialAccountQuery,
  SocialAccountsResponse
} from '../types';

export interface SocialAccountsQuery {
  search?: string;
  platform?: SocialPlatform;
  accountType?: AccountType;
  status?: 'active' | 'inactive' | 'expired';
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SocialAccountsApiResponse {
  data: SocialAccount[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ConnectPlatformResponse {
  success: boolean;
  data?: {
    authUrl: string;
    platform: string;
  };
  message?: string;
  error?: string;
}

export const socialAccountsApi = {
  // Get all social accounts for the user with search/filter/pagination
  getAllAccounts: async (query?: SocialAccountsQuery): Promise<SocialAccountsApiResponse> => {
    try {
      const response = await apiService.getSocialAccounts(query);
      console.log('Social Accounts API Response:', response); // Debug log
      
      // Map backend response to frontend expected format
      return {
        data: response.data,
        total: response.total,
        page: response.currentPage,
        limit: response.limit,
        totalPages: response.totalPages,
        hasNextPage: response.hasNextPage,
        hasPrevPage: response.hasPrevPage,
      };
    } catch (error: any) {
      console.error('Error fetching social accounts:', error);
      throw error;
    }
  },

  // Get a single social account by ID
  getAccount: async (id: string): Promise<SocialAccount> => {
    try {
      return await apiService.getSocialAccount(id);
    } catch (error: any) {
      console.error('Error fetching social account:', error);
      throw error;
    }
  },

  // Update a social account
  updateAccount: async (id: string, updates: {
    accountName?: string;
    accountType?: AccountType;
    isActive?: boolean;
    metadata?: any;
  }): Promise<SocialAccount> => {
    try {
      return await apiService.updateSocialAccount(id, updates);
    } catch (error: any) {
      console.error('Error updating social account:', error);
      throw error;
    }
  },

  // Delete a social account
  deleteAccount: async (id: string): Promise<void> => {
    try {
      await apiService.deleteSocialAccount(id);
    } catch (error: any) {
      console.error('Error deleting social account:', error);
      throw error;
    }
  },

  // Refresh account token
  refreshToken: async (id: string): Promise<SocialAccount> => {
    try {
      return await apiService.refreshSocialAccountToken(id);
    } catch (error: any) {
      console.error('Error refreshing social account token:', error);
      throw error;
    }
  },

  // Connect a social platform - Generate OAuth authorization URL
  connectPlatform: async (platform: string): Promise<ConnectPlatformResponse> => {
    try {
      // Call backend to get OAuth authorization URL
      const response = await apiService.connectPlatform(platform);
      
      if (response.success && response.data?.authUrl) {
        return {
          success: true,
          data: {
            authUrl: response.data.authUrl,
            platform: response.data.platform,
          },
          message: response.message || 'Authorization URL generated successfully',
        };
      } else {
        return {
          success: false,
          message: response.message || 'Failed to generate authorization URL',
          error: response.error,
        };
      }
    } catch (error: any) {
      console.error('Error connecting platform:', error);
      return {
        success: false,
        message: error.response?.data?.message || `Failed to connect to ${platform}`,
        error: error.response?.data?.error || 'CONNECTION_FAILED',
      };
    }
  },

  // Bulk delete social accounts
  deleteBulk: async (accountIds: string[]): Promise<{
    success: boolean;
    deletedCount: number;
    errors?: Array<{ accountId: string; error: string }>;
  }> => {
    try {
      return await apiService.deleteSocialAccountsBulk(accountIds);
    } catch (error: any) {
      console.error('Error bulk deleting social accounts:', error);
      return {
        success: false,
        deletedCount: 0,
        errors: [{ accountId: 'all', error: error.message }],
      };
    }
  },

  // Bulk refresh social account tokens
  refreshBulk: async (accountIds: string[]): Promise<{
    successful: SocialAccount[];
    failed: Array<{ accountId: string; error: string }>;
  }> => {
    try {
      return await apiService.refreshSocialAccountsBulk(accountIds);
    } catch (error: any) {
      console.error('Error bulk refreshing social accounts:', error);
      return {
        successful: [],
        failed: [{ accountId: 'all', error: error.message }],
      };
    }
  },
};
