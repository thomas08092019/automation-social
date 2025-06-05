# OAuth Setup Guide - Quick Start

## Current Issue
Your OAuth connection is failing because no Google OAuth credentials are configured. The error "No app configuration available for platform YOUTUBE_SHORTS" means the system can't find valid OAuth app credentials.

## Solution: Set Up Google OAuth Credentials

### Step 1: Create Google Cloud Project (FREE)

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
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
