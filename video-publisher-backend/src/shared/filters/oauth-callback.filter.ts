/**
 * OAuth Callback Error Filter
 * Handles OAuth errors specifically and redirects to frontend with error info
 * Phase 5: Error Handling Middleware
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { AppLoggerService } from '../services/logger.service';

@Injectable()
@Catch()
export class OAuthCallbackExceptionFilter implements ExceptionFilter {
  constructor(
    private configService: ConfigService,
    private logger: AppLoggerService,
  ) {}

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    // Only handle OAuth callback routes
    if (!request.url.includes('/auth/oauth/callback')) {
      throw exception; // Let global filter handle it
    }

    let errorMessage = 'Unknown OAuth error';
    let errorCode = 'OAUTH_UNKNOWN';

    if (exception instanceof HttpException) {
      const responseBody = exception.getResponse() as any;
      errorMessage = responseBody.message || exception.message;
      errorCode = responseBody.code || 'OAUTH_ERROR';
    } else if (exception instanceof Error) {
      errorMessage = exception.message;
    } // Log the error
    this.logger.error('OAuth callback error', {
      errorCode,
      stack: exception.stack,
      url: request.url,
      metadata: { errorMessage },
    });

    // Redirect to frontend with error
    const frontendUrl =
      this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
    const errorUrl = `${frontendUrl}/auth/callback?error=${encodeURIComponent(errorMessage)}&code=${errorCode}`;

    response.redirect(errorUrl);
  }
}
