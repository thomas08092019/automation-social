# Social Media API Integration - Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying the social media video publisher with real API integrations for YouTube, Facebook Reels, Instagram Reels, and TikTok.

## Prerequisites

### 1. Platform API Credentials
Before deploying, ensure you have obtained API credentials for all platforms:

#### YouTube (Google Cloud Console)
- Google Client ID
- Google Client Secret
- YouTube Data API v3 enabled
- OAuth 2.0 redirect URI configured

#### Facebook/Instagram (Meta for Developers)
- Facebook App ID
- Facebook App Secret
- Instagram Basic Display API access
- Facebook Graph API permissions for video publishing
- Business verification (required for video publishing)

#### TikTok (TikTok for Developers)
- TikTok Client ID
- TikTok Client Secret
- TikTok Business API access
- OAuth 2.0 redirect URI configured

### 2. Database Setup
```bash
# Install PostgreSQL
# Create database
createdb video_publisher

# Run Prisma migrations
npx prisma migrate deploy
npx prisma generate
```

### 3. Environment Configuration
Copy `.env.example` to `.env` and configure all required variables:

```bash
cp .env.example .env
```

Key configurations:
- Database connection string
- All platform API credentials
- JWT secret for authentication
- RabbitMQ connection (for job queues)
- Rate limiting quotas
- File upload settings

## Deployment Steps

### Step 1: Install Dependencies
```bash
cd video-publisher-backend
npm install
```

### Step 2: Database Migration
```bash
# Apply database schema
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

### Step 3: Build Application
```bash
npm run build
```

### Step 4: Start Services

#### Development Mode
```bash
npm run start:dev
```

#### Production Mode
```bash
npm run start:prod
```

### Step 5: Verify API Integration
Use the built-in API test endpoints to verify platform connections:

```bash
# Check platform configuration status
curl http://localhost:3000/api-test/platforms/status

# Check rate limit status for a platform
curl http://localhost:3000/api-test/rate-limits/youtube

# Test video validation
curl -X POST http://localhost:3000/api-test/validate-video \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "youtube",
    "videoPath": "./test-video.mp4",
    "metadata": {"duration": 30, "size": 1048576}
  }'
```

## Production Considerations

### 1. Rate Limiting
Configure appropriate rate limits based on your API quotas:
- YouTube: 10,000 requests/day
- Facebook/Instagram: 200 requests/hour per app
- TikTok: 100 requests/hour per app

### 2. Error Handling and Monitoring
- Set up application monitoring (logs, metrics)
- Configure error alerting for failed uploads
- Implement health checks for API endpoints

### 3. Security
- Use environment variables for all secrets
- Implement proper CORS configuration
- Set up rate limiting for public endpoints
- Use HTTPS in production

### 4. Scalability
- Consider using Redis for rate limiting in multi-instance deployments
- Implement job queues (RabbitMQ) for async video processing
- Set up load balancing if needed

## Testing

### Unit Tests
```bash
npm run test
```

### Integration Tests
```bash
npm run test:e2e
```

### API Integration Tests
Use the `/api-test` endpoints to verify real API connectivity before going live.

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify API credentials in `.env`
   - Check OAuth redirect URIs match configuration
   - Ensure proper platform app permissions

2. **Rate Limiting**
   - Monitor rate limit usage via API endpoints
   - Adjust quotas in environment configuration
   - Implement proper retry logic with exponential backoff

3. **Video Upload Failures**
   - Verify video format and size requirements
   - Check platform-specific validation rules
   - Monitor network connectivity and timeouts

4. **Database Connection Issues**
   - Verify PostgreSQL is running
   - Check database connection string
   - Ensure proper database permissions

### Logs and Debugging
- Application logs are available in the console output
- Use `LOG_LEVEL=debug` for detailed debugging
- Platform-specific errors are logged with context

## API Reference

### Upload Endpoints
- `POST /publishing/upload-video` - Upload video to social platforms
- `POST /publishing/batch-upload` - Batch upload to multiple platforms
- `GET /publishing/jobs/:id` - Get upload job status

### Test Endpoints
- `GET /api-test/platforms/status` - Check platform configuration
- `GET /api-test/rate-limits/:platform` - Check rate limit status
- `POST /api-test/validate-video` - Test video validation
- `POST /api-test/test-upload` - Test platform upload (use carefully)

## Support

For issues with platform APIs:
- YouTube: Google Cloud Console support
- Facebook/Instagram: Meta for Developers support
- TikTok: TikTok for Developers support

For application issues:
- Check logs for error details
- Verify environment configuration
- Test individual platform connections using test endpoints
