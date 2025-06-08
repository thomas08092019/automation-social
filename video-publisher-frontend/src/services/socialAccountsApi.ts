import { apiService } from './api';
import { 
  SocialPlatform, 
  SocialAccount, 
  AccountType,
  SocialAccountResponse, 
  ConnectPlatformResponse 
} from '../types/social';

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

export const socialAccountsApi = {  // Get all social accounts for the user with search/filter/pagination
  getAllAccounts: async (query?: SocialAccountsQuery): Promise<SocialAccountsApiResponse> => {
    try {
      // Build query string
      const queryParams = new URLSearchParams();
      if (query?.search) queryParams.append('search', query.search);
      if (query?.platform) queryParams.append('platform', query.platform);
      if (query?.accountType) queryParams.append('accountType', query.accountType);
      if (query?.status) queryParams.append('status', query.status);
      if (query?.page) queryParams.append('page', query.page.toString());
      if (query?.limit) queryParams.append('limit', query.limit.toString());
      if (query?.sortBy) queryParams.append('sortBy', query.sortBy);
      if (query?.sortOrder) queryParams.append('sortOrder', query.sortOrder);

      const response = await apiService.getSocialAccountsWithQuery(queryParams.toString());
      console.log('Raw API Response:', response); // Debug log
        
      // Handle different response structures from backend
      let result: any;
      
      if (response && typeof response === 'object') {
        // If response has pagination structure
        if ('data' in response && Array.isArray((response as any).data)) {
          result = response;
        }
        // If response is directly an array (fallback for old API)
        else if (Array.isArray(response)) {
          result = {
            data: response,
            total: response.length,
            page: 1,
            limit: response.length,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          };
        }
      }
      
      // Map backend DTO fields to frontend types
      const mappedAccounts = (result.data || []).map((account: any) => ({
        id: account.id,
        platform: account.platform,
        accountType: account.accountType || 'PROFILE', // Use backend value or default
        accountId: account.accountId || account.platformAccountId || account.id,
        accountName: account.accountName || account.username || account.displayName || 'Unknown',
        accessToken: '', // Not returned for security
        refreshToken: '', // Not returned for security  
        expiresAt: account.expiresAt || null,
        profilePicture: account.profilePicture || account.profilePictureUrl || null,
        isActive: account.isActive !== undefined ? account.isActive : true,
        metadata: account.metadata || {}, // Use backend metadata or empty object
      }));
      
      console.log('Mapped accounts:', mappedAccounts); // Debug log
      
      return {
        data: mappedAccounts,
        total: result.total || mappedAccounts.length,
        page: result.page || 1,
        limit: result.limit || mappedAccounts.length,
        totalPages: result.totalPages || 1,
        hasNextPage: result.hasNextPage || false,
        hasPrevPage: result.hasPrevPage || false,
      };
      
    } catch (error) {
      console.error('Error fetching social accounts:', error);
      // Return empty response instead of throwing
      return {
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      };
    }
  },

  // Backward compatibility method for simple account fetching
  getAllAccountsSimple: async (): Promise<SocialAccount[]> => {
    const response = await socialAccountsApi.getAllAccounts();
    return response.data;
  },

  // Get accounts by platform
  getAccountsByPlatform: async (platform: SocialPlatform): Promise<SocialAccount[]> => {
    try {
      const accounts = await apiService.getSocialAccounts();
      return accounts.filter(account => account.platform === platform);
    } catch (error) {
      console.error('Error fetching accounts by platform:', error);
      return [];
    }
  },

  // Connect a social platform
  connectPlatform: async (platform: string): Promise<ConnectPlatformResponse> => {
    // This will be handled by OAuth flow in the component
    throw new Error('Use OAuth flow for platform connection');
  },

  // Delete a social account
  deleteAccount: async (accountId: string): Promise<void> => {
    await apiService.disconnectSocialAccount(accountId);
  },

  // Refresh account token
  refreshAccount: async (accountId: string): Promise<SocialAccount> => {
    return await apiService.refreshSocialAccountToken(accountId);
  }
};
