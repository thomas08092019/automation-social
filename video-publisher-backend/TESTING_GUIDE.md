# Video Publisher Backend Testing Guide

This guide will walk you through testing the video publisher backend system.

## Prerequisites

1. **Node.js** (v16 or higher)
2. **PostgreSQL** (v12 or higher)
3. **npm** or **yarn**

## Quick Setup

### Windows (PowerShell)
```powershell
.\setup.ps1
```

### Linux/macOS (Bash)
```bash
chmod +x setup.sh
./setup.sh
```

### Manual Setup
```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Create uploads directory
mkdir uploads

# Build project
npm run build
```

## Database Setup

1. **Install PostgreSQL** if not already installed
2. **Create database**:
   ```sql
   CREATE DATABASE video_publisher_db;
   ```
3. **Update .env file** with your database connection:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/video_publisher_db?schema=public"
   ```
4. **Run migrations**:
   ```bash
   npx prisma migrate dev --name init
   ```

## Testing the API

### 1. Start the Server
```bash
npm run start:dev
```
The server will start at `http://localhost:3001`

### 2. Test Basic Endpoints

#### Health Check
```bash
curl http://localhost:3001
# Expected: "Hello World!"
```

#### Register a User
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

#### Login
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```
Save the `accessToken` from the response for subsequent requests.

#### Get User Profile
```bash
curl -X GET http://localhost:3001/users/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3. Test Social Account Management

#### Connect a Social Account
```bash
curl -X POST http://localhost:3001/social-accounts \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "YOUTUBE_SHORTS",
    "platformAccountId": "test_youtube_channel",
    "username": "TestYouTubeChannel",
    "accessToken": "mock_youtube_token",
    "scopes": ["youtube.upload"]
  }'
```

#### List Connected Accounts
```bash
curl -X GET http://localhost:3001/social-accounts \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 4. Test Video Upload

#### Upload a Video
```bash
curl -X POST http://localhost:3001/videos/upload \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "video=@path/to/your/video.mp4" \
  -F "title=Test Video" \
  -F "description=This is a test video"
```

#### List Videos
```bash
curl -X GET http://localhost:3001/videos \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 5. Test Publishing System

#### Create a Publishing Job
```bash
curl -X POST http://localhost:3001/publishing/jobs \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Publishing Campaign",
    "description": "Testing multi-platform publishing",
    "tasks": [
      {
        "videoId": "YOUR_VIDEO_ID",
        "socialAccountId": "YOUR_SOCIAL_ACCOUNT_ID"
      }
    ]
  }'
```

#### List Publishing Jobs
```bash
curl -X GET http://localhost:3001/publishing/jobs \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Execute a Publishing Job
```bash
curl -X POST http://localhost:3001/publishing/jobs/JOB_ID/execute \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Check Queue Status
```bash
curl -X GET http://localhost:3001/publishing/queue/status \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Testing Workflow Example

Here's a complete workflow example:

```bash
# 1. Register user
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@test.com","password":"demo123456"}')

echo "Registration: $REGISTER_RESPONSE"

# 2. Login and get token
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@test.com","password":"demo123456"}')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.accessToken')
echo "Token: $TOKEN"

# 3. Connect social accounts
YOUTUBE_RESPONSE=$(curl -s -X POST http://localhost:3001/social-accounts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "YOUTUBE_SHORTS",
    "platformAccountId": "test_yt",
    "username": "TestYT",
    "accessToken": "mock_yt_token",
    "scopes": ["youtube.upload"]
  }')

FACEBOOK_RESPONSE=$(curl -s -X POST http://localhost:3001/social-accounts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "FACEBOOK_REELS",
    "platformAccountId": "test_fb",
    "username": "TestFB",
    "accessToken": "mock_fb_token",
    "scopes": ["pages_manage_posts"]
  }')

# 4. Upload video (you need a real video file)
# VIDEO_RESPONSE=$(curl -s -X POST http://localhost:3001/videos/upload \
#   -H "Authorization: Bearer $TOKEN" \
#   -F "video=@test_video.mp4" \
#   -F "title=Demo Video" \
#   -F "description=Test video for publishing")

# 5. Create and execute publishing job
# (Use actual IDs from previous responses)

echo "Setup complete! Check the responses for IDs to use in publishing jobs."
```

## Expected Behavior

### Successful Operations
- ✅ User registration and login work
- ✅ Social account connections are stored
- ✅ Video uploads are processed and stored
- ✅ Publishing jobs are created and queued
- ✅ Queue processes tasks in background
- ✅ Task status updates are tracked

### Error Handling
- ❌ Invalid credentials return 401
- ❌ Missing required fields return 400
- ❌ Duplicate email registration returns 409
- ❌ Non-existent resources return 404
- ❌ Invalid file types are rejected

## Monitoring and Debugging

### Check Application Logs
The application logs will show:
- API requests and responses
- Database operations
- Queue processing status
- Error messages and stack traces

### Database Verification
Connect to PostgreSQL and verify data:
```sql
-- Check users
SELECT * FROM users;

-- Check social accounts
SELECT * FROM social_accounts;

-- Check videos
SELECT * FROM videos;

-- Check publishing jobs and tasks
SELECT pj.title, pt.status, sa.platform, v.title as video_title
FROM publishing_jobs pj
JOIN publishing_tasks pt ON pj.id = pt."publishingJobId"
JOIN social_accounts sa ON pt."socialAccountId" = sa.id
JOIN videos v ON pt."videoId" = v.id;
```

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Verify PostgreSQL is running
   - Check DATABASE_URL in .env
   - Ensure database exists

2. **Build Errors**
   - Run `npm install` to ensure all dependencies
   - Check Node.js version (v16+)
   - Clear `node_modules` and reinstall if needed

3. **File Upload Issues**
   - Check file size (max 100MB)
   - Verify file type (mp4, avi, mov, wmv, flv)
   - Ensure `uploads/` directory exists

4. **Authentication Issues**
   - Verify JWT_SECRET is set in .env
   - Check token expiration
   - Ensure Bearer token format: `Bearer YOUR_TOKEN`

## Next Steps

Once basic testing is complete:

1. **Implement OAuth 2.0** for real social media authentication
2. **Add RabbitMQ** for robust queue management
3. **Integrate actual social media APIs**:
   - YouTube Data API v3
   - Facebook Graph API
   - Instagram Basic Display API
   - TikTok API for Business
4. **Add video processing** (thumbnails, format conversion)
5. **Implement scheduling** for delayed publishing
6. **Add comprehensive error handling and retry logic**
7. **Create admin dashboard** for monitoring
