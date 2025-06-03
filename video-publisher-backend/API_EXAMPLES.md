# Video Publisher Backend API Testing

## Example API Calls

### 1. User Registration and Authentication

```bash
# Register a new user
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "password123"
  }'

# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com", 
    "password": "password123"
  }'

# Save the token from login response
export JWT_TOKEN="your_jwt_token_here"
```

### 2. Social Account Management

```bash
# Connect a YouTube account (example - you need real OAuth tokens)
curl -X POST http://localhost:3001/social-accounts \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "YOUTUBE_SHORTS",
    "platformAccountId": "UC1234567890",
    "username": "MyYouTubeChannel",
    "accessToken": "youtube_access_token",
    "scopes": ["youtube.upload", "youtube.force-ssl"]
  }'

# Connect a Facebook account
curl -X POST http://localhost:3001/social-accounts \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "FACEBOOK_REELS",
    "platformAccountId": "1234567890",
    "username": "MyFacebookPage",
    "accessToken": "facebook_access_token",
    "scopes": ["pages_manage_posts", "pages_read_engagement"]
  }'

# List all connected accounts
curl -X GET http://localhost:3001/social-accounts \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### 3. Video Upload and Management

```bash
# Upload a video (replace with actual video file path)
curl -X POST http://localhost:3001/videos/upload \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "video=@/path/to/your/video.mp4" \
  -F "title=My Awesome Video" \
  -F "description=This is a test video for multi-platform publishing" \
  -F "tags[]=funny" \
  -F "tags[]=viral" \
  -F "tags[]=trending"

# List all videos
curl -X GET http://localhost:3001/videos \
  -H "Authorization: Bearer $JWT_TOKEN"

# Get specific video details
curl -X GET http://localhost:3001/videos/VIDEO_ID \
  -H "Authorization: Bearer $JWT_TOKEN"

# Update video metadata
curl -X PUT http://localhost:3001/videos/VIDEO_ID \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Video Title",
    "description": "Updated description",
    "tags": ["updated", "tags"]
  }'
```

### 4. Publishing Jobs - Multi-Platform Publishing

```bash
# Create a publishing job to post videos to multiple platforms
curl -X POST http://localhost:3001/publishing/jobs \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Multi-Platform Campaign #1",
    "description": "Publishing videos to YouTube, Facebook, and Instagram",
    "tasks": [
      {
        "videoId": "VIDEO_ID_1",
        "socialAccountId": "YOUTUBE_ACCOUNT_ID"
      },
      {
        "videoId": "VIDEO_ID_1", 
        "socialAccountId": "FACEBOOK_ACCOUNT_ID"
      },
      {
        "videoId": "VIDEO_ID_2",
        "socialAccountId": "INSTAGRAM_ACCOUNT_ID"
      }
    ]
  }'

# List all publishing jobs
curl -X GET http://localhost:3001/publishing/jobs \
  -H "Authorization: Bearer $JWT_TOKEN"

# Get specific job details
curl -X GET http://localhost:3001/publishing/jobs/JOB_ID \
  -H "Authorization: Bearer $JWT_TOKEN"

# Execute a publishing job
curl -X POST http://localhost:3001/publishing/jobs/JOB_ID/execute \
  -H "Authorization: Bearer $JWT_TOKEN"

# Retry failed tasks in a job
curl -X POST http://localhost:3001/publishing/jobs/JOB_ID/retry \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### 5. Complete Example Workflow

