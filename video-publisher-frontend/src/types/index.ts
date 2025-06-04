// User and Authentication Types
export interface User {
  id: string;
  email: string;
  username: string;
  name?: string; // Added missing name property
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

// Video Types
export interface Video {
  id: string;
  title: string;
  description: string;
  filename: string;
  filepath: string;
  duration?: number;
  fileSize?: number; // Added missing fileSize property
  thumbnailUrl?: string;
  metadata?: Record<string, any>;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface VideoUploadRequest {
  title: string;
  description: string;
  file: File;
}

// Social Account Types
export interface SocialAccount {
  id: string;
  platform: 'youtube' | 'tiktok' | 'instagram' | 'facebook';
  platformUserId: string;
  platformUsername: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  isActive: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

// Publishing Job Types
export interface PublishingTask {
  id: string;
  videoId: string;
  socialAccountId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  platform: string;
  scheduledFor?: string;
  publishedAt?: string;
  platformPostId?: string;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  updatedAt: string;
  video?: Video;
  socialAccount?: SocialAccount;
}

export interface BatchJob {
  id: string;
  name: string;
  description?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
  tasks: PublishingTask[];
}

export interface CreateBatchJobRequest {
  name: string;
  description?: string;
  videoIds: string[];
  socialAccountIds: string[];
  scheduledFor?: string;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Dashboard Statistics
export interface DashboardStats {
  totalVideos: number;
  totalSocialAccounts: number;
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  recentActivity: {
    date: string;
    jobsCompleted: number;
    jobsFailed: number;
  }[];
}
