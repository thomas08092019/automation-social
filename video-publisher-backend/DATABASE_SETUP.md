# Database Setup Guide

## Prerequisites
1. Install PostgreSQL on your system
2. Create a database named `video_publisher_db`
3. Update the DATABASE_URL in .env file

## Setup Steps

### 1. Install PostgreSQL (if not already installed)
Download and install PostgreSQL from: https://www.postgresql.org/download/

### 2. Create Database
```sql
-- Connect to PostgreSQL as admin user
psql -U postgres

-- Create database
CREATE DATABASE video_publisher_db;

-- Create user (optional)
CREATE USER video_publisher WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE video_publisher_db TO video_publisher;
```

### 3. Update Environment Variables
Edit the `.env` file and update the DATABASE_URL:
```
DATABASE_URL="postgresql://username:password@localhost:5432/video_publisher_db?schema=public"
```

### 4. Run Database Migrations
```bash
# Generate and run migrations
npx prisma migrate dev --name init

# Generate Prisma Client (if not done already)
npx prisma generate
```

### 5. (Optional) Seed Database
```bash
# Run seed script if available
npm run seed
```

## Database Schema Overview

### Tables Created:
- **users**: User accounts with authentication
- **social_accounts**: Connected social media accounts (YouTube, Facebook, Instagram, TikTok)
- **videos**: Uploaded video files with metadata
- **publishing_jobs**: Publishing campaigns
- **publishing_tasks**: Individual tasks for posting videos to specific accounts

### Key Features:
- User authentication with JWT
- Multi-platform social account management
- Video upload and storage
- Batch publishing to multiple platforms
- Job status tracking and retry mechanisms

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user

### Users
- `GET /users/profile` - Get user profile

### Social Accounts
- `POST /social-accounts` - Connect social account
- `GET /social-accounts` - List connected accounts
- `GET /social-accounts/:id` - Get account details
- `PUT /social-accounts/:id` - Update account
- `DELETE /social-accounts/:id` - Remove account

### Videos
- `POST /videos/upload` - Upload video
- `GET /videos` - List user videos
- `GET /videos/:id` - Get video details
- `PUT /videos/:id` - Update video metadata
- `DELETE /videos/:id` - Delete video

### Publishing
- `POST /publishing/jobs` - Create publishing job
- `GET /publishing/jobs` - List publishing jobs
- `GET /publishing/jobs/:id` - Get job details
- `POST /publishing/jobs/:id/execute` - Execute job
- `POST /publishing/jobs/:id/retry` - Retry failed tasks
- `DELETE /publishing/jobs/:id` - Delete job

## Example Usage

### 1. Register and Login
```bash
# Register
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### 2. Upload Video
```bash
curl -X POST http://localhost:3001/videos/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "video=@/path/to/video.mp4" \
  -F "title=My Video Title" \
  -F "description=Video description"
```

### 3. Create Publishing Job
```bash
curl -X POST http://localhost:3001/publishing/jobs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Publishing Campaign",
    "description": "Publishing video to multiple platforms",
    "tasks": [
      {
        "videoId": "video_id_1",
        "socialAccountId": "social_account_id_1"
      },
      {
        "videoId": "video_id_2", 
        "socialAccountId": "social_account_id_2"
      }
    ]
  }'
```
