import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Param,
  Res,
  UseGuards,
  Delete,
  Request,
  Query,
} from '@nestjs/common';
import { AuthService, AuthResponse } from './auth.service';
import {
  CreateUserDto,
  LoginDto,
  SocialLoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from '../user/dto/user.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { EnhancedSocialAppService } from './enhanced-social-app.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private enhancedSocialAppService: EnhancedSocialAppService,
  ) {}

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
  async socialLogin(
    @Body() socialLoginDto: SocialLoginDto,
  ): Promise<AuthResponse> {
    return this.authService.socialLogin(socialLoginDto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.forgotPassword(forgotPasswordDto);
  }
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<AuthResponse> {
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
  async changePassword(
    @Request() req,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
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
      } // Check if this is a social account connection flow or login flow
      console.log('=== FLOW TYPE DETECTION ===');
      console.log('Debug - Received state:', state);

      // Social account connection format: "userId:platform:timestamp"      // Login flow format: "login-provider-timestamp"
      // Social flow format: "userId:platform:timestamp"
      const isLoginFlow = state.startsWith('login-');
      const isSocialAccountFlow =
        state.includes(':') && !state.startsWith('login-');

      console.log('=== FLOW DETECTION DEBUG ===');
      console.log('State:', state);
      console.log('State type:', typeof state);
      console.log('State length:', state?.length);
      console.log('Contains colon:', state?.includes(':'));
      console.log('Starts with login-:', state?.startsWith('login-'));
      console.log('Is login flow:', isLoginFlow);
      console.log('Is social account flow:', isSocialAccountFlow);
      console.log('===========================');

      if (isSocialAccountFlow) {
        // Handle social account connection - redirect to social account controller
        console.log('=== REDIRECTING TO SOCIAL ACCOUNT FLOW ===');
        console.log(
          'This is a social account connection, redirecting to social-account controller',
        );

        // Make a server-to-server call to the social account OAuth callback
        const response = await fetch(
          `${process.env.BACKEND_URL || 'http://localhost:3001'}/social-accounts/oauth/callback`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code,
              state,
              platform: state.split(':')[1], // Extract platform from state
            }),
          },
        );

        const result = await response.json();
        if (result.success) {
          // ✅ SOCIAL ACCOUNT CONNECTION SUCCESS - Close popup and notify parent
          console.log('🎉 Social account connection successful!');
          const frontendBaseUrl =
            process.env.FRONTEND_URL || 'http://localhost:3000';

          // Redirect to a special popup success page that will close itself and notify parent
          const successUrl = `${frontendBaseUrl}/auth/callback?social_connection=success&platform=${result.data?.platform || 'unknown'}&account_name=${encodeURIComponent(result.data?.displayName || result.data?.username || 'Connected Account')}`;
          return res.redirect(successUrl);
        } else {
          // ❌ SOCIAL ACCOUNT CONNECTION ERROR - Close popup and notify parent
          console.log('❌ Social account connection failed:', result.message);
          const frontendBaseUrl =
            process.env.FRONTEND_URL || 'http://localhost:3000';

          // Redirect to a special popup error page that will close itself and notify parent
          const errorUrl = `${frontendBaseUrl}/auth/callback?social_connection=error&message=${encodeURIComponent(result.message || 'Connection failed')}`;
          return res.redirect(errorUrl);
        }
      }

      // Continue with login flow
      console.log('=== PROVIDER DETECTION FOR LOGIN FLOW ===');

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
        } else if (stateLower.includes('tiktok')) {
          provider = 'tiktok';
          console.log('Debug - Matched tiktok provider');
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
        console.error('State includes tiktok:', state?.includes('tiktok'));
        throw new Error(
          `Unsupported OAuth provider. State: ${state}, Type: ${typeof state}`,
        );
      }

      // Determine the appropriate base URL based on provider
      let frontendBaseUrl: string;
      if (provider === 'tiktok') {
        // For TikTok, use ngrok URL if available
        frontendBaseUrl =
          process.env.FRONTEND_NGROK_URL ||
          process.env.FRONTEND_URL ||
          'http://localhost:3000';
      } else {
        // For other providers, use local URL only
        frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      }

      // Redirect URI for token exchange (must match the original one without query params)
      const tokenExchangeRedirectUri = `${frontendBaseUrl}/auth/callback`;

      let userInfo;
      let accessToken;

      if (provider === 'google') {
        // Exchange code for tokens
        const tokenResponse = await fetch(
          'https://oauth2.googleapis.com/token',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id:
                process.env.GOOGLE_CLIENT_ID || 'demo-google-client-id',
              client_secret:
                process.env.GOOGLE_CLIENT_SECRET || 'demo-google-client-secret',
              code,
              grant_type: 'authorization_code',
              redirect_uri: tokenExchangeRedirectUri,
            }),
          },
        );

        const tokens = await tokenResponse.json();

        if (tokens.error) {
          throw new Error(
            `Google token exchange failed: ${tokens.error_description || tokens.error}`,
          );
        }

        accessToken = tokens.access_token; // Get user info with enhanced metadata
        const userResponse = await fetch(
          `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`,
        );
        userInfo = await userResponse.json();

        if (userInfo.error) {
          throw new Error(
            `Failed to get Google user info: ${userInfo.error.message}`,
          );
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
          const youtubeResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails,brandingSettings,status&mine=true&maxResults=50&access_token=${accessToken}`,
          );
          const youtubeData = await youtubeResponse.json();
          if (youtubeData.items && youtubeData.items.length > 0) {
            // User has YouTube channels, add enhanced metadata
            userInfo.youtubeChannels = youtubeData.items.map((channel) => ({
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
                hiddenSubscriberCount:
                  channel.statistics?.hiddenSubscriberCount,
                videoCount: channel.statistics?.videoCount,
                // Content details
                relatedPlaylists: channel.contentDetails?.relatedPlaylists,
                // Branding
                bannerExternalUrl:
                  channel.brandingSettings?.image?.bannerExternalUrl,
                keywords: channel.brandingSettings?.channel?.keywords,
                // Status
                privacyStatus: channel.status?.privacyStatus,
                isLinked: channel.status?.isLinked,
                longUploadsStatus: channel.status?.longUploadsStatus,
              },
            }));
            userInfo.youtubeAccessToken = accessToken;
            userInfo.youtubeRefreshToken = tokens.refresh_token;
            console.log(
              `Found ${youtubeData.items.length} YouTube channel(s) with enhanced metadata`,
            );
            youtubeData.items.forEach((channel, index) => {
              console.log(
                `  ${index + 1}. ${channel.snippet.title} (${channel.id}) - ${channel.statistics?.subscriberCount || 'N/A'} subscribers`,
              );
            });
          } else {
            console.log('No YouTube channels found for this Google account');
          }
        } catch (youtubeError) {
          console.log(
            'Failed to fetch YouTube info (user may not have YouTube access):',
            youtubeError.message,
          );
        }
      } else if (provider === 'facebook') {
        // Exchange code for tokens
        const tokenResponse = await fetch(
          `https://graph.facebook.com/v18.0/oauth/access_token?` +
            `client_id=${process.env.FACEBOOK_APP_ID || 'demo-facebook-app-id'}&` +
            `client_secret=${process.env.FACEBOOK_APP_SECRET || 'demo-facebook-app-secret'}&` +
            `code=${code}&` +
            `redirect_uri=${encodeURIComponent(tokenExchangeRedirectUri)}`,
        );

        const tokens = await tokenResponse.json();

        if (tokens.error) {
          throw new Error(
            `Facebook token exchange failed: ${tokens.error.message || tokens.error}`,
          );
        }

        accessToken = tokens.access_token; // Get user info with enhanced metadata and high-quality picture
        const userResponse = await fetch(
          `https://graph.facebook.com/me?fields=id,name,email,first_name,last_name,middle_name,name_format,short_name,picture.width(400).height(400),cover,age_range,birthday,gender,hometown,location,locale,timezone,verified,website,link&access_token=${accessToken}`,
        );
        userInfo = await userResponse.json();

        if (userInfo.error) {
          throw new Error(
            `Failed to get Facebook user info: ${userInfo.error.message}`,
          );
        }

        // Extract profile picture from Facebook response
        if (
          userInfo.picture &&
          userInfo.picture.data &&
          userInfo.picture.data.url
        ) {
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
          const pagesResponse = await fetch(
            `https://graph.facebook.com/me/accounts?fields=id,name,access_token,category,category_list,picture.width(400).height(400),cover,fan_count,about,description,website,emails,phone,location,hours,parking,public_transit,price_range,overall_star_rating,rating_count,single_line_address,username,verification_status,voip_info,were_here_count,whatsapp_number&limit=100&access_token=${accessToken}`,
          );
          const pagesData = await pagesResponse.json();

          if (pagesData.data && pagesData.data.length > 0) {
            // User has Facebook pages, add enhanced metadata
            userInfo.facebookPages = pagesData.data.map((page) => ({
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
              },
            }));
            userInfo.facebookAccessToken = accessToken;
            console.log(
              `Found ${pagesData.data.length} Facebook page(s) with enhanced metadata`,
            );
            pagesData.data.forEach((page, index) => {
              console.log(
                `  ${index + 1}. ${page.name} (${page.id}) - ${page.fan_count || 'N/A'} followers`,
              );
            });
          }
        } catch (facebookError) {
          console.log('Failed to fetch Facebook pages:', facebookError.message);
        }
      } else if (provider === 'tiktok') {
        // Handle TikTok OAuth token exchange with ULTIMATE SPEED OPTIMIZATION
        console.log(
          '=== TikTok OAuth Token Exchange (🚀 ULTIMATE SPEED MODE) ===',
        );
        console.log('TikTok Client ID:', process.env.TIKTOK_CLIENT_ID);
        console.log('TikTok Redirect URI:', tokenExchangeRedirectUri);
        console.log(
          '🚀 ULTIMATE SPEED: Processing code in <1 second to prevent ANY expiration',
        );

        const startTime = Date.now();
        let tokens;

        try {
          // ULTIMATE SPEED: Single attempt with 800ms timeout - no retries for expired codes
          console.log(`🚀 TikTok ULTIMATE speed exchange (target: <800ms)`);

          const tokenResponse = await fetch(
            'https://open.tiktokapis.com/v2/oauth/token/',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json',
                'User-Agent': 'VideoPublisher/3.0 UltimateSpeed',
                Connection: 'keep-alive',
              },
              body: new URLSearchParams({
                client_key:
                  process.env.TIKTOK_CLIENT_ID || 'demo-tiktok-client-id',
                client_secret:
                  process.env.TIKTOK_CLIENT_SECRET ||
                  'demo-tiktok-client-secret',
                code,
                grant_type: 'authorization_code',
                redirect_uri: tokenExchangeRedirectUri,
              }),
              signal: AbortSignal.timeout(800), // Ultra-fast 800ms timeout
            },
          );

          const totalTime = Date.now() - startTime;
          console.log(`⏱️ TikTok token request completed in ${totalTime}ms`);

          if (!tokenResponse.ok) {
            console.error(
              `❌ TikTok HTTP ${tokenResponse.status}: ${tokenResponse.statusText} (${totalTime}ms)`,
            );
            throw new Error(
              `TikTok OAuth failed: HTTP ${tokenResponse.status} ${tokenResponse.statusText}`,
            );
          }

          tokens = await tokenResponse.json();
          const finalTime = Date.now() - startTime;
          console.log(`📄 TikTok response parsed in ${finalTime}ms:`, tokens);

          // Check for success
          if (tokens.access_token && !tokens.error && !tokens.error_code) {
            console.log(
              `✅ TikTok token exchange SUCCESSFUL in ${finalTime}ms`,
            );
            accessToken = tokens.access_token;
          } else {
            // Handle errors - NO RETRIES for expired codes
            const errorMsg =
              tokens.error_description ||
              tokens.message ||
              tokens.error ||
              'TikTok token exchange failed';

            if (
              errorMsg.includes('expired') ||
              errorMsg.includes('Authorization code is expired') ||
              errorMsg.includes('invalid_grant') ||
              tokens.error === 'invalid_grant'
            ) {
              console.error(
                '🚨 TikTok Authorization Code EXPIRED (no retries in ultimate speed mode)',
              );
              console.error(`   ⏱️ Processing time: ${finalTime}ms`);
              console.error(
                '   💡 SOLUTION: The OAuth flow must be completed faster',
              );
              console.error(
                '   🔄 Please try again and click "Allow" immediately',
              );
              throw new Error(
                `TikTok authorization code expired after ${finalTime}ms. Please complete OAuth flow faster.`,
              );
            }

            console.error(
              `❌ TikTok token exchange failed in ${finalTime}ms: ${errorMsg}`,
            );
            throw new Error(`TikTok token exchange failed: ${errorMsg}`);
          }
        } catch (fetchError) {
          const totalTime = Date.now() - startTime;
          console.error(
            `🚨 TikTok fetch error after ${totalTime}ms:`,
            fetchError.message,
          );

          if (fetchError.name === 'AbortError') {
            throw new Error(
              `TikTok token exchange timed out after ${totalTime}ms. Server may be slow - please try again.`,
            );
          }

          throw new Error(
            `TikTok token exchange failed after ${totalTime}ms: ${fetchError.message}`,
          );
        }
        // Extract access token
        // accessToken = tokens.access_token; // Already set above

        if (!accessToken) {
          console.error(
            '⚠️ TikTok exchange succeeded but no access token found',
          );
          console.error('Full response:', JSON.stringify(tokens, null, 2));
          throw new Error(
            'TikTok token exchange completed but no access token received',
          );
        }

        console.log('✅ TikTok token obtained successfully');
        console.log(`🔑 Token: ${accessToken.substring(0, 15)}...`);

        // ⚡ LIGHTNING MODE: Skip user info fetch to prevent token expiration
        // Use fallback user info immediately and fetch real info in background
        console.log(
          '⚡ LIGHTNING MODE: Creating account immediately with fallback user info',
        );
        const connectTime = new Date().toISOString();
        userInfo = {
          id: `tiktok_lightning_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          name: 'TikTok User (Connecting...)',
          email: null,
          profilePicture: null,
          tiktokMetadata: {
            open_id: `tiktok_lightning_${Date.now()}`,
            display_name: 'TikTok User (Connecting...)',
            lightning_mode: true,
            access_token_available: true,
            token_exchange_success: true,
            connected_at: connectTime,
            api_success: false,
            connection_type: 'lightning_fallback',
            user_info_fetch_status: 'pending',
          },
        };

        console.log(
          `⚡ Lightning account created, user info will be fetched in background`,
        );

        // TODO: Implement background user info fetch after account is connected
        // This will update the account with real user data once TikTok APIs are ready
      }

      // Login or register user with enhanced metadata
      const socialLoginData = {
        provider,
        accessToken,
        email: userInfo.email,
        name: userInfo.name || userInfo.given_name || 'User',
        providerId: userInfo.id,
        profilePicture: userInfo.profilePicture,
        metadata:
          userInfo.googleMetadata ||
          userInfo.facebookMetadata ||
          userInfo.tiktokMetadata ||
          {},
        youtubeChannels: userInfo.youtubeChannels,
        youtubeAccessToken: userInfo.youtubeAccessToken,
        youtubeRefreshToken: userInfo.youtubeRefreshToken,
        facebookPages: userInfo.facebookPages,
        facebookAccessToken: userInfo.facebookAccessToken,
        tiktokAccessToken: provider === 'tiktok' ? accessToken : undefined,
      };

      const authResult = await this.authService.socialLogin(socialLoginData);

      // Redirect to frontend with tokens (use the same base URL determined earlier)
      const frontendUrl =
        `${frontendBaseUrl}/auth/callback?` +
        `login=true&` +
        `token=${authResult.accessToken}&` +
        `user=${encodeURIComponent(JSON.stringify(authResult.user))}`;

      console.log('=== Redirecting to Frontend ===');
      console.log('Frontend URL:', frontendUrl);

      res.redirect(frontendUrl);
    } catch (err: any) {
      console.error('OAuth callback error:', err);
      // Redirect to frontend with error (fallback to local URL if frontendBaseUrl not available)
      const errorBaseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const errorUrl =
        `${errorBaseUrl}/auth/callback?` +
        `login=true&` +
        `error=${encodeURIComponent(err.message)}`;

      res.redirect(errorUrl);
    }
  }
  @Get('oauth/:provider')
  async initiateOAuth(@Param('provider') provider: string, @Res() res: any) {
    // Determine redirect URI based on provider
    let redirectUri: string;
    if (provider === 'tiktok') {
      // For TikTok, use ngrok URL if available
      const baseUrl =
        process.env.FRONTEND_NGROK_URL ||
        process.env.FRONTEND_URL ||
        'http://localhost:3000';
      redirectUri = `${baseUrl}/auth/callback`;
    } else {
      // For other providers, use local URL only
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      redirectUri = `${baseUrl}/auth/callback`;
    }

    if (provider === 'google') {
      // Create Google OAuth URL
      const clientId = process.env.GOOGLE_CLIENT_ID || 'demo-google-client-id';
      const scope =
        'openid email profile https://www.googleapis.com/auth/youtube';
      const state = `login-google-${Date.now()}`;

      const authUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?` +
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
      const scope =
        'email,public_profile,pages_manage_posts,pages_read_engagement';
      const state = `login-facebook-${Date.now()}`;

      const authUrl =
        `https://www.facebook.com/v18.0/dialog/oauth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scope)}&` +
        `response_type=code&` +
        `state=${state}`;
      res.redirect(authUrl);
    } else if (provider === 'tiktok') {
      // Create TikTok OAuth URL with MAXIMUM FORCE parameters
      const clientId = process.env.TIKTOK_CLIENT_ID || 'demo-tiktok-client-id';
      const scope =
        'user.info.basic,user.info.profile,user.info.stats,user.info.open_id,video.list,video.publish,video.upload,artist.certification.read,artist.certification.update'; // Comprehensive TikTok scopes
      const state = `login-tiktok-${Date.now()}`;
      // TikTok OAuth URL with ULTIMATE FORCE parameters to prevent auto-redirect
      const authUrl =
        `https://www.tiktok.com/v2/auth/authorize/?` +
        `client_key=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scope)}&` +
        `response_type=code&` +
        `state=${state}&` +
        // ULTIMATE FORCE PERMISSION SCREENS - Maximum aggressive parameters
        `force_reauth=true&` +
        `force_verify=true&` +
        `approval_prompt=force&` +
        `prompt=consent&` +
        `access_type=offline&` +
        `include_granted_scopes=false&` +
        `force_login=true&` +
        `force_approval=true&` +
        `force_consent=true&` +
        `force_permissions=true&` +
        `reauth=true&` +
        `consent=force&` +
        `auth_type=rerequest&` +
        `display=popup&` + // Prevents auto-redirect behavior
        `force_show_permission=true&` + // TikTok-specific force parameter
        `force_authorization=true&` + // Force authorization screens
        `disable_auto_login=true&` + // Disable automatic login
        `always_prompt=true&` + // Always show prompts
        `require_interaction=true&` + // Require user interaction
        `force_interactive=true&` + // Force interactive mode
        // Anti-cache and fresh session parameters
        `fresh=true&` +
        `no_cache=true&` +
        `nocache=${Date.now()}&` +
        `t=${Date.now()}&` +
        `v=4&` + // Higher version for cache busting
        `_=${Date.now()}&` + // jQuery-style cache buster
        `session_invalidate=true&` +
        `cache_buster=${Math.random().toString(36).substring(7)}&` + // Additional cache buster
        `rand=${Math.random().toString(36).substring(2, 15)}`;
      console.log('=== TikTok Login OAuth URL ===');
      console.log('Client Key:', clientId);
      console.log('Redirect URI:', redirectUri);
      console.log('Scopes:', scope);
      console.log('🔥 ULTIMATE FORCE PERMISSION SCREENS: ENABLED');
      console.log('   🔒 force_reauth=true (Forces re-authentication)');
      console.log('   🔒 force_verify=true (Forces permission verification)');
      console.log('   🔒 approval_prompt=force (Forces approval screens)');
      console.log('   🔒 display=popup (Prevents auto-redirect)');
      console.log('   🔒 auth_type=rerequest (Forces permission re-request)');
      console.log('   🔒 force_show_permission=true (TikTok-specific force)');
      console.log(
        '   🔒 force_authorization=true (Force authorization screens)',
      );
      console.log('   🔒 disable_auto_login=true (Disable automatic login)');
      console.log('   🔒 always_prompt=true (Always show prompts)');
      console.log('   🔒 require_interaction=true (Require user interaction)');
      console.log('   🔒 force_interactive=true (Force interactive mode)');
      console.log('   🔒 include_granted_scopes=false (No cached permissions)');
      console.log(
        '   🔒 session_invalidate=true (Invalidates existing session)',
      );
      console.log('   🔒 v=4 (Enhanced cache busting)');
      console.log('   🔒 force_consent=true (Maximum force consent)');
      console.log('Auth URL:', authUrl);
      console.log('==============================');

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
  @Get('debug/tiktok-oauth')
  async debugTikTokOAuth(@Res() res: any) {
    try {
      console.log('=== TIKTOK OAUTH DEBUG ENDPOINT ===');

      const clientId = process.env.TIKTOK_CLIENT_ID;
      const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
      const frontendNgrokUrl = process.env.FRONTEND_NGROK_URL;
      const tiktokMode = process.env.TIKTOK_MODE || 'sandbox';

      console.log('Environment Variables:');
      console.log('- TIKTOK_CLIENT_ID:', clientId);
      console.log(
        '- TIKTOK_CLIENT_SECRET:',
        clientSecret ? `${clientSecret.substring(0, 8)}...` : 'MISSING',
      );
      console.log('- FRONTEND_NGROK_URL:', frontendNgrokUrl);
      console.log('- TIKTOK_MODE:', tiktokMode);

      if (!clientId || !clientSecret || !frontendNgrokUrl) {
        return res.status(400).json({
          error: 'Missing TikTok OAuth configuration',
          clientId: !!clientId,
          clientSecret: !!clientSecret,
          frontendNgrokUrl: !!frontendNgrokUrl,
          instructions: [
            'Make sure TIKTOK_CLIENT_ID is set in .env',
            'Make sure TIKTOK_CLIENT_SECRET is set in .env',
            'Make sure FRONTEND_NGROK_URL is set in .env',
            'Restart the backend server after updating .env',
          ],
        });
      }
      // Generate test OAuth URL using exact TikTok specification
      const redirectUri = `${frontendNgrokUrl}/auth/callback`;
      const scopes =
        'user.info.basic,user.info.profile,user.info.stats,user.info.open_id,video.list,video.publish,video.upload,artist.certification.read,artist.certification.update'; // Comprehensive scopes
      const state = `tiktok-debug-${Date.now()}`; // Create OAuth URL using TikTok's exact format
      const authUrl = new URL('https://www.tiktok.com/v2/auth/authorize/');
      authUrl.searchParams.set('client_key', clientId); // TikTok uses 'client_key' not 'client_id'
      authUrl.searchParams.set('scope', scopes);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('state', state); // Force permission screens
      authUrl.searchParams.set('force_reauth', '1');
      authUrl.searchParams.set('force_verify', '1');
      authUrl.searchParams.set('approval_prompt', 'force');
      authUrl.searchParams.set('prompt', 'consent');
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('include_granted_scopes', 'false');
      authUrl.searchParams.set('force_login', '1');
      authUrl.searchParams.set('force_approval', '1');
      authUrl.searchParams.set('fresh', '1');
      authUrl.searchParams.set('no_cache', '1');
      // Anti-cache parameters
      authUrl.searchParams.set('t', Date.now().toString());
      authUrl.searchParams.set('v', '2');
      authUrl.searchParams.set('rand', Math.random().toString(36).substring(7));

      // Additional sandbox mode check
      const sandboxIssues = [];
      if (tiktokMode === 'sandbox') {
        sandboxIssues.push(
          'App is in Sandbox mode - this may have limitations',
        );
        sandboxIssues.push(
          'Sandbox mode might require app approval or whitelisting',
        );
        sandboxIssues.push(
          'Try switching to Live mode in TikTok Developer Console',
        );
      }

      return res.json({
        status: 'TikTok OAuth Configuration Analysis',
        configuration: {
          clientId: clientId,
          clientSecret: clientSecret
            ? `${clientSecret.substring(0, 8)}...`
            : 'MISSING',
          redirectUri: redirectUri,
          scopes: scopes,
          mode: tiktokMode,
          ngrokUrl: frontendNgrokUrl,
        },
        generatedUrl: authUrl.toString(),
        potentialIssues: [
          ...sandboxIssues,
          'Verify redirect URI matches exactly in TikTok Developer Console',
          'Ensure app has required scopes approved',
          'Check if app status is "Live" not "Sandbox"',
          'Verify ngrok URL is accessible and correct',
        ],
        developerConsoleChecklist: {
          'Redirect URI': `Must be exactly: ${redirectUri}`,
          'Client Key': `Should match: ${clientId}`,
          'App Status': 'Should be "Live" not "Sandbox" for production',
          Scopes: 'user.info.basic and video.list should be approved',
          Platform: 'Should be set to "Web" application type',
        },
        testInstructions: [
          '1. Copy the generated URL above',
          '2. Paste it in your browser',
          '3. If you get "unauthorized_client" error:',
          '   - Check TikTok Developer Console settings',
          '   - Verify all checklist items above',
          '   - Try switching app from Sandbox to Live mode',
        ],
      });
    } catch (error) {
      console.error('Debug endpoint error:', error);
      return res.status(500).json({
        error: 'Debug endpoint failed',
        message: error.message,
      });
    }
  }

  @Get('tiktok/debug')
  async getTikTokDebugInfo() {
    try {
      // Get TikTok configuration for analysis
      const appConfig = await this.enhancedSocialAppService.getAppConfig({
        userId: 'system', // Use system-level config
        platform: 'TIKTOK',
      });

      const isSandboxMode = process.env.TIKTOK_MODE === 'sandbox';

      return {
        status: 'TikTok OAuth Configuration Debug',
        timestamp: new Date().toISOString(),
        mode: isSandboxMode ? 'SANDBOX' : 'LIVE',
        environment: {
          nodeEnv: process.env.NODE_ENV,
          tiktokMode: process.env.TIKTOK_MODE || 'not set',
          frontendNgrokUrl: process.env.FRONTEND_NGROK_URL || 'not set',
          backendPort: process.env.PORT || '3001',
        },
        configuration: {
          clientId: appConfig.appId
            ? `${appConfig.appId.substring(0, 10)}...`
            : 'NOT SET',
          clientSecret: appConfig.appSecret
            ? `${appConfig.appSecret.substring(0, 10)}...`
            : 'NOT SET',
          redirectUri: appConfig.redirectUri,
          scopes: appConfig.scopes || [],
          source: appConfig.source,
        },
        urls: {
          authorizationUrl: `https://www.tiktok.com/v2/auth/authorize/?client_key=${appConfig.appId}&scope=${encodeURIComponent((appConfig.scopes || []).join(','))}&response_type=code&redirect_uri=${encodeURIComponent(appConfig.redirectUri)}&state=test_state`,
          tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
          userInfoUrl: 'https://open.tiktokapis.com/v2/user/info/',
        },
        sandboxInstructions: isSandboxMode
          ? [
              '1. Ensure your TikTok Developer account is approved for sandbox access',
              '2. Use sandbox-compatible scopes: user.info.basic, video.list',
              '3. Test with sandbox test users only',
              '4. Verify ngrok URL is registered in TikTok Developer Console',
              '5. Check if your app is in sandbox mode in TikTok Developer Console',
            ]
          : [
              '1. Switch to Live mode if sandbox is causing issues',
              '2. Ensure production scopes are approved',
              '3. Verify domain whitelist includes ngrok URL',
            ],
        troubleshooting: {
          unauthorizedClientError: {
            possibleCauses: [
              'Client Key (App ID) mismatch between .env and TikTok Console',
              'Redirect URI mismatch between registered and actual URL',
              'Sandbox mode restrictions',
              'App not approved or in wrong mode',
              'Invalid scopes for current app mode',
            ],
            nextSteps: [
              'Verify Client Key exactly matches TikTok Developer Console',
              'Check redirect URI is exactly: ' + appConfig.redirectUri,
              'Ensure ngrok URL is registered in TikTok Console',
              'Try switching between sandbox/live mode',
              'Check app approval status in TikTok Console',
            ],
          },
        },
        validationStatus: {
          hasClientId:
            !!appConfig.appId && appConfig.appId !== 'your_tiktok_client_id',
          hasClientSecret:
            !!appConfig.appSecret &&
            appConfig.appSecret !== 'your_tiktok_client_secret',
          hasRedirectUri: !!appConfig.redirectUri,
          isNgrokUrl: appConfig.redirectUri?.includes('ngrok'),
          hasValidScopes:
            Array.isArray(appConfig.scopes) && appConfig.scopes.length > 0,
        },
      };
    } catch (error) {
      return {
        status: 'ERROR',
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: error.stack,
      };
    }
  }
}
