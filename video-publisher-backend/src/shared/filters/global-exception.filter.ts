/**
 * Global Exception Filter
 * Phase 5: Error Handling Middleware
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseCustomException, ErrorDetails } from '../exceptions/custom.exceptions';

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: string;
    context?: any;
    timestamp: string;
    path: string;
    method: string;
    statusCode: number;
  };
  requestId?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception, request);
    
    // Log the error
    this.logError(exception, request, errorResponse);

    response.status(errorResponse.error.statusCode).json(errorResponse);
  }

  private buildErrorResponse(exception: unknown, request: Request): ErrorResponse {
    const timestamp = new Date().toISOString();
    const path = request.url;
    const method = request.method;

    // Handle custom exceptions
    if (exception instanceof BaseCustomException) {
      return {
        success: false,
        error: {
          code: exception.code,
          message: exception.message,
          context: exception.context,
          timestamp,
          path,
          method,
          statusCode: exception.getStatus(),
        },
      };
    }

    // Handle standard HTTP exceptions
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      let errorDetails: any = {};
      if (typeof exceptionResponse === 'object') {
        errorDetails = exceptionResponse;
      } else {
        errorDetails = { message: exceptionResponse };
      }

      return {
        success: false,
        error: {
          code: this.getErrorCodeFromStatus(status),
          message: errorDetails.message || exception.message,
          details: errorDetails.error,
          context: errorDetails.context,
          timestamp,
          path,
          method,
          statusCode: status,
        },
      };
    }

    // Handle validation errors
    if (this.isValidationError(exception)) {
      return this.handleValidationError(exception, request);
    }

    // Handle Prisma errors
    if (this.isPrismaError(exception)) {
      return this.handlePrismaError(exception, request);
    }

    // Handle unknown errors
    return this.handleUnknownError(exception, request);
  }

  private getErrorCodeFromStatus(status: HttpStatus): string {
    const statusCodes: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
      [HttpStatus.CONFLICT]: 'CONFLICT',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
      [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
      [HttpStatus.BAD_GATEWAY]: 'BAD_GATEWAY',
      [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
    };

    return statusCodes[status] || 'UNKNOWN_ERROR';
  }

  private isValidationError(exception: any): boolean {
    return exception?.response?.statusCode === 400 && 
           Array.isArray(exception?.response?.message);
  }

  private handleValidationError(exception: any, request: Request): ErrorResponse {
    const validationErrors = exception.response.message;
    
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: validationErrors.join(', '),
        context: {
          validationErrors,
          field: 'multiple',
        },
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        statusCode: HttpStatus.BAD_REQUEST,
      },
    };
  }

  private isPrismaError(exception: any): boolean {
    return exception?.code && typeof exception.code === 'string' && 
           (exception.code.startsWith('P') || exception.name?.includes('Prisma'));
  }

  private handlePrismaError(exception: any, request: Request): ErrorResponse {
    const prismaErrorMap: Record<string, { code: string; message: string; status: HttpStatus }> = {
      'P2002': {
        code: 'DUPLICATE_ENTRY',
        message: 'A record with this information already exists',
        status: HttpStatus.CONFLICT,
      },
      'P2025': {
        code: 'RECORD_NOT_FOUND',
        message: 'The requested record was not found',
        status: HttpStatus.NOT_FOUND,
      },
      'P2003': {
        code: 'FOREIGN_KEY_CONSTRAINT',
        message: 'Foreign key constraint failed',
        status: HttpStatus.BAD_REQUEST,
      },
      'P2014': {
        code: 'INVALID_ID',
        message: 'The provided ID is invalid',
        status: HttpStatus.BAD_REQUEST,
      },
    };

    const errorInfo = prismaErrorMap[exception.code] || {
      code: 'DATABASE_ERROR',
      message: 'A database error occurred',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
    };

    return {
      success: false,
      error: {
        code: errorInfo.code,
        message: errorInfo.message,
        details: this.sanitizePrismaError(exception),
        context: {
          prismaCode: exception.code,
          operation: 'database',
        },
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        statusCode: errorInfo.status,
      },
    };
  }

  private sanitizePrismaError(exception: any): string {
    // Remove sensitive information from Prisma errors
    if (exception.meta?.target) {
      return `Constraint failed on field(s): ${exception.meta.target}`;
    }
    if (exception.meta?.field_name) {
      return `Invalid value for field: ${exception.meta.field_name}`;
    }
    return 'Database constraint error';
  }

  private handleUnknownError(exception: any, request: Request): ErrorResponse {
    // Log the full exception for debugging
    this.logger.error('Unknown exception occurred', exception);

    return {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      },
    };
  }

  private logError(exception: unknown, request: Request, errorResponse: ErrorResponse): void {
    const { error } = errorResponse;
    const userId = (request as any).user?.id || 'anonymous';
    
    const logContext = {
      userId,
      method: request.method,
      url: request.url,
      userAgent: request.get('User-Agent'),
      ip: request.ip,
      statusCode: error.statusCode,
      errorCode: error.code,
      timestamp: error.timestamp,
    };

    // Log based on severity
    if (error.statusCode >= 500) {
      // Server errors - log as error with full details
      this.logger.error(
        `Server Error: ${error.message}`,
        {
          ...logContext,
          exception: exception instanceof Error ? exception.stack : exception,
          context: error.context,
        },
      );
    } else if (error.statusCode >= 400) {
      // Client errors - log as warning
      this.logger.warn(
        `Client Error: ${error.message}`,
        {
          ...logContext,
          details: error.details,
        },
      );
    } else {
      // Other errors - log as info
      this.logger.log(
        `Request Error: ${error.message}`,
        logContext,
      );
    }
  }
}

/**
 * Utility function to create consistent success responses
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  meta?: Record<string, any>
): {
  success: true;
  data: T;
  message?: string;
  meta?: Record<string, any>;
} {
  return {
    success: true,
    data,
    ...(message && { message }),
    ...(meta && { meta }),
  };
}

/**
 * Utility function to create paginated success responses
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  message?: string
): {
  success: true;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  message?: string;
} {
  const pages = Math.ceil(total / limit);
  
  return {
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1,
    },
    ...(message && { message }),
  };
}
