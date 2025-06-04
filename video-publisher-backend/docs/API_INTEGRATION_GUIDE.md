# Social Media API Integration Guide

This guide provides comprehensive instructions for setting up and using the real social media API integrations for YouTube Shorts, Instagram Reels, TikTok, and Facebook Reels.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [OAuth 2.0 Setup](#oauth-20-setup)
3. [Platform-Specific Setup](#platform-specific-setup)
4. [Environment Configuration](#environment-configuration)
5. [API Usage](#api-usage)
6. [Error Handling](#error-handling)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database running
- Valid developer accounts on all target platforms
- SSL certificate for production (required for OAuth redirects)

## OAuth 2.0 Setup

### Authentication Flow Overview

1. **Authorization**: Redirect user to platform's OAuth authorization endpoint
2. **Code Exchange**: Exchange authorization code for access token
3. **Token Storage**: Securely store access and refresh tokens
4. **Token Refresh**: Automatically refresh expired tokens

### Implementation

```typescript
import { OAuthAuthorizationService } from './auth/oauth-authorization.service';

// Generate authorization URL
const authService = new OAuthAuthorizationService(configService);
const result = authService.generateAuthorizationUrl('youtube', 'state-123');

// Exchange code for tokens
const tokenResult = await authService.exchangeCodeForToken('youtube', 'auth-code');
```

## Platform-Specific Setup

### YouTube (Google)

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create new project or select existing one

2. **Enable YouTube Data API v3**
   - Navigate to APIs & Services > Library
   - Search for "YouTube Data API v3"
   - Click "Enable"

3. **Create OAuth 2.0 Credentials**
   - Go to APIs & Services > Credentials
   - Click "Create Credentials" > "OAuth 2.0 Client ID"
   - Application type: Web application
   - Authorized redirect URIs: `https://yourdomain.com/auth/google/callback`

4. **Required Scopes**
   ```
   https://www.googleapis.com/auth/youtube.upload
   https://www.googleapis.com/auth/youtube
   ```

5. **Environment Variables**
   ```bash
   GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="your-client-secret"
   GOOGLE_REDIRECT_URI="https://yourdomain.com/auth/google/callback"
   ```

### Facebook/Instagram

1. **Create Facebook App**
   - Go to [Facebook Developers](https://developers.facebook.com/)
   - Create new app with "Business" type

2. **Add Required Products**
   - Facebook Login
   - Instagram Basic Display
   - Instagram Content Publishing

3. **Configure App Settings**
   - Valid OAuth Redirect URIs: `https://yourdomain.com/auth/facebook/callback`
   - App Domains: `yourdomain.com`

4. **Required Permissions**
   ```
   pages_manage_posts
   pages_read_engagement
   pages_show_list
   instagram_basic
   instagram_content_publish
   publish_video
   ```

5. **Environment Variables**
   ```bash
   FACEBOOK_APP_ID="your-app-id"
   FACEBOOK_APP_SECRET="your-app-secret"
   FACEBOOK_REDIRECT_URI="https://yourdomain.com/auth/facebook/callback"
   ```

### TikTok

1. **Create TikTok Developer Account**
   - Go to [TikTok Developers](https://developers.tiktok.com/)
   - Apply for developer access

2. **Create App**
   - Navigate to "Manage apps"
   - Create new app with required details

3. **Configure OAuth Settings**
   - Redirect URI: `https://yourdomain.com/auth/tiktok/callback`
   - Scopes: `video.upload`, `video.publish`, `user.info.basic`

4. **Environment Variables**
   ```bash
   TIKTOK_CLIENT_ID="your-client-id"
   TIKTOK_CLIENT_SECRET="your-client-secret"
   TIKTOK_REDIRECT_URI="https://yourdomain.com/auth/tiktok/callback"
   ```

## Environment Configuration

Copy `.env.example` to `.env` and configure all required variables:

```bash
cp .env.example .env
```

### Required Configuration

```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/video_publisher"

# OAuth Credentials (see platform-specific setup above)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
FACEBOOK_APP_ID="..."
FACEBOOK_APP_SECRET="..."
TIKTOK_CLIENT_ID="..."
TIKTOK_CLIENT_SECRET="..."

# Security
JWT_SECRET="your-secure-random-string"

# File Upload
UPLOAD_DIRECTORY="./uploads"
MAX_FILE_SIZE=268435456  # 256MB
```

## API Usage

### 1. Initialize OAuth Flow

```typescript
POST /auth/oauth/authorize
Content-Type: application/json

{
  "platform": "youtube",
  "state": "optional-state-parameter"
}

Response:
{
  "authorizationUrl": "https://accounts.google.com/o/oauth2/auth?..."
}
```

### 2. Handle OAuth Callback

```typescript
POST /auth/oauth/callback
Content-Type: application/json

{
  "platform": "youtube",
  "code": "authorization-code-from-redirect",
  "state": "optional-state-parameter"
}

Response:
{
  "success": true,
  "accessToken": "...",
  "refreshToken": "...",
  "expiresIn": 3600
}
```

### 3. Upload Video

```typescript
POST /publishing/upload
Content-Type: multipart/form-data

{
  "video": File,
  "title": "Video Title",
  "description": "Video Description",
  "platforms": ["youtube", "instagram", "tiktok", "facebook"],
  "scheduledAt": "2024-01-01T12:00:00Z" // Optional
}

Response:
{
  "success": true,
  "results": [
    {
      "platform": "youtube",
      "success": true,
      "platformPostId": "video-id"
    }
  ]
}
```

## Error Handling

### Error Types

The system includes comprehensive error handling with specific error types:

- **TokenExpiredError**: OAuth token has expired
- **RateLimitError**: Platform rate limit exceeded
- **VideoValidationError**: Video doesn't meet platform requirements
- **NetworkError**: Network connectivity issues
- **PlatformAPIError**: Platform-specific API errors

### Retry Logic

Automatic retry with exponential backoff for:
- Network errors (ECONNRESET, ETIMEDOUT)
- Temporary server errors (5xx status codes)
- Rate limit errors (with appropriate delays)

### Rate Limiting

Platform-specific rate limits are enforced:
- **YouTube**: 10,000 quota units per day
- **Facebook/Instagram**: 200 requests per hour
- **TikTok**: 100 requests per hour

## Testing

### Unit Tests

Run the comprehensive test suite:

```bash
npm test
```

### Integration Tests

Test with real API credentials (use development accounts):

```bash
# Set test environment variables
export MOCK_UPLOADS=false
export TEST_VIDEO_PATH="./test-assets/sample.mp4"

npm run test:e2e
```

### Manual Testing

1. **Test OAuth Flow**
   ```bash
   curl -X POST http://localhost:3000/auth/oauth/authorize \
     -H "Content-Type: application/json" \
     -d '{"platform": "youtube"}'
   ```

2. **Test Video Upload**
   ```bash
   curl -X POST http://localhost:3000/publishing/upload \
     -H "Authorization: Bearer your-jwt-token" \
     -F "video=@test-video.mp4" \
     -F "title=Test Video" \
     -F "platforms=youtube"
   ```

## Video Requirements

### YouTube Shorts
- **Duration**: ≤ 60 seconds (3600 for regular videos)
- **File Size**: ≤ 256 GB
- **Resolution**: 1080p recommended
- **Aspect Ratio**: 9:16 (vertical) recommended
- **Formats**: MP4, MOV, AVI, WMV, FLV, WebM

### Instagram Reels
- **Duration**: ≤ 90 seconds
- **File Size**: ≤ 4 GB
- **Resolution**: 1080p recommended
- **Aspect Ratio**: 9:16 (vertical) required
- **Formats**: MP4, MOV

### TikTok
- **Duration**: ≤ 180 seconds
- **File Size**: ≤ 287.6 MB
- **Resolution**: 720p minimum, 1080p recommended
- **Aspect Ratio**: 9:16 (vertical) preferred
- **Formats**: MP4, MOV, MPEG, 3GP, AVI

### Facebook Reels
- **Duration**: ≤ 90 seconds
- **File Size**: ≤ 4 GB
- **Resolution**: 720p minimum
- **Aspect Ratio**: 9:16 (vertical) preferred
- **Formats**: MP4, MOV

## Troubleshooting

### Common Issues

1. **OAuth Redirect Mismatch**
   - Ensure redirect URIs match exactly in platform settings
   - Use HTTPS in production

2. **Token Refresh Failures**
   - Check if refresh tokens are properly stored
   - Verify OAuth scopes include offline access

3. **Video Upload Failures**
   - Validate video meets platform requirements
   - Check file permissions and paths
   - Verify sufficient API quota remaining

4. **Rate Limit Errors**
   - Implement proper backoff strategies
   - Monitor quota usage
   - Consider distributing uploads across time

### Debug Mode

Enable debug logging:

```bash
export LOG_LEVEL=debug
npm start
```

### Health Checks

Monitor system health:

```bash
curl http://localhost:3000/health
```

### API Documentation

Access interactive API documentation:

```
http://localhost:3000/docs
```

## Security Considerations

1. **Token Storage**: Tokens are encrypted in the database
2. **HTTPS Required**: OAuth redirects require HTTPS in production
3. **Rate Limiting**: API endpoints are rate-limited
4. **Input Validation**: All inputs are validated and sanitized
5. **Error Handling**: Errors don't expose sensitive information

## Support

For additional support:
- Check the logs for detailed error messages
- Review platform-specific developer documentation
- Test with minimal examples first
- Ensure all environment variables are correctly configured
