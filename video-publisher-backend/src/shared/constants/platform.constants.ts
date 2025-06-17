import { SocialPlatform } from '@prisma/client';

export const SOCIAL_PLATFORM_CONFIGS = {
  [SocialPlatform.FACEBOOK]: {
    name: 'Facebook',
    color: '#1877f2',
    scopes: ['email', 'public_profile', 'pages_manage_posts', 'pages_read_engagement'],
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    userInfoUrl: 'https://graph.facebook.com/me',
  },
  [SocialPlatform.INSTAGRAM]: {
    name: 'Instagram',
    color: '#e4405f',
    scopes: ['user_profile', 'user_media'],
    authUrl: 'https://api.instagram.com/oauth/authorize',
    tokenUrl: 'https://api.instagram.com/oauth/access_token',
    userInfoUrl: 'https://graph.instagram.com/me',
  },
  [SocialPlatform.YOUTUBE]: {
    name: 'YouTube',
    color: '#ff0000',
    scopes: ['https://www.googleapis.com/auth/youtube', 'https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'],
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v1/userinfo',
  },
  [SocialPlatform.TIKTOK]: {
    name: 'TikTok',
    color: '#000000',
    scopes: ['user.info.basic', 'video.list', 'video.upload'],
    authUrl: 'https://www.tiktok.com/v2/auth/authorize',
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
    userInfoUrl: 'https://open.tiktokapis.com/v2/user/info/',
  },
  [SocialPlatform.X]: {
    name: 'X (Twitter)',
    color: '#000000',
    scopes: ['tweet.read', 'users.read', 'tweet.write'],
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    userInfoUrl: 'https://api.twitter.com/2/users/me',
  },
  [SocialPlatform.ZALO]: {
    name: 'Zalo',
    color: '#0068ff',
    scopes: ['id', 'name', 'picture'],
    authUrl: 'https://oauth.zaloapp.com/v4/permission',
    tokenUrl: 'https://oauth.zaloapp.com/v4/access_token',
    userInfoUrl: 'https://openapi.zalo.me/v2.0/me',
  },
  [SocialPlatform.TELEGRAM]: {
    name: 'Telegram',
    color: '#0088cc',
    scopes: ['bot'],
    authUrl: 'https://oauth.telegram.org/auth',
    tokenUrl: 'https://oauth.telegram.org/auth/request',
    userInfoUrl: 'https://api.telegram.org/bot',
  },
};

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

export const FILE_UPLOAD_LIMITS = {
  AVATAR: {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  },
} as const;

export const TOKEN_EXPIRY = {
  PASSWORD_RESET: 60 * 60 * 1000, // 1 hour
  JWT_ACCESS: '24h',
} as const;

export const CIRCUIT_BREAKER_CONFIG = {
  MAX_FAILURES: 5,
  RESET_TIMEOUT: 60000, // 1 minute
} as const;