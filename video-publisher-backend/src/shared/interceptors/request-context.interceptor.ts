/**
 * Request Context Interceptor
 * Phase 5: Error Handling Middleware
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AppLoggerService } from '../services/logger.service';

export interface RequestContext {
  requestId: string;
  userId?: string;
  userAgent?: string;
  ip: string;
  method: string;
  url: string;
  startTime: number;
}

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();

    // Generate unique request ID
    const requestId = uuidv4();
    const startTime = Date.now();

    // Add request context to request object
    const requestContext: RequestContext = {
      requestId,
      userId: (request as any).user?.id,
      userAgent: request.get('User-Agent'),
      ip: request.ip || request.connection.remoteAddress,
      method: request.method,
      url: request.url,
      startTime,
    };

    // Attach context to request for use in other parts of the app
    (request as any).context = requestContext;

    // Add request ID to response headers
    response.setHeader('X-Request-ID', requestId);

    // Log incoming request
    this.logIncomingRequest(request, requestContext);

    return next.handle().pipe(
      tap((responseData) => {
        // Log successful response
        this.logResponse(request, response, requestContext, responseData);
      }),
      catchError((error) => {
        // Log error response
        this.logErrorResponse(request, response, requestContext, error);
        throw error; // Re-throw to be handled by exception filter
      }),
    );
  }

  private logIncomingRequest(request: Request, context: RequestContext): void {
    const { method, url, requestId, userId, userAgent, ip } = context;
    
    // Skip logging for health checks and static files
    if (this.shouldSkipLogging(url)) {
      return;
    }

    const message = `Incoming ${method} ${url}`;
    
    this.logger.log(message, {
      requestId,
      userId,
      operation: 'http-request',
      metadata: {
        userAgent: userAgent?.substring(0, 100), // Truncate long user agents
        ip,
        method,
        url,
        body: this.sanitizeRequestBody(request.body),
        query: Object.keys(request.query).length > 0 ? request.query : undefined,
        params: Object.keys(request.params).length > 0 ? request.params : undefined,
      },
    });
  }

  private logResponse(
    request: Request,
    response: Response,
    context: RequestContext,
    responseData: any,
  ): void {
    const { method, url, requestId, userId, startTime } = context;
    const duration = Date.now() - startTime;
    const statusCode = response.statusCode;

    // Skip logging for health checks and static files
    if (this.shouldSkipLogging(url)) {
      return;
    }

    const message = `${method} ${url} - ${statusCode} (${duration}ms)`;
    
    const logContext = {
      requestId,
      userId,
      operation: 'http-response',
      metadata: {
        statusCode,
        duration,
        method,
        url,
        responseSize: this.getResponseSize(responseData),
      },
    };

    // Log as warning if response is slow
    if (duration > 2000) {
      this.logger.warn(`Slow response: ${message}`, logContext);
    } else {
      this.logger.log(message, logContext);
    }

    // Log performance metrics
    this.logger.logPerformance(`${method} ${url}`, {
      requestId,
      userId,
      duration,
      threshold: 1000, // 1 second threshold
      metadata: {
        statusCode,
        method,
        url,
      },
    });
  }

  private logErrorResponse(
    request: Request,
    response: Response,
    context: RequestContext,
    error: any,
  ): void {
    const { method, url, requestId, userId, startTime, userAgent, ip } = context;
    const duration = Date.now() - startTime;
    const statusCode = error.status || error.statusCode || 500;

    const message = `${method} ${url} - ERROR ${statusCode} (${duration}ms)`;
    
    this.logger.error(message, {
      requestId,
      userId,
      operation: 'http-error',
      statusCode,
      errorCode: error.code,
      userAgent,
      ip,
      method,
      url,
      metadata: {
        duration,
        errorType: error.constructor.name,
        errorMessage: error.message,
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      },
    });
  }

  private shouldSkipLogging(url: string): boolean {
    const skipPatterns = [
      '/health',
      '/metrics',
      '/favicon.ico',
      '/api/uploads',
    ];

    return skipPatterns.some(pattern => url.includes(pattern));
  }

  private sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = [
      'password',
      'confirmPassword',
      'token',
      'accessToken',
      'refreshToken',
      'secret',
      'apiKey',
      'authorization',
    ];

    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    // Recursively sanitize nested objects
    for (const key in sanitized) {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeRequestBody(sanitized[key]);
      }
    }

    return sanitized;
  }

  private getResponseSize(responseData: any): number {
    try {
      if (!responseData) return 0;
      if (typeof responseData === 'string') return responseData.length;
      return JSON.stringify(responseData).length;
    } catch {
      return 0;
    }
  }
}

/**
 * Utility to get request context from current request
 */
export function getRequestContext(request: any): RequestContext | null {
  return request?.context || null;
}
