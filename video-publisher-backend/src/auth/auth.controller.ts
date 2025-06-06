import { Controller, Post, Body, HttpCode, HttpStatus, Get, Param, Res, UseGuards, Delete, Request, Query } from '@nestjs/common';
import { AuthService, AuthResponse } from './auth.service';
import { CreateUserDto, LoginDto, SocialLoginDto, ForgotPasswordDto, ResetPasswordDto } from '../user/dto/user.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto): Promise<AuthResponse> {
    return this.authService.register(createUserDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(loginDto);
  }

  @Post('social-login')
  @HttpCode(HttpStatus.OK)
  async socialLogin(@Body() socialLoginDto: SocialLoginDto): Promise<AuthResponse> {
    return this.authService.socialLogin(socialLoginDto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Get('oauth/callback')
  async handleOAuthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: any,
  ) {
    console.log('=== OAuth Callback Endpoint Hit ===');
    console.log('Code:', code);
    console.log('State:', state);
    console.log('Error:', error);
    
    try {
      if (error) {
        throw new Error(`OAuth error: ${error}`);
      }

      if (!code || !state) {
        throw new Error('Missing authorization code or state parameter');
      }

      // Determine provider from state
      console.log('=== PROVIDER DETECTION DEBUG ===');
      console.log('Debug - Received state:', state);
      console.log('Debug - State type:', typeof state);
      console.log('Debug - State length:', state?.length);
      console.log('Debug - Contains google:', state?.includes('google'));
      console.log('Debug - Contains facebook:', state?.includes('facebook'));
      
      let provider = null;
      if (state && typeof state === 'string') {
        const stateLower = state.toLowerCase();
        console.log('Debug - State lowercase:', stateLower);
        
        if (stateLower.includes('google')) {
          provider = 'google';
          console.log('Debug - Matched google provider');
        } else if (stateLower.includes('facebook')) {
          provider = 'facebook';
          console.log('Debug - Matched facebook provider');
        } else {
          console.log('Debug - No provider match found in state');
        }
      } else {
        console.log('Debug - State is not a valid string');
      }
      
      console.log('Debug - Final determined provider:', provider);
      
      if (!provider) {
        console.error('=== PROVIDER DETECTION FAILED ===');
        console.error('State:', state);
        console.error('State type:', typeof state);
        console.error('State includes google:', state?.includes('google'));
        console.error('State includes facebook:', state?.includes('facebook'));
        throw new Error(`Unsupported OAuth provider. State: ${state}, Type: ${typeof state}`);
      }

      // Redirect URI for token exchange (must match the original one without query params)
      const tokenExchangeRedirectUri = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback`;

      let userInfo;
      let accessToken;

      if (provider === 'google') {
        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID || 'demo-google-client-id',
            client_secret: process.env.GOOGLE_CLIENT_SECRET || 'demo-google-client-secret',
            code,
            grant_type: 'authorization_code',
            redirect_uri: tokenExchangeRedirectUri,
          }),
        });

        const tokens = await tokenResponse.json();
        
        if (tokens.error) {
          throw new Error(`Google token exchange failed: ${tokens.error_description || tokens.error}`);
        }
        
        accessToken = tokens.access_token;

        // Get user info
        const userResponse = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`);
        userInfo = await userResponse.json();
        
        if (userInfo.error) {
          throw new Error(`Failed to get Google user info: ${userInfo.error.message}`);
        }

        // Check for YouTube channels (fetch all channels, not just first one)
        try {
          const youtubeResponse = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true&maxResults=50&access_token=${accessToken}`);
          const youtubeData = await youtubeResponse.json();
          
          if (youtubeData.items && youtubeData.items.length > 0) {
            // User has YouTube channels, add them to userInfo for later processing
            userInfo.youtubeChannels = youtubeData.items;
            userInfo.youtubeAccessToken = accessToken;
            userInfo.youtubeRefreshToken = tokens.refresh_token;
            console.log(`Found ${youtubeData.items.length} YouTube channel(s):`);
            youtubeData.items.forEach((channel, index) => {
              console.log(`  ${index + 1}. ${channel.snippet.title} (${channel.id})`);
            });
          } else {
            console.log('No YouTube channels found for this Google account');
          }
        } catch (youtubeError) {
          console.log('Failed to fetch YouTube info (user may not have YouTube access):', youtubeError.message);
        }
      } else if (provider === 'facebook') {
        // Exchange code for tokens
        const tokenResponse = await fetch(
          `https://graph.facebook.com/v18.0/oauth/access_token?` +
          `client_id=${process.env.FACEBOOK_APP_ID || 'demo-facebook-app-id'}&` +
          `client_secret=${process.env.FACEBOOK_APP_SECRET || 'demo-facebook-app-secret'}&` +
          `code=${code}&` +
          `redirect_uri=${encodeURIComponent(tokenExchangeRedirectUri)}`
        );

        const tokens = await tokenResponse.json();
        
        if (tokens.error) {
          throw new Error(`Facebook token exchange failed: ${tokens.error.message || tokens.error}`);
        }
        
        accessToken = tokens.access_token;

        // Get user info
        const userResponse = await fetch(`https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`);
        userInfo = await userResponse.json();
        
        if (userInfo.error) {
          throw new Error(`Failed to get Facebook user info: ${userInfo.error.message}`);
        }

        // Check for Facebook pages
        try {
          const pagesResponse = await fetch(`https://graph.facebook.com/me/accounts?fields=id,name,access_token,category,picture,fan_count,about,description&limit=100&access_token=${accessToken}`);
          const pagesData = await pagesResponse.json();
          
          if (pagesData.data && pagesData.data.length > 0) {
            // User has Facebook pages, add them to userInfo for later processing
            userInfo.facebookPages = pagesData.data;
            userInfo.facebookAccessToken = accessToken;
          }
        } catch (facebookError) {
          // Failed to fetch Facebook pages, continue without them
        }
      }

      // Login or register user
      const socialLoginData = {
        provider,
        accessToken,
        email: userInfo.email,
        name: userInfo.name || userInfo.given_name || 'User',
        providerId: userInfo.id,
        youtubeChannels: userInfo.youtubeChannels,
        youtubeAccessToken: userInfo.youtubeAccessToken,
        youtubeRefreshToken: userInfo.youtubeRefreshToken,
        facebookPages: userInfo.facebookPages,
        facebookAccessToken: userInfo.facebookAccessToken,
      };

      const authResult = await this.authService.socialLogin(socialLoginData);

      // Redirect to frontend with tokens
      const frontendUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?` +
        `login=true&` +
        `token=${authResult.accessToken}&` +
        `user=${encodeURIComponent(JSON.stringify(authResult.user))}`;

      console.log('=== Redirecting to Frontend ===');
      console.log('Frontend URL:', frontendUrl);

      res.redirect(frontendUrl);
    } catch (err: any) {
      console.error('OAuth callback error:', err);
      // Redirect to frontend with error
      const frontendUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?` +
        `login=true&` +
        `error=${encodeURIComponent(err.message)}`;

      res.redirect(frontendUrl);
    }
  }

  @Get('oauth/:provider')
  async initiateOAuth(@Param('provider') provider: string, @Res() res: any) {
    const redirectUri = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback`;
    
    if (provider === 'google') {
      // Create Google OAuth URL
      const clientId = process.env.GOOGLE_CLIENT_ID || 'demo-google-client-id';
      const scope = 'openid email profile https://www.googleapis.com/auth/youtube';
      const state = `login-google-${Date.now()}`;
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scope)}&` +
        `response_type=code&` +
        `state=${state}&` +
        `access_type=offline&` +
        `prompt=consent`;
      
      res.redirect(authUrl);
    } else if (provider === 'facebook') {
      // Create Facebook OAuth URL
      const clientId = process.env.FACEBOOK_APP_ID || 'demo-facebook-app-id';
      const scope = 'email,public_profile,pages_manage_posts,pages_read_engagement';
      const state = `login-facebook-${Date.now()}`;
      
      const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scope)}&` +
        `response_type=code&` +
        `state=${state}`;
      
      res.redirect(authUrl);
    } else {
      res.status(400).json({ error: 'Unsupported OAuth provider' });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('connect-social')
  async connectSocialAccount(
    @Request() req,
    @Body('provider') provider: string,
    @Body('token') token: string,
  ) {
    return this.authService.connectSocialAccount(req.user.id, provider, token);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('disconnect-social/:accountId')
  async disconnectSocialAccount(
    @Request() req,
    @Param('accountId') accountId: string,
  ) {
    return this.authService.disconnectSocialAccount(req.user.id, accountId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('connected-accounts')
  async getConnectedAccounts(@Request() req) {
    return this.authService.getConnectedAccounts(req.user.id);
  }

  @Get('test')
  async testEndpoint() {
    console.log('=== Test Endpoint Hit ===');
    return { message: 'Test endpoint working' };
  }
}