```bash
#!/bin/bash

# Set your API base URL
API_BASE="http://localhost:3001"

echo "=== 1. Register User ==="
REGISTER_RESPONSE=$(curl -s -X POST $API_BASE/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@example.com",
    "password": "demo123456"
  }')

echo $REGISTER_RESPONSE

echo -e "\n=== 2. Login ==="
LOGIN_RESPONSE=$(curl -s -X POST $API_BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@example.com",
    "password": "demo123456"
  }')

# Extract JWT token (requires jq)
JWT_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.accessToken')
echo "JWT Token: $JWT_TOKEN"

echo -e "\n=== 3. Get User Profile ==="
curl -s -X GET $API_BASE/users/profile \
  -H "Authorization: Bearer $JWT_TOKEN" | jq

echo -e "\n=== 4. Connect Social Accounts ==="
# YouTube Account
YOUTUBE_RESPONSE=$(curl -s -X POST $API_BASE/social-accounts \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "YOUTUBE_SHORTS",
    "platformAccountId": "UC_demo_channel",
    "username": "DemoYouTubeChannel",
    "accessToken": "demo_youtube_token",
    "scopes": ["youtube.upload"]
  }')

YOUTUBE_ACCOUNT_ID=$(echo $YOUTUBE_RESPONSE | jq -r '.id')
echo "YouTube Account ID: $YOUTUBE_ACCOUNT_ID"

# Facebook Account  
FACEBOOK_RESPONSE=$(curl -s -X POST $API_BASE/social-accounts \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "FACEBOOK_REELS",
    "platformAccountId": "demo_fb_page",
    "username": "DemoFacebookPage", 
    "accessToken": "demo_facebook_token",
    "scopes": ["pages_manage_posts"]
  }')

FACEBOOK_ACCOUNT_ID=$(echo $FACEBOOK_RESPONSE | jq -r '.id')
echo "Facebook Account ID: $FACEBOOK_ACCOUNT_ID"

echo -e "\n=== 5. List Connected Accounts ==="
curl -s -X GET $API_BASE/social-accounts \
  -H "Authorization: Bearer $JWT_TOKEN" | jq

echo -e "\n=== 6. Upload Videos ==="
# Note: You need actual video files for this to work
# VIDEO_RESPONSE=$(curl -s -X POST $API_BASE/videos/upload \
#   -H "Authorization: Bearer $JWT_TOKEN" \
#   -F "video=@./demo-video.mp4" \
#   -F "title=Demo Video 1" \
#   -F "description=First demo video")

# VIDEO_ID=$(echo $VIDEO_RESPONSE | jq -r '.id')
# echo "Video ID: $VIDEO_ID"

echo -e "\n=== 7. Create Publishing Job ==="
# JOB_RESPONSE=$(curl -s -X POST $API_BASE/publishing/jobs \
#   -H "Authorization: Bearer $JWT_TOKEN" \
#   -H "Content-Type: application/json" \
#   -d "{
#     \"title\": \"Demo Multi-Platform Campaign\",
#     \"description\": \"Publishing demo video to multiple platforms\",
#     \"tasks\": [
#       {
#         \"videoId\": \"$VIDEO_ID\",
#         \"socialAccountId\": \"$YOUTUBE_ACCOUNT_ID\"
#       },
#       {
#         \"videoId\": \"$VIDEO_ID\",
#         \"socialAccountId\": \"$FACEBOOK_ACCOUNT_ID\"
#       }
#     ]
#   }")

# JOB_ID=$(echo $JOB_RESPONSE | jq -r '.id')
# echo "Publishing Job ID: $JOB_ID"

echo -e "\n=== 8. List Publishing Jobs ==="
curl -s -X GET $API_BASE/publishing/jobs \
  -H "Authorization: Bearer $JWT_TOKEN" | jq

echo -e "\n=== Demo Complete ==="
```

## Real-World Example: Publishing 2 Videos to Multiple Platforms

Based on your original requirement:
- Video 1 → 3 YouTube Shorts + 2 Facebook Reels + Instagram Reels  
- Video 2 → 15 Facebook Reels + 4 TikTok channels

```json
{
  "title": "Batch Publishing Campaign",
  "description": "Publishing videos as per user requirements",
  "tasks": [
    // Video 1 to YouTube Shorts accounts
    {"videoId": "video_1_id", "socialAccountId": "youtube_shorts_1"},
    {"videoId": "video_1_id", "socialAccountId": "youtube_shorts_2"}, 
    {"videoId": "video_1_id", "socialAccountId": "youtube_shorts_3"},
    
    // Video 1 to Facebook Reels
    {"videoId": "video_1_id", "socialAccountId": "facebook_reels_1"},
    {"videoId": "video_1_id", "socialAccountId": "facebook_reels_2"},
    
    // Video 1 to Instagram Reels
    {"videoId": "video_1_id", "socialAccountId": "instagram_reels_1"},
    
    // Video 2 to Facebook Reels (15 accounts)
    {"videoId": "video_2_id", "socialAccountId": "facebook_reels_1"},
    {"videoId": "video_2_id", "socialAccountId": "facebook_reels_2"},
    // ... (continue for all 15 Facebook accounts)
    
    // Video 2 to TikTok (4 channels)
    {"videoId": "video_2_id", "socialAccountId": "tiktok_channel_1"},
    {"videoId": "video_2_id", "socialAccountId": "tiktok_channel_2"},
    {"videoId": "video_2_id", "socialAccountId": "tiktok_channel_3"},
    {"videoId": "video_2_id", "socialAccountId": "tiktok_channel_4"}
  ]
}
```

