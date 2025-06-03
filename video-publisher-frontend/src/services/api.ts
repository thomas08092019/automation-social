import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  User, 
  AuthResponse, 
  LoginRequest, 
  RegisterRequest,
  Video,
  VideoUploadRequest,
  SocialAccount,
  PublishingTask,
  BatchJob,
  CreateBatchJobRequest,
  ApiResponse,
  PaginatedResponse,
  DashboardStats
} from '../types';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
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
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await this.api.post('/auth/login', credentials);
    return response.data;
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await this.api.post('/auth/register', userData);
    return response.data;
  }

  async getProfile(): Promise<User> {
    const response: AxiosResponse<ApiResponse<User>> = await this.api.get('/auth/profile');
    return response.data.data;
  }

  // Videos
  async getVideos(page = 1, limit = 10): Promise<PaginatedResponse<Video>> {
    const response: AxiosResponse<PaginatedResponse<Video>> = await this.api.get(
      `/videos?page=${page}&limit=${limit}`
    );
    return response.data;
  }

  async getVideo(id: string): Promise<Video> {
    const response: AxiosResponse<ApiResponse<Video>> = await this.api.get(`/videos/${id}`);
    return response.data.data;
  }

  async uploadVideo(videoData: VideoUploadRequest): Promise<Video> {
    const formData = new FormData();
    formData.append('title', videoData.title);
    formData.append('description', videoData.description);
    formData.append('file', videoData.file);

    const response: AxiosResponse<ApiResponse<Video>> = await this.api.post('/videos/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  }

  async updateVideo(id: string, updates: Partial<Video>): Promise<Video> {
    const response: AxiosResponse<ApiResponse<Video>> = await this.api.patch(`/videos/${id}`, updates);
    return response.data.data;
  }

  async deleteVideo(id: string): Promise<void> {
    await this.api.delete(`/videos/${id}`);
  }

  // Social Accounts
  async getSocialAccounts(): Promise<SocialAccount[]> {
    const response: AxiosResponse<ApiResponse<SocialAccount[]>> = await this.api.get('/social-accounts');
    return response.data.data;
  }

  async getSocialAccount(id: string): Promise<SocialAccount> {
    const response: AxiosResponse<ApiResponse<SocialAccount>> = await this.api.get(`/social-accounts/${id}`);
    return response.data.data;
  }

  async connectSocialAccount(platform: string): Promise<{ authUrl: string }> {
    const response: AxiosResponse<{ authUrl: string }> = await this.api.post(`/social-accounts/connect/${platform}`);
    return response.data;
  }

  async disconnectSocialAccount(id: string): Promise<void> {
    await this.api.delete(`/social-accounts/${id}`);
  }

  async refreshSocialAccountToken(id: string): Promise<SocialAccount> {
    const response: AxiosResponse<ApiResponse<SocialAccount>> = await this.api.post(`/social-accounts/${id}/refresh`);
    return response.data.data;
  }

  // Publishing Jobs
  async getJobs(page = 1, limit = 10): Promise<PaginatedResponse<BatchJob>> {
    const response: AxiosResponse<PaginatedResponse<BatchJob>> = await this.api.get(
      `/publishing/jobs?page=${page}&limit=${limit}`
    );
    return response.data;
  }

  async getJob(id: string): Promise<BatchJob> {
    const response: AxiosResponse<ApiResponse<BatchJob>> = await this.api.get(`/publishing/jobs/${id}`);
    return response.data.data;
  }

  async createBatchJob(jobData: CreateBatchJobRequest): Promise<BatchJob> {
    const response: AxiosResponse<ApiResponse<BatchJob>> = await this.api.post('/publishing/batch', jobData);
    return response.data.data;
  }

  async cancelJob(id: string): Promise<BatchJob> {
    const response: AxiosResponse<ApiResponse<BatchJob>> = await this.api.post(`/publishing/jobs/${id}/cancel`);
    return response.data.data;
  }

  async retryJob(id: string): Promise<BatchJob> {
    const response: AxiosResponse<ApiResponse<BatchJob>> = await this.api.post(`/publishing/jobs/${id}/retry`);
    return response.data.data;
  }

  async getTask(id: string): Promise<PublishingTask> {
    const response: AxiosResponse<ApiResponse<PublishingTask>> = await this.api.get(`/publishing/tasks/${id}`);
    return response.data.data;
  }

  async retryTask(id: string): Promise<PublishingTask> {
    const response: AxiosResponse<ApiResponse<PublishingTask>> = await this.api.post(`/publishing/tasks/${id}/retry`);
    return response.data.data;
  }

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    const response: AxiosResponse<ApiResponse<DashboardStats>> = await this.api.get('/dashboard/stats');
    return response.data.data;
  }
}

export const apiService = new ApiService();
export default apiService;
