# OAuth Setup Guide

This guide will help you configure OAuth credentials for social media platforms to enable the social account connection feature.

## ⚠️ Current Critical Issue: TikTok OAuth

The current TikTok OAuth credentials in your `.env` file are test/placeholder values and **will not work** for actual OAuth authentication. You need to replace them with real credentials from TikTok's developer platform.

### TikTok Error Details
If you're seeing:
- `param_error` with `errCode=10003` and `error_type=client_key`
- "Something went wrong - We couldn't log in with TikTok"
- URL showing `client_id=aw7u03nbpa4vszuo`

This means your TikTok OAuth credentials are invalid placeholder values.

## Quick Fix for TikTok OAuth

### Step 1: Create TikTok Developer Account (FREE)

1. **Go to TikTok for Developers**
   - Visit: https://developers.tiktok.com/
   - Sign up or log in with your TikTok account
   - Complete the developer verification process

2. **Create a New App**
   - Navigate to "Manage Apps"
   - Click "Create an App"
   - Fill in required details:
     - App Name: "Social Media Automation Tool" (or your preferred name)
     - Company Name: Your name/company
     - Industry: "Marketing & Advertisement"
     - Use Case: "Content Publishing"

3. **Configure Login Kit**
   - In your app dashboard, add "Login Kit" product
   - Configure redirect URIs (MUST MATCH EXACTLY):
     ```
     http://localhost:3000/auth/callback
     ```
   - **IMPORTANT**: TikTok now requires PKCE (Proof Key for Code Exchange) for security
   - The system automatically handles PKCE generation and verification
   - Request scopes (UPDATED - only these scopes are available):
     - `user.info.profile` - Read access to profile information  
     - `user.info.stats` - Read access to user statistics (followers, likes, etc.)
     - `video.list` - List user's videos
     - **Note**: `user.info.basic`, `video.upload`, and `video.publish` are no longer available

4. **App Settings Checklist**
   - ✅ Redirect URI must be **exactly**: `http://localhost:3000/auth/callback`
   - ✅ App must be approved for the requested scopes
   - ✅ PKCE is now automatically handled by the backend
   - ✅ Make sure your app is in "Live" mode (not sandbox)

5. **Get Your Real Credentials**
   - Copy your `Client Key` (this becomes `TIKTOK_CLIENT_ID`)
   - Copy your `Client Secret` (this becomes `TIKTOK_CLIENT_SECRET`)

5. **Update Your .env File**
   Replace the placeholder values:
   ```bash
   # Replace these lines:
   TIKTOK_CLIENT_ID=aw7u03nbpa4vszuo
   TIKTOK_CLIENT_SECRET=i56VhaIcOYjfdCvrHnfQ6MEu5TTY5Xwe
   
   # With your real credentials:
   TIKTOK_CLIENT_ID=your_actual_client_key_from_tiktok
   TIKTOK_CLIENT_SECRET=your_actual_client_secret_from_tiktok
   ```

6. **Restart Your Server**
   ```bash
   cd video-publisher-backend
   npm run start:dev
   ```

## Other Platform Setup Instructions

### 📘 Facebook/Meta for Developers

1. **Create Facebook App**
   - Go to [Facebook for Developers](https://developers.facebook.com/)
   - Create app for "Business" use case
   - Add "Facebook Login" product

2. **Configure OAuth**
   - Add redirect URI: `http://localhost:3000/auth/callback`
   - Request permissions: `pages_manage_posts`, `pages_read_engagement`, `pages_show_list`

3. **Update .env**
   ```bash
   FACEBOOK_APP_ID=your_facebook_app_id
   FACEBOOK_APP_SECRET=your_facebook_app_secret
   ```
   - Sign in with your Google account

2. **Create a New Project**
   - Click "Select a project" at the top
   - Click "New Project"
   - Name it something like "Video Publisher App"
   - Click "Create"

### Step 2: Enable YouTube Data API

1. **Navigate to APIs & Services**
   - Go to "APIs & Services" → "Library"
   - Search for "YouTube Data API v3"
   - Click on it and click "Enable"

### Step 3: Create OAuth 2.0 Credentials

1. **Configure OAuth Consent Screen**
   - Go to "APIs & Services" → "OAuth consent screen"
   - Choose "External" (unless you have a Google Workspace account)
   - Fill in required fields:
     - App name: "Video Publisher"
     - User support email: your email
     - Developer contact: your email
   - Click "Save and Continue" through all steps

2. **Create OAuth 2.0 Client ID**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Choose "Web application"
   - Name it "Video Publisher Web Client"
   - Add Authorized redirect URIs:
     ```
     http://localhost:3000/auth/google/callback
     ```
   - Click "Create"

3. **Copy Your Credentials**
   - You'll see a popup with:
     - Client ID: looks like `123456789-abcdef.apps.googleusercontent.com`
     - Client Secret: looks like `GOCSPX-abcdef1234567890`
   - **Keep these safe!**

### Step 4: Update Environment Variables

1. **Edit your `.env` file**
   Replace the placeholder values:

   ```bash
   # Before:
   DEFAULT_GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
   DEFAULT_GOOGLE_CLIENT_SECRET="your-google-client-secret"

   # After (with your real credentials):
   DEFAULT_GOOGLE_CLIENT_ID="123456789-abcdef.apps.googleusercontent.com"
   DEFAULT_GOOGLE_CLIENT_SECRET="GOCSPX-abcdef1234567890"
   ```

2. **Restart your backend server**
   ```bash
   npm run start:dev
   ```

### Step 5: Test the Connection

1. **Try connecting YouTube again**
   - Go to Social Accounts page
   - Click "Connect" on YouTube
   - You should now see the Google OAuth page instead of an error

## Alternative: Quick Test with Test Credentials

If you want to test the OAuth flow immediately, you can use these test credentials (they won't work for real uploads but will test the OAuth flow):

```bash
DEFAULT_GOOGLE_CLIENT_ID="123456789-test.apps.googleusercontent.com"
DEFAULT_GOOGLE_CLIENT_SECRET="GOCSPX-test123456789"
```

## Troubleshooting

### "Invalid redirect URI" error
- Make sure your redirect URI in Google Cloud Console exactly matches:
  `http://localhost:3000/auth/google/callback`

### "Client ID not found" error
- Double-check you copied the Client ID correctly
- Make sure there are no extra spaces

### Still seeing "No app configuration available"
- Restart your backend server after updating .env
- Check the backend logs for any error messages

## Next Steps

Once Google OAuth is working:

1. **Set up other platforms** (optional):
   - Facebook/Instagram: https://developers.facebook.com/
   - TikTok: https://developers.tiktok.com/

2. **Configure production settings**:
   - Use HTTPS redirect URIs for production
   - Set up proper domain verification

## Security Notes

- Never commit real OAuth credentials to version control
- Use different credentials for development and production
- Regularly rotate your OAuth secrets
