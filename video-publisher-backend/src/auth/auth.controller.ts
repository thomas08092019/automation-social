import { Controller, Post, Body, HttpCode, HttpStatus, Get, Param, Res, UseGuards, Delete, Request, Query } from '@nestjs/common';
import { AuthService, AuthResponse } from './auth.service';
import { CreateUserDto, LoginDto, SocialLoginDto, ForgotPasswordDto, ResetPasswordDto, ChangePasswordDto } from '../user/dto/user.dto';
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
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<AuthResponse> {
    return this.authService.resetPassword(resetPasswordDto);
  }
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req) {
    return this.authService.getMe(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(@Request() req, @Body() changePasswordDto: ChangePasswordDto): Promise<{ message: string }> {
    return this.authService.changePassword(req.user.id, changePasswordDto);
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
        
        accessToken = tokens.access_token;        // Get user info with enhanced metadata
        const userResponse = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`);
        userInfo = await userResponse.json();
        
        if (userInfo.error) {
          throw new Error(`Failed to get Google user info: ${userInfo.error.message}`);
        }

        // Extract enhanced profile picture from Google response
        if (userInfo.picture) {
          // Get high-resolution profile picture by modifying the URL
          userInfo.profilePicture = userInfo.picture.replace('s96-c', 's400-c');
        }

        // Store complete Google user metadata
        userInfo.googleMetadata = {
          id: userInfo.id,
          email: userInfo.email,
          verified_email: userInfo.verified_email,
          name: userInfo.name,
          given_name: userInfo.given_name,
          family_name: userInfo.family_name,
          picture: userInfo.profilePicture,
          locale: userInfo.locale,
          hd: userInfo.hd, // Hosted domain for G Suite users
        };

        // Check for YouTube channels with enhanced metadata
        try {
          const youtubeResponse = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails,brandingSettings,status&mine=true&maxResults=50&access_token=${accessToken}`);
          const youtubeData = await youtubeResponse.json();
            if (youtubeData.items && youtubeData.items.length > 0) {
            // User has YouTube channels, add enhanced metadata
            userInfo.youtubeChannels = youtubeData.items.map(channel => ({
              ...channel,
              // Add enhanced metadata
              metadata: {
                id: channel.id,
                title: channel.snippet.title,
                description: channel.snippet.description,
                customUrl: channel.snippet.customUrl,
                publishedAt: channel.snippet.publishedAt,
                thumbnails: channel.snippet.thumbnails,
                defaultLanguage: channel.snippet.defaultLanguage,
                country: channel.snippet.country,
                // Statistics
                viewCount: channel.statistics?.viewCount,
                subscriberCount: channel.statistics?.subscriberCount,
                hiddenSubscriberCount: channel.statistics?.hiddenSubscriberCount,
                videoCount: channel.statistics?.videoCount,
                // Content details
                relatedPlaylists: channel.contentDetails?.relatedPlaylists,
                // Branding
                bannerExternalUrl: channel.brandingSettings?.image?.bannerExternalUrl,
                keywords: channel.brandingSettings?.channel?.keywords,
                // Status
                privacyStatus: channel.status?.privacyStatus,
                isLinked: channel.status?.isLinked,
                longUploadsStatus: channel.status?.longUploadsStatus,
              }
            }));
            userInfo.youtubeAccessToken = accessToken;
            userInfo.youtubeRefreshToken = tokens.refresh_token;
            console.log(`Found ${youtubeData.items.length} YouTube channel(s) with enhanced metadata`);
            youtubeData.items.forEach((channel, index) => {
              console.log(`  ${index + 1}. ${channel.snippet.title} (${channel.id}) - ${channel.statistics?.subscriberCount || 'N/A'} subscribers`);
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
        
        accessToken = tokens.access_token;        // Get user info with enhanced metadata and high-quality picture
        const userResponse = await fetch(`https://graph.facebook.com/me?fields=id,name,email,first_name,last_name,middle_name,name_format,short_name,picture.width(400).height(400),cover,age_range,birthday,gender,hometown,location,locale,timezone,verified,website,link&access_token=${accessToken}`);
        userInfo = await userResponse.json();
        
        if (userInfo.error) {
          throw new Error(`Failed to get Facebook user info: ${userInfo.error.message}`);
        }

        // Extract profile picture from Facebook response
        if (userInfo.picture && userInfo.picture.data && userInfo.picture.data.url) {
          userInfo.profilePicture = userInfo.picture.data.url;
        }

        // Store complete Facebook user metadata
        userInfo.facebookMetadata = {
          id: userInfo.id,
          name: userInfo.name,
          first_name: userInfo.first_name,
          last_name: userInfo.last_name,
          middle_name: userInfo.middle_name,
          short_name: userInfo.short_name,
          name_format: userInfo.name_format,
          email: userInfo.email,
          picture: userInfo.profilePicture,
          cover: userInfo.cover,
          age_range: userInfo.age_range,
          birthday: userInfo.birthday,
          gender: userInfo.gender,
          hometown: userInfo.hometown,
          location: userInfo.location,
          locale: userInfo.locale,
          timezone: userInfo.timezone,
          verified: userInfo.verified,
          website: userInfo.website,
          link: userInfo.link,
        };

        // Check for Facebook pages with enhanced metadata
        try {
          const pagesResponse = await fetch(`https://graph.facebook.com/me/accounts?fields=id,name,access_token,category,category_list,picture.width(400).height(400),cover,fan_count,about,description,website,emails,phone,location,hours,parking,public_transit,price_range,overall_star_rating,rating_count,single_line_address,username,verification_status,voip_info,were_here_count,whatsapp_number&limit=100&access_token=${accessToken}`);
          const pagesData = await pagesResponse.json();
          
          if (pagesData.data && pagesData.data.length > 0) {
            // User has Facebook pages, add enhanced metadata
            userInfo.facebookPages = pagesData.data.map(page => ({
              ...page,
              // Add enhanced metadata
              metadata: {
                id: page.id,
                name: page.name,
                category: page.category,
                category_list: page.category_list,
                picture: page.picture?.data?.url,
                cover: page.cover,
                fan_count: page.fan_count,
                about: page.about,
                description: page.description,
                website: page.website,
                emails: page.emails,
                phone: page.phone,
                location: page.location,
                hours: page.hours,
                parking: page.parking,
                public_transit: page.public_transit,
                price_range: page.price_range,
                overall_star_rating: page.overall_star_rating,
                rating_count: page.rating_count,
                single_line_address: page.single_line_address,
                username: page.username,
                verification_status: page.verification_status,
                voip_info: page.voip_info,
                were_here_count: page.were_here_count,
                whatsapp_number: page.whatsapp_number,
              }
            }));
            userInfo.facebookAccessToken = accessToken;
            console.log(`Found ${pagesData.data.length} Facebook page(s) with enhanced metadata`);
            pagesData.data.forEach((page, index) => {
              console.log(`  ${index + 1}. ${page.name} (${page.id}) - ${page.fan_count || 'N/A'} followers`);
            });
          }
        } catch (facebookError) {
          console.log('Failed to fetch Facebook pages:', facebookError.message);
        }
      }      // Login or register user with enhanced metadata
      const socialLoginData = {
        provider,
        accessToken,
        email: userInfo.email,
        name: userInfo.name || userInfo.given_name || 'User',
        providerId: userInfo.id,
        profilePicture: userInfo.profilePicture,
        metadata: userInfo.googleMetadata || userInfo.facebookMetadata || {},
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
