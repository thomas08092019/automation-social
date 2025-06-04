// Simple test to verify error handling utilities are properly exported
import { 
  PublishingError, 
  TokenExpiredError, 
  RateLimitError, 
  VideoValidationError,
  NetworkError,
  PlatformAPIError,
  RetryUtil,
  RateLimiter,
  VideoValidator,
  PlatformLogger 
} from './src/publishing/utils';

console.log('✅ All error handling utilities accessible');
export { };
