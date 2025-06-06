// Enums matching backend
export enum SocialPlatform {
  FACEBOOK = 'FACEBOOK',
  INSTAGRAM = 'INSTAGRAM',
  TIKTOK = 'TIKTOK',
  YOUTUBE = 'YOUTUBE',
  TWITTER = 'TWITTER'
}

export enum AccountType {
  PAGE = 'PAGE',
  GROUP = 'GROUP',
  PROFILE = 'PROFILE',
  BUSINESS = 'BUSINESS',
  CREATOR = 'CREATOR'
}

export enum VideoStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  FAILED_PROCESSING = 'FAILED_PROCESSING'
}

export enum PublishingJobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PARTIALLY_COMPLETED = 'PARTIALLY_COMPLETED'
}

export enum PublishingTaskStatus {
  PENDING = 'PENDING',
  UPLOADING = 'UPLOADING',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING'
}

// User and Authentication Types
export interface User {
  id: string;
  email: string;
  username: string;
  profilePicture?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
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

export interface SocialLoginRequest {
  provider: string;
  accessToken: string;
  email: string;
  username: string;
  providerId: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Video Types
export interface Video {
  id: string;
  title: string;
  description?: string;
  filePath: string;
  thumbnailPath?: string;
  duration?: number;
  status: VideoStatus;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface VideoUploadRequest {
  title: string;
  description?: string;
  file: File;
}

export interface CreateVideoDto {
  title: string;
  description?: string;
}

export interface UpdateVideoDto {
  title?: string;
  description?: string;
}

// Social Account Types
export interface SocialAccount {
  id: string;
  platform: SocialPlatform;
  accountType: AccountType;
  accountId: string;
  accountName: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  profilePicture?: string;
  isActive: boolean;
  userId: string;
  socialAppId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectSocialAccountDto {
  platform: SocialPlatform;
  socialAppId: string;
  authorizationCode: string;
  redirectUri: string;
}

// Social App Types
export interface SocialApp {
  id: string;
  name: string;
  platform: SocialPlatform;
  appId: string;
  appSecret: string;
  redirectUri: string;
  isDefault: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSocialAppDto {
  name: string;
  platform: SocialPlatform;
  appId: string;
  appSecret: string;
  redirectUri: string;
  isDefault?: boolean;
}

// Publishing Job Types
export interface PublishingTask {
  id: string;
  status: PublishingTaskStatus;
  error?: string;
  jobId: string;
  videoId: string;
  socialAccountId: string;
  createdAt: string;
  updatedAt: string;
  video?: Video;
  socialAccount?: SocialAccount;
}

export interface PublishingJob {
  id: string;
  name: string;
  description?: string;
  status: PublishingJobStatus;
  scheduleTime?: string;
  userId: string;
  tasks: PublishingTask[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePublishingJobDto {
  name: string;
  description?: string;
  videoId: string;
  socialAccountIds: string[];
  scheduleTime?: string;
}

export interface CreateBatchJobDto {
  name: string;
  description?: string;
  videoIds: string[];
  socialAccountIds: string[];
  scheduleTime?: string;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  status?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ErrorResponse {
  message: string;
  error?: string;
  statusCode: number;
}

// Dashboard Statistics
export interface DashboardStats {
  totalVideos: number;
  totalSocialAccounts: number;
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  recentActivity: Array<{
    date: string;
    jobsCompleted: number;
    jobsFailed: number;
  }>;
}

// OAuth Authorization Types
export interface OAuthAuthorizationUrl {
  authorizationUrl: string;
  state: string;
  platform: SocialPlatform;
}

export interface OAuthCallbackDto {
  code: string;
  state: string;
  platform: SocialPlatform;
  socialAppId: string;
}

// File Upload Types
export interface FileUploadResponse {
  filePath: string;
  originalName: string;
  size: number;
  mimeType: string;
}

// Utility Types
export type SocialPlatformKey = keyof typeof SocialPlatform;
export type AccountTypeKey = keyof typeof AccountType;
export type VideoStatusKey = keyof typeof VideoStatus;
export type PublishingJobStatusKey = keyof typeof PublishingJobStatus;
export type PublishingTaskStatusKey = keyof typeof PublishingTaskStatus;
