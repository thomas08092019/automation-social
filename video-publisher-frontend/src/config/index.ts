
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const config = {
  api: {
    baseUrl: API_BASE_URL,
    timeout: 30000,
  },
  auth: {
    tokenKey: 'access_token',
    refreshTokenKey: 'refresh_token',
  },
  upload: {
    maxFileSize: 500 * 1024 * 1024, // 500MB
    allowedVideoTypes: [
      'video/mp4',
      'video/avi',
      'video/mov',
      'video/wmv',
      'video/flv',
      'video/webm',
      'video/mkv'
    ],
    allowedImageTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp'
    ],
  },
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },
} as const;

export default config;
