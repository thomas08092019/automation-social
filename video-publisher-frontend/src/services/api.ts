import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  User, 
  AuthResponse, 
  LoginRequest, 
  RegisterRequest,
  SocialLoginRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  Video,
  VideoUploadRequest,
  CreateVideoDto,
  UpdateVideoDto,
  SocialAccount,
  ConnectSocialAccountDto,
  SocialApp,
  CreateSocialAppDto,
  PublishingTask,
  PublishingJob,
  CreatePublishingJobDto,
  CreateBatchJobDto,
  ApiResponse,
  PaginatedResponse,
  DashboardStats,
  OAuthAuthorizationUrl,
  OAuthCallbackDto,
  ErrorResponse,
  SocialPlatform
} from '../types';
import { API_BASE_URL } from '../config';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor to handle auth errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.clearAuthData();
          window.location.href = '/auth/login';
        }
        return Promise.reject(this.handleError(error));
      }
    );
  }

  private handleError(error: any): ErrorResponse {
    if (error.response?.data) {
      return error.response.data;
    }
    return {
      message: error.message || 'An unexpected error occurred',
      statusCode: error.response?.status || 500,
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
    const response: AxiosResponse<AuthResponse> = await this.api.post('/auth/register', userData);
    return response.data;
  }

  async socialLogin(socialData: SocialLoginRequest): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await this.api.post('/auth/social-login', socialData);
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

  // Video endpoints - /videos/*
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

  async uploadVideo(videoData: VideoUploadRequest): Promise<Video> {
    const formData = new FormData();
    formData.append('title', videoData.title);
    if (videoData.description) {
      formData.append('description', videoData.description);
    }
    formData.append('file', videoData.file);

    const response: AxiosResponse<Video> = await this.api.post('/videos/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async createVideo(videoData: CreateVideoDto): Promise<Video> {
    const response: AxiosResponse<Video> = await this.api.post('/videos', videoData);
    return response.data;
  }

  async updateVideo(id: string, updates: UpdateVideoDto): Promise<Video> {
    const response: AxiosResponse<Video> = await this.api.patch(`/videos/${id}`, updates);
    return response.data;
  }

  async deleteVideo(id: string): Promise<void> {
    await this.api.delete(`/videos/${id}`);
  }
  // Social Account endpoints - /social-accounts/*
  async getSocialAccounts(): Promise<SocialAccount[]> {
    const response: AxiosResponse<SocialAccount[]> = await this.api.get('/social-accounts');
    return response.data;
  }

  async getSocialAccountsWithQuery(queryString: string): Promise<any> {
    const url = queryString ? `/social-accounts?${queryString}` : '/social-accounts';
    const response: AxiosResponse<any> = await this.api.get(url);
    return response.data;
  }

  async getSocialAccount(id: string): Promise<SocialAccount> {
    const response: AxiosResponse<SocialAccount> = await this.api.get(`/social-accounts/${id}`);
    return response.data;
  }

  async connectSocialAccount(data: ConnectSocialAccountDto): Promise<SocialAccount> {
    const response: AxiosResponse<SocialAccount> = await this.api.post('/social-accounts/connect', data);
    return response.data;
  }

  async disconnectSocialAccount(id: string): Promise<void> {
    await this.api.delete(`/social-accounts/${id}`);
  }

  async refreshSocialAccountToken(id: string): Promise<SocialAccount> {
    const response: AxiosResponse<SocialAccount> = await this.api.post(`/social-accounts/${id}/refresh`);
    return response.data;
  }
  async connectPlatform(platform: string): Promise<any> {
    const response = await this.api.post(`/social-accounts/connect/${platform.toLowerCase()}`);
    return response.data;
  }  // Bulk operations for social accounts
  async deleteSocialAccountsBulk(accountIds: string[]): Promise<{
    success: boolean;
    deletedCount: number;
    errors?: Array<{ accountId: string; error: string }>;
  }> {
    const response = await this.api.delete('/social-accounts/bulk/delete', {
      data: { accountIds }
    });
    // Backend returns { success: boolean, deletedCount: number, errors?: any[] } directly
    return response.data;
  }
  async refreshSocialAccountsBulk(accountIds: string[]): Promise<{
    successCount: number;
    failureCount: number;
    results: Array<{
      accountId: string;
      success: boolean;
      account?: SocialAccount;
      error?: string;
    }>;
  }> {
    const response = await this.api.post('/social-accounts/bulk/refresh', {
      accountIds
    });
    // Backend returns { success: true, data: { successCount, failureCount, results }, message: "..." }
    return response.data.data;
  }

  // Social App endpoints - /api/social-apps/*
  async getSocialApps(): Promise<SocialApp[]> {
    const response: AxiosResponse<SocialApp[]> = await this.api.get('/api/social-apps');
    return response.data;
  }

  async getSocialApp(id: string): Promise<SocialApp> {
    const response: AxiosResponse<SocialApp> = await this.api.get(`/api/social-apps/${id}`);
    return response.data;
  }

  async createSocialApp(data: CreateSocialAppDto): Promise<SocialApp> {
    const response: AxiosResponse<SocialApp> = await this.api.post('/api/social-apps', data);
    return response.data;
  }

  async updateSocialApp(id: string, updates: Partial<CreateSocialAppDto>): Promise<SocialApp> {
    const response: AxiosResponse<SocialApp> = await this.api.patch(`/api/social-apps/${id}`, updates);
    return response.data;
  }
  async deleteSocialApp(id: string): Promise<void> {
    await this.api.delete(`/api/social-apps/${id}`);
  }

  // OAuth methods for login
  async getAuthorizationUrl(platform: SocialPlatform): Promise<OAuthAuthorizationUrl> {
    // For login, use the auth OAuth endpoint
    const provider = platform === SocialPlatform.YOUTUBE ? 'google' : 'facebook';
    const authUrl = `${API_BASE_URL}/auth/oauth/${provider}`;
    
    // Generate state for security
    const state = `login-${Date.now()}`;
    
    return {
      authorizationUrl: authUrl,
      state,
      platform
    };
  }

  // OAuth methods for social account connection
  async getSocialAccountAuthUrl(platform: SocialPlatform, socialAppId: string): Promise<OAuthAuthorizationUrl> {
    // Convert platform enum to lowercase for API
    const platformName = platform.toLowerCase();
    const response: AxiosResponse<any> = await this.api.post(`/social-accounts/connect/${platformName}`, {}, {
      params: { appId: socialAppId }
    });
    
    // Extract authorization URL and state from response
    if (response.data.success && response.data.data?.authUrl) {
      // The backend generates the state in the format: userId:platform:timestamp
      // We'll extract it from the authorization URL or use a default
      const urlParams = new URLSearchParams(response.data.data.authUrl.split('?')[1]);
      const state = urlParams.get('state') || `auth-${Date.now()}`;
      
      return {
        authorizationUrl: response.data.data.authUrl,
        state: state,
        platform: platform
      };
    } else {
      throw new Error(response.data.message || 'Failed to get authorization URL');
    }
  }

  async handleOAuthCallback(data: OAuthCallbackDto): Promise<any> {
    // Check if this is a login flow or social account connection flow
    const isLoginFlow = data.state.startsWith('login-');
    
    if (isLoginFlow) {
      // For login flow, use auth social-login endpoint
      const provider = data.platform === SocialPlatform.YOUTUBE ? 'google' : 'facebook';
      
      // This is a simplified implementation. In a real app, you'd exchange the code for tokens
      // For now, we'll return mock data that matches what the auth context expects
      return {
        accessToken: 'oauth-token',
        accountId: `${provider}-user-${Date.now()}`,
        accountName: `${provider} User`,
        platform: data.platform
      };
    } else {
      // For social account connection, use social-accounts OAuth callback
      const response: AxiosResponse<any> = await this.api.post('/social-accounts/oauth/callback', {
        code: data.code,
        state: data.state,
        platform: data.platform,
        appId: data.socialAppId
      });
      
      // Extract social account from response
      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'OAuth callback failed');
      }
    }
  }

  // Publishing endpoints - /publishing/*
  async getPublishingJobs(page = 1, limit = 20): Promise<PaginatedResponse<PublishingJob>> {
    const response: AxiosResponse<PaginatedResponse<PublishingJob>> = await this.api.get(
      `/publishing/jobs?page=${page}&limit=${limit}`
    );
    return response.data;
  }

  async getPublishingJob(id: string): Promise<PublishingJob> {
    const response: AxiosResponse<PublishingJob> = await this.api.get(`/publishing/jobs/${id}`);
    return response.data;
  }

  async createPublishingJob(jobData: CreatePublishingJobDto): Promise<PublishingJob> {
    const response: AxiosResponse<PublishingJob> = await this.api.post('/publishing/jobs', jobData);
    return response.data;
  }

  async createBatchJob(jobData: CreateBatchJobDto): Promise<PublishingJob> {
    const response: AxiosResponse<PublishingJob> = await this.api.post('/publishing/batch-jobs', jobData);
    return response.data;
  }

  async cancelPublishingJob(id: string): Promise<PublishingJob> {
    const response: AxiosResponse<PublishingJob> = await this.api.post(`/publishing/jobs/${id}/cancel`);
    return response.data;
  }

  async retryPublishingJob(id: string): Promise<PublishingJob> {
    const response: AxiosResponse<PublishingJob> = await this.api.post(`/publishing/jobs/${id}/retry`);
    return response.data;
  }

  async getPublishingTask(id: string): Promise<PublishingTask> {
    const response: AxiosResponse<PublishingTask> = await this.api.get(`/publishing/tasks/${id}`);
    return response.data;
  }

  async retryPublishingTask(id: string): Promise<PublishingTask> {
    const response: AxiosResponse<PublishingTask> = await this.api.post(`/publishing/tasks/${id}/retry`);
    return response.data;
  }

  // Dashboard endpoints - /dashboard/*
  async getDashboardStats(): Promise<DashboardStats> {
    const response: AxiosResponse<DashboardStats> = await this.api.get('/dashboard/stats');
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;