## 📋 Publishing Jobs

### Create Individual Publishing Job

```bash
POST /publishing/jobs
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "title": "My Video Campaign",
  "description": "Publishing my video to multiple platforms",
  "scheduledAt": "2025-07-15T10:00:00Z",
  "tasks": [
    {
      "videoId": "video-uuid-1",
      "socialAccountId": "youtube-account-uuid"
    },
    {
      "videoId": "video-uuid-1", 
      "socialAccountId": "facebook-account-uuid"
    }
  ]
}
```

### Create Batch Publishing Job (NEW - Supports Complex Payloads)

```bash
POST /publishing/batch-jobs
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "jobs": [
    {
      "videoId": "video-uuid-1",
      "targets": [
        { "socialAccountId": "youtube-account-uuid-1" },
        { "socialAccountId": "youtube-account-uuid-2" },
        { "socialAccountId": "youtube-account-uuid-3" },
        { "socialAccountId": "facebook-account-uuid-1" },
        { "socialAccountId": "facebook-account-uuid-2" },
        { "socialAccountId": "instagram-account-uuid-1" }
      ],
      "customTitle": "Custom title for Video 1",
      "customDescription": "Custom description for this specific video"
    },
    {
      "videoId": "video-uuid-2", 
      "targets": [
        { "socialAccountId": "facebook-account-uuid-1" },
        { "socialAccountId": "facebook-account-uuid-2" },
        { "socialAccountId": "facebook-account-uuid-3" },
        { "socialAccountId": "facebook-account-uuid-4" },
        { "socialAccountId": "facebook-account-uuid-5" },
        { "socialAccountId": "facebook-account-uuid-6" },
        { "socialAccountId": "facebook-account-uuid-7" },
        { "socialAccountId": "facebook-account-uuid-8" },
        { "socialAccountId": "facebook-account-uuid-9" },
        { "socialAccountId": "facebook-account-uuid-10" },
        { "socialAccountId": "facebook-account-uuid-11" },
        { "socialAccountId": "facebook-account-uuid-12" },
        { "socialAccountId": "facebook-account-uuid-13" },
        { "socialAccountId": "facebook-account-uuid-14" },
        { "socialAccountId": "facebook-account-uuid-15" },
        { "socialAccountId": "tiktok-account-uuid-1" },
        { "socialAccountId": "tiktok-account-uuid-2" },
        { "socialAccountId": "tiktok-account-uuid-3" },
        { "socialAccountId": "tiktok-account-uuid-4" }
      ],
      "customTitle": "Custom title for Video 2"
    }
  ],
  "scheduledAt": "2025-07-15T10:00:00Z",
  "batchTitle": "Summer Campaign 2025"
}
```

### Get Queue Status (Enhanced with RabbitMQ)

```bash
GET /publishing/queue/status
Authorization: Bearer <your-jwt-token>

Response:
{
  "inMemory": {
    "queueSize": 5,
    "isProcessing": true
  },
  "rabbitmq": {
    "status": "Connected",
    "mainQueue": {
      "name": "video-publish-tasks-queue",
      "messageCount": 12,
      "consumerCount": 1
    },
    "deadLetterQueue": {
      "name": "video-publish-tasks-dlq", 
      "messageCount": 2,
      "consumerCount": 0
    },
    "retryQueue": {
      "name": "video-publish-retry-queue",
      "messageCount": 1,
      "consumerCount": 0
    }
  }
}
```
