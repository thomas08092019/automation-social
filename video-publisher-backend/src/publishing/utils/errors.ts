export class PublishingError extends Error {
  constructor(
    message: string,
    public readonly platform: string,
    public readonly code?: string,
    public readonly statusCode?: number,
    public readonly retryable?: boolean,
  ) {
    super(message);
    this.name = 'PublishingError';
  }
}

export class RateLimitError extends PublishingError {
  constructor(
    platform: string,
    public readonly resetTime?: Date,
    public readonly retryAfter?: number,
  ) {
    super(
      `Rate limit exceeded for ${platform}`,
      platform,
      'RATE_LIMIT_EXCEEDED',
      429,
      true,
    );
    this.name = 'RateLimitError';
  }
}

export class TokenExpiredError extends PublishingError {
  constructor(platform: string) {
    super(
      `Access token expired for ${platform}`,
      platform,
      'TOKEN_EXPIRED',
      401,
      true,
    );
    this.name = 'TokenExpiredError';
  }
}

export class VideoValidationError extends PublishingError {
  constructor(platform: string, message: string) {
    super(
      `Video validation failed for ${platform}: ${message}`,
      platform,
      'VIDEO_VALIDATION_FAILED',
      400,
      false,
    );
    this.name = 'VideoValidationError';
  }
}

export class NetworkError extends PublishingError {
  constructor(platform: string, originalError: Error) {
    super(
      `Network error for ${platform}: ${originalError.message}`,
      platform,
      'NETWORK_ERROR',
      undefined,
      true,
    );
    this.name = 'NetworkError';
  }
}

export class PlatformAPIError extends PublishingError {
  constructor(
    platform: string,
    message: string,
    code?: string,
    statusCode?: number,
  ) {
    const isRetryable = statusCode
      ? statusCode >= 500 || statusCode === 429
      : true;
    super(message, platform, code, statusCode, isRetryable);
    this.name = 'PlatformAPIError';
  }
}
