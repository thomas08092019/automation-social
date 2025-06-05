import { Controller, Post, Body, HttpCode, HttpStatus, Get, Param, Res, UseGuards, Delete, Request } from '@nestjs/common';
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

  @Get('oauth/:provider')
  async initiateOAuth(@Param('provider') provider: string, @Res() res: any) {
    // This endpoint initiates OAuth flow
    if (provider === 'google') {
      // For demo purposes, show an info page about OAuth setup
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Google OAuth Setup Required</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
            .container { max-width: 600px; margin: 0 auto; background: rgba(255,255,255,0.1); padding: 30px; border-radius: 15px; }
            .btn { background: #4285f4; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🔧 Google OAuth Setup Required</h1>
            <p>To enable Google login, you need to:</p>
            <ol>
              <li>Create a Google Cloud Project</li>
              <li>Enable Google+ API</li>
              <li>Create OAuth 2.0 credentials</li>
              <li>Add your credentials to the backend .env file</li>
            </ol>
            <p>For detailed instructions, check the OAUTH_SETUP_GUIDE.md file in the backend folder.</p>
            <button class="btn" onclick="window.close()">Close Window</button>
            <script>
              // Notify parent window of error
              if (window.opener) {
                window.opener.postMessage({
                  type: 'OAUTH_ERROR',
                  error: 'Google OAuth not configured. Please set up OAuth credentials.'
                }, '${process.env.FRONTEND_URL || 'http://localhost:5173'}');
              }
            </script>
          </div>
        </body>
        </html>
      `;
      res.send(html);
    } else if (provider === 'facebook') {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Facebook OAuth Setup Required</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
            .container { max-width: 600px; margin: 0 auto; background: rgba(255,255,255,0.1); padding: 30px; border-radius: 15px; }
            .btn { background: #1877f2; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🔧 Facebook OAuth Setup Required</h1>
            <p>To enable Facebook login, you need to:</p>
            <ol>
              <li>Create a Facebook App</li>
              <li>Add Facebook Login product</li>
              <li>Configure OAuth redirect URIs</li>
              <li>Add your credentials to the backend .env file</li>
            </ol>
            <p>For detailed instructions, check the OAUTH_SETUP_GUIDE.md file in the backend folder.</p>
            <button class="btn" onclick="window.close()">Close Window</button>
            <script>
              // Notify parent window of error
              if (window.opener) {
                window.opener.postMessage({
                  type: 'OAUTH_ERROR',
                  error: 'Facebook OAuth not configured. Please set up OAuth credentials.'
                }, '${process.env.FRONTEND_URL || 'http://localhost:5173'}');
              }
            </script>
          </div>
        </body>
        </html>
      `;
      res.send(html);
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
}
