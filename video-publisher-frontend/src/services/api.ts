import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { API_BASE_URL } from '../config';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  User,
  SocialAccount,
  CreateSocialAccountDto,
  UpdateSocialAccountDto,
  SocialAccountQuery,
  SocialAccountsResponse,
  SocialPlatform,
  Video,
  VideoUploadRequest,
  CreateVideoDto,
  UpdateVideoDto
} from '../types';

// API Response Types
export interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  limit: number;
}

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add token
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor to handle auth errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.clearAuthData();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  private handleError(error: any): ErrorResponse {
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'An error occurred',
      error: error.response?.data?.error || 'UNKNOWN_ERROR',
    };
  }

  private clearAuthData(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
  }

  // Authentication endpoints - /auth/*
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await this.api.post('/auth/login', credentials);
    return response.data;
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await this.api.post('/auth/register', userData);    return response.data;
  }
  // Firebase authentication endpoint
  async firebaseAuth(firebaseToken: string): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await this.api.post('/auth/firebase-login', {
      idToken: firebaseToken
    });
    return response.data;
  }

  async forgotPassword(data: ForgotPasswordRequest): Promise<{ message: string }> {
    const response = await this.api.post('/auth/forgot-password', data);
    return response.data;
  }

  async resetPassword(data: ResetPasswordRequest): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await this.api.post('/auth/reset-password', data);
    return response.data;
  }

  async changePassword(data: ChangePasswordRequest): Promise<{ message: string }> {
    const response = await this.api.post('/auth/change-password', data);
    return response.data;
  }
  async getProfile(): Promise<User> {
    const response: AxiosResponse<User> = await this.api.get('/auth/me');
    return response.data;
  }
  // OAuth endpoints - /auth/oauth/*
  async connectPlatform(platform: string): Promise<{ success: boolean; data?: { authUrl: string; platform: string }; message?: string; error?: string }> {
    const response = await this.api.get(`/auth/oauth/${platform.toLowerCase()}`);
    return {
      success: true,
      data: {
        authUrl: response.data.authorizationUrl,
        platform: platform
      }
    };
  }

  // User endpoints - /users/*
  async updateProfile(updates: Partial<User>): Promise<User> {
    const response: AxiosResponse<User> = await this.api.patch('/users/profile', updates);
    return response.data;
  }

  async uploadAvatar(file: File): Promise<{ profilePicture: string; message: string }> {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await this.api.post('/users/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Social Account endpoints - /social-accounts/*
  async getSocialAccounts(query?: SocialAccountQuery): Promise<SocialAccountsResponse> {
    const params = new URLSearchParams();
    
    if (query) {
      if (query.page) params.append('page', query.page.toString());
      if (query.limit) params.append('limit', query.limit.toString());
      if (query.search) params.append('search', query.search);
      if (query.platform) params.append('platform', query.platform);
      if (query.accountType) params.append('accountType', query.accountType);
      if (query.status) params.append('status', query.status);
      if (query.sortBy) params.append('sortBy', query.sortBy);
      if (query.sortOrder) params.append('sortOrder', query.sortOrder);
    }

    const response: AxiosResponse<SocialAccountsResponse> = await this.api.get(
      `/social-accounts${params.toString() ? '?' + params.toString() : ''}`
    );
    return response.data;
  }

  async getSocialAccount(id: string): Promise<SocialAccount> {
    const response: AxiosResponse<SocialAccount> = await this.api.get(`/social-accounts/${id}`);
    return response.data;
  }

  async createSocialAccount(data: CreateSocialAccountDto): Promise<SocialAccount> {
    const response: AxiosResponse<SocialAccount> = await this.api.post('/social-accounts', data);
    return response.data;
  }

  async updateSocialAccount(id: string, updates: UpdateSocialAccountDto): Promise<SocialAccount> {
    const response: AxiosResponse<SocialAccount> = await this.api.put(`/social-accounts/${id}`, updates);
    return response.data;
  }

  async deleteSocialAccount(id: string): Promise<void> {
    await this.api.delete(`/social-accounts/${id}`);
  }

  async refreshSocialAccountToken(id: string): Promise<SocialAccount> {
    const response: AxiosResponse<SocialAccount> = await this.api.post(`/social-accounts/${id}/refresh`);
    return response.data;
  }

  // Bulk operations for social accounts
  async deleteSocialAccountsBulk(accountIds: string[]): Promise<{
    success: boolean;
    deletedCount: number;
    errors?: Array<{ accountId: string; error: string }>;
  }> {
    const response = await this.api.delete('/social-accounts/bulk/delete', {
      data: { accountIds }
    });
    return response.data;
  }

  async refreshSocialAccountsBulk(accountIds: string[]): Promise<{
    successful: SocialAccount[];
    failed: Array<{ accountId: string; error: string }>;
  }> {
    const response = await this.api.post('/social-accounts/bulk/refresh', {
      accountIds
    });
    return response.data.data;
  }
  // Multi-Platform endpoints - /multi-platform/*
  async createMultiPlatformPost(data: {
    platforms: SocialPlatform[];
    content: {
      text?: string;
      mediaUrls?: string[];
      mediaType?: 'image' | 'video';
      scheduledTime?: Date;
    };
    options?: {
      skipValidation?: boolean;
      continueOnError?: boolean;
      optimizeContent?: boolean;
    };
    preferences?: {
      preserveHashtags?: boolean;
      maxHashtags?: number;
      tone?: 'professional' | 'casual' | 'friendly';
      includeEmojis?: boolean;
    };
  }): Promise<{
    success: boolean;
    results: any[];
    summary: any;
    message: string;
  }> {
    const response = await this.api.post('/multi-platform/post', data);
    return response.data;
  }

  async optimizeContent(data: {
    platforms: SocialPlatform[];
    content: {
      text?: string;
      mediaUrls?: string[];
      mediaType?: 'image' | 'video';
      hashtags?: string[];
    };
    preferences?: {
      preserveHashtags?: boolean;
      maxHashtags?: number;
      tone?: 'professional' | 'casual' | 'friendly';
      includeEmojis?: boolean;
    };
  }): Promise<{
    success: boolean;
    optimizedContent: Record<string, any>;
    message: string;
  }> {
    const response = await this.api.post('/multi-platform/optimize', data);
    return response.data;
  }
  async validateContent(data: {
    platforms: SocialPlatform[];
    content: {
      text?: string;
      mediaUrls?: string[];
      mediaType?: 'image' | 'video';
    };
  }): Promise<{
    success: boolean;
    validations: any[];
    summary: { total: number; valid: number; invalid: number };
    message: string;
  }> {
    const response = await this.api.post('/multi-platform/validate', data);
    return response.data;
  }

  async getPlatformCapabilities(): Promise<{
    success: boolean;
    capabilities: Record<string, any>;
    message: string;
  }> {
    const response = await this.api.get('/multi-platform/capabilities');
    return response.data;
  }

  async getPostingStrategy(platforms: SocialPlatform[]): Promise<{
    success: boolean;
    strategy: any;
    message: string;
  }> {
    const params = new URLSearchParams();
    params.append('platforms', platforms.join(','));
    
    const response = await this.api.get(`/multi-platform/strategy?${params.toString()}`);
    return response.data;
  }

  async getPlatformAnalytics(platforms: SocialPlatform[], dateRange: { start: string; end: string }): Promise<{
    success: boolean;
    analytics: any;
    dateRange: any;
    message: string;
  }> {
    const params = new URLSearchParams();
    params.append('platforms', platforms.join(','));
    params.append('startDate', dateRange.start);
    params.append('endDate', dateRange.end);
    
    const response = await this.api.get(`/multi-platform/analytics?${params.toString()}`);
    return response.data;
  }

  // Video endpoints (future implementation)
  async getVideos(page = 1, limit = 20): Promise<PaginatedResponse<Video>> {
    const response: AxiosResponse<PaginatedResponse<Video>> = await this.api.get(
      `/videos?page=${page}&limit=${limit}`
    );
    return response.data;
  }

  async getVideo(id: string): Promise<Video> {
    const response: AxiosResponse<Video> = await this.api.get(`/videos/${id}`);
    return response.data;
  }

  async createVideo(data: CreateVideoDto): Promise<Video> {
    const response: AxiosResponse<Video> = await this.api.post('/videos', data);
    return response.data;
  }

  async updateVideo(id: string, updates: UpdateVideoDto): Promise<Video> {
    const response: AxiosResponse<Video> = await this.api.patch(`/videos/${id}`, updates);
    return response.data;
  }

  async deleteVideo(id: string): Promise<void> {
    await this.api.delete(`/videos/${id}`);
  }

  async uploadVideo(data: VideoUploadRequest): Promise<Video> {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('title', data.title);
    if (data.description) {
      formData.append('description', data.description);
    }

    const response: AxiosResponse<Video> = await this.api.post('/videos/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;
