/**
 * Custom error types for domain-specific exceptions
 * Phase 5: Error Handling Middleware
 */

import { HttpException, HttpStatus } from '@nestjs/common';

export interface ErrorContext {
  userId?: string;
  resource?: string;
  operation?: string;
  details?: string;
  metadata?: Record<string, any>;
}

export interface ErrorDetails {
  code: string;
  message: string;
  details?: string;
  context?: ErrorContext;
  timestamp: string;
  path?: string;
}

/**
 * Base custom exception with enhanced error details
 */
export abstract class BaseCustomException extends HttpException {
  public readonly code: string;
  public readonly context?: ErrorContext;

  constructor(
    code: string,
    message: string,
    status: HttpStatus,
    context?: ErrorContext,
  ) {
    super(
      {
        code,
        message,
        context,
        timestamp: new Date().toISOString(),
      },
      status,
    );
    this.code = code;
    this.context = context;
  }
}

/**
 * Authentication & Authorization Errors
 */
export class AuthenticationException extends BaseCustomException {
  constructor(
    message: string = 'Authentication failed',
    context?: ErrorContext,
  ) {
    super('AUTH_001', message, HttpStatus.UNAUTHORIZED, context);
  }
}

export class InvalidCredentialsException extends BaseCustomException {
  constructor(context?: ErrorContext) {
    super(
      'AUTH_002',
      'Invalid email or password',
      HttpStatus.UNAUTHORIZED,
      context,
    );
  }
}

export class TokenExpiredException extends BaseCustomException {
  constructor(context?: ErrorContext) {
    super('AUTH_003', 'Token has expired', HttpStatus.UNAUTHORIZED, context);
  }
}

export class InvalidTokenException extends BaseCustomException {
  constructor(message: string = 'Invalid token', context?: ErrorContext) {
    super('AUTH_004', message, HttpStatus.UNAUTHORIZED, context);
  }
}

export class AccessDeniedException extends BaseCustomException {
  constructor(resource: string, context?: ErrorContext) {
    super(
      'AUTH_005',
      `Access denied to ${resource}`,
      HttpStatus.FORBIDDEN,
      context,
    );
  }
}

/**
 * Social Account Errors
 */
export class SocialAccountException extends BaseCustomException {
  constructor(code: string, message: string, context?: ErrorContext) {
    super(code, message, HttpStatus.BAD_REQUEST, context);
  }
}

export class SocialAccountAlreadyExistsException extends SocialAccountException {
  constructor(platform: string, context?: ErrorContext) {
    super('SOCIAL_001', `${platform} account is already connected`, context);
  }
}

export class SocialAccountNotFoundException extends SocialAccountException {
  constructor(platform?: string, context?: ErrorContext) {
    const message = platform
      ? `${platform} account not found`
      : 'Social account not found';
    super('SOCIAL_002', message, context);
  }
}

export class SocialPlatformNotSupportedException extends SocialAccountException {
  constructor(platform: string, context?: ErrorContext) {
    super('SOCIAL_003', `Platform ${platform} is not supported`, context);
  }
}

export class OAuthException extends SocialAccountException {
  constructor(platform: string, error: string, context?: ErrorContext) {
    super('SOCIAL_004', `OAuth error for ${platform}: ${error}`, context);
  }
}

export class TokenExchangeException extends SocialAccountException {
  constructor(platform: string, context?: ErrorContext) {
    super('SOCIAL_005', `Failed to exchange token for ${platform}`, context);
  }
}

/**
 * User Management Errors
 */
export class UserException extends BaseCustomException {
  constructor(
    code: string,
    message: string,
    status: HttpStatus,
    context?: ErrorContext,
  ) {
    super(code, message, status, context);
  }
}

export class UserNotFoundException extends UserException {
  constructor(identifier?: string, context?: ErrorContext) {
    const message = identifier
      ? `User not found: ${identifier}`
      : 'User not found';
    super('USER_001', message, HttpStatus.NOT_FOUND, context);
  }
}

export class UserAlreadyExistsException extends UserException {
  constructor(email: string, context?: ErrorContext) {
    super(
      'USER_002',
      `User with email ${email} already exists`,
      HttpStatus.CONFLICT,
      context,
    );
  }
}

export class UserValidationException extends UserException {
  constructor(field: string, message: string, context?: ErrorContext) {
    super(
      'USER_003',
      `Validation error for ${field}: ${message}`,
      HttpStatus.BAD_REQUEST,
      context,
    );
  }
}

/**
 * Business Logic Errors
 */
export class BusinessLogicException extends BaseCustomException {
  constructor(code: string, message: string, context?: ErrorContext) {
    super(code, message, HttpStatus.UNPROCESSABLE_ENTITY, context);
  }
}

export class ValidationException extends BaseCustomException {
  constructor(message: string, details?: string, context?: ErrorContext) {
    super('VALIDATION_001', message, HttpStatus.BAD_REQUEST, {
      ...context,
      details,
    });
  }
}

/**
 * External Service Errors
 */
export class ExternalServiceException extends BaseCustomException {
  constructor(service: string, error: string, context?: ErrorContext) {
    super(
      'EXT_001',
      `External service error (${service}): ${error}`,
      HttpStatus.BAD_GATEWAY,
      context,
    );
  }
}

export class DatabaseException extends BaseCustomException {
  constructor(operation: string, error: string, context?: ErrorContext) {
    super(
      'DB_001',
      `Database error during ${operation}: ${error}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      context,
    );
  }
}

/**
 * File Upload Errors
 */
export class FileUploadException extends BaseCustomException {
  constructor(message: string, context?: ErrorContext) {
    super('FILE_001', message, HttpStatus.BAD_REQUEST, context);
  }
}

export class FileNotFoundException extends BaseCustomException {
  constructor(filename: string, context?: ErrorContext) {
    super(
      'FILE_002',
      `File not found: ${filename}`,
      HttpStatus.NOT_FOUND,
      context,
    );
  }
}

export class FileSizeExceededException extends BaseCustomException {
  constructor(maxSize: string, context?: ErrorContext) {
    super(
      'FILE_003',
      `File size exceeds maximum allowed size of ${maxSize}`,
      HttpStatus.BAD_REQUEST,
      context,
    );
  }
}

export class UnsupportedFileTypeException extends BaseCustomException {
  constructor(
    fileType: string,
    supportedTypes: string[],
    context?: ErrorContext,
  ) {
    super(
      'FILE_004',
      `Unsupported file type: ${fileType}. Supported types: ${supportedTypes.join(', ')}`,
      HttpStatus.BAD_REQUEST,
      context,
    );
  }
}

/**
 * Rate Limiting Errors
 */
export class RateLimitException extends BaseCustomException {
  constructor(limit: number, window: string, context?: ErrorContext) {
    super(
      'RATE_001',
      `Rate limit exceeded: ${limit} requests per ${window}`,
      HttpStatus.TOO_MANY_REQUESTS,
      context,
    );
  }
}

/**
 * Configuration Errors
 */
export class ConfigurationException extends BaseCustomException {
  constructor(setting: string, context?: ErrorContext) {
    super(
      'CONFIG_001',
      `Configuration error: ${setting}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      context,
    );
  }
}
