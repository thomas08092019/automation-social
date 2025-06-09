import { Logger } from '@nestjs/common';

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: string[];
}

export class RetryUtil {
  private static readonly logger = new Logger(RetryUtil.name);

  static async withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions,
    context: string,
  ): Promise<T> {
    const {
      maxAttempts,
      baseDelayMs,
      maxDelayMs,
      backoffMultiplier,
      retryableErrors,
    } = options;

    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        this.logger.debug(`${context}: Attempt ${attempt}/${maxAttempts}`);
        return await operation();
      } catch (error) {
        lastError = error as Error;

        const isRetryable = this.isRetryableError(
          error as Error,
          retryableErrors,
        );

        if (!isRetryable || attempt === maxAttempts) {
          this.logger.error(
            `${context}: Failed after ${attempt} attempts`,
            error,
          );
          throw error;
        }

        const delay = Math.min(
          baseDelayMs * Math.pow(backoffMultiplier, attempt - 1),
          maxDelayMs,
        );

        this.logger.warn(
          `${context}: Attempt ${attempt} failed, retrying in ${delay}ms`,
          error,
        );

        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  private static isRetryableError(
    error: Error,
    retryableErrors?: string[],
  ): boolean {
    // Check if error has retryable property
    if ('retryable' in error) {
      return (error as any).retryable === true;
    }

    // Check against specific error codes
    if (retryableErrors) {
      return retryableErrors.some(
        (code) =>
          error.message.includes(code) ||
          error.name.includes(code) ||
          ('code' in error && (error as any).code === code),
      );
    }

    // Default retryable conditions
    if ('statusCode' in error) {
      const statusCode = (error as any).statusCode;
      return statusCode >= 500 || statusCode === 429 || statusCode === 408;
    }

    // Network errors are usually retryable
    return (
      error.name === 'NetworkError' ||
      error.message.includes('ECONNRESET') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('ENOTFOUND')
    );
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
