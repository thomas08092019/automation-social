/**
 * Enhanced Logging Service
 * Phase 5: Error Handling Middleware
 */

import { Injectable, LoggerService, ConsoleLogger } from '@nestjs/common';

export interface LogContext {
  userId?: string;
  operation?: string;
  resource?: string;
  metadata?: Record<string, any>;
  requestId?: string;
  correlationId?: string;
}

export interface ErrorLogContext extends LogContext {
  statusCode?: number;
  errorCode?: string;
  stack?: string;
  userAgent?: string;
  ip?: string;
  method?: string;
  url?: string;
}

@Injectable()
export class AppLoggerService extends ConsoleLogger implements LoggerService {
  private readonly serviceName = 'video-publisher-backend';
  /**
   * Log informational messages
   */
  log(message: string, context?: string | LogContext): void {
    if (typeof context === 'string') {
      super.log(message, context);
    } else {
      const enrichedMessage = this.enrichMessage(message, context);
      super.log(enrichedMessage, context?.operation || 'Application');
    }
  }
  /**
   * Log error messages with enhanced context
   */
  error(
    message: string,
    stackOrContext?: string | ErrorLogContext,
    context?: string,
  ): void {
    if (typeof stackOrContext === 'string') {
      super.error(message, stackOrContext, context);
    } else {
      const enrichedMessage = this.enrichErrorMessage(message, stackOrContext);
      super.error(
        enrichedMessage,
        stackOrContext?.stack,
        stackOrContext?.operation || 'Application',
      );
    }
  }
  /**
   * Log warning messages
   */
  warn(message: string, context?: string | LogContext): void {
    if (typeof context === 'string') {
      super.warn(message, context);
    } else {
      const enrichedMessage = this.enrichMessage(message, context);
      super.warn(enrichedMessage, context?.operation || 'Application');
    }
  }

  /**
   * Log debug messages (only in development)
   */
  debug(message: string, context?: string | LogContext): void {
    if (typeof context === 'string') {
      super.debug(message, context);
    } else if (process.env.NODE_ENV !== 'production') {
      const enrichedMessage = this.enrichMessage(message, context);
      super.debug(enrichedMessage, context?.operation || 'Application');
    }
  }

  /**
   * Log verbose messages (only in development)
   */
  verbose(message: string, context?: string | LogContext): void {
    if (typeof context === 'string') {
      super.verbose(message, context);
    } else if (process.env.NODE_ENV !== 'production') {
      const enrichedMessage = this.enrichMessage(message, context);
      super.verbose(enrichedMessage, context?.operation || 'Application');
    }
  }

  /**
   * Log authentication events
   */
  logAuth(
    event: string,
    context: LogContext & {
      email?: string;
      provider?: string;
      success: boolean;
    },
  ): void {
    const message = `Authentication ${event}: ${context.success ? 'SUCCESS' : 'FAILED'}`;
    const enrichedContext = {
      ...context,
      operation: 'authentication',
      category: 'security',
    };

    if (context.success) {
      this.log(message, enrichedContext);
    } else {
      this.warn(message, enrichedContext);
    }
  }

  /**
   * Log social account operations
   */
  logSocialAccount(
    event: string,
    context: LogContext & {
      platform?: string;
      accountId?: string;
      success: boolean;
    },
  ): void {
    const message = `Social Account ${event}: ${context.success ? 'SUCCESS' : 'FAILED'}`;
    const enrichedContext = {
      ...context,
      operation: 'social-account',
      category: 'social-integration',
    };

    this.log(message, enrichedContext);
  }

  /**
   * Log database operations
   */
  logDatabase(
    operation: string,
    context: LogContext & {
      table?: string;
      query?: string;
      duration?: number;
      affectedRows?: number;
    },
  ): void {
    const message = `Database ${operation}`;
    const enrichedContext = {
      ...context,
      operation: 'database',
      category: 'data-access',
    };

    this.debug(message, enrichedContext);
  }

  /**
   * Log external API calls
   */
  logExternalApi(
    service: string,
    endpoint: string,
    context: LogContext & {
      method?: string;
      statusCode?: number;
      duration?: number;
      success: boolean;
    },
  ): void {
    const message = `External API call to ${service} ${endpoint}: ${context.success ? 'SUCCESS' : 'FAILED'}`;
    const enrichedContext = {
      ...context,
      operation: 'external-api',
      category: 'integration',
      service,
      endpoint,
    };

    if (context.success) {
      this.log(message, enrichedContext);
    } else {
      this.error(message, enrichedContext as ErrorLogContext);
    }
  }

  /**
   * Log business logic events
   */
  logBusiness(
    event: string,
    context: LogContext & {
      action?: string;
      result?: string;
    },
  ): void {
    const message = `Business Event: ${event}`;
    const enrichedContext = {
      ...context,
      operation: 'business-logic',
      category: 'business',
    };

    this.log(message, enrichedContext);
  }

  /**
   * Log security events
   */
  logSecurity(
    event: string,
    context: LogContext & {
      severity?: 'low' | 'medium' | 'high' | 'critical';
      threat?: string;
      action?: string;
    },
  ): void {
    const message = `Security Event: ${event}`;
    const enrichedContext = {
      ...context,
      operation: 'security',
      category: 'security',
    };

    switch (context.severity) {
      case 'critical':
      case 'high':
        this.error(message, enrichedContext as ErrorLogContext);
        break;
      case 'medium':
        this.warn(message, enrichedContext);
        break;
      default:
        this.log(message, enrichedContext);
    }
  }

  /**
   * Log performance metrics
   */
  logPerformance(
    operation: string,
    context: LogContext & {
      duration: number;
      threshold?: number;
      metrics?: Record<string, number>;
    },
  ): void {
    const isSlowOperation =
      context.threshold && context.duration > context.threshold;
    const message = `Performance: ${operation} took ${context.duration}ms${isSlowOperation ? ' (SLOW)' : ''}`;

    const enrichedContext = {
      ...context,
      operation: 'performance',
      category: 'monitoring',
    };

    if (isSlowOperation) {
      this.warn(message, enrichedContext);
    } else {
      this.debug(message, enrichedContext);
    }
  }

  private enrichMessage(message: string, context?: LogContext): string {
    if (!context) return message;

    const parts: string[] = [message];

    if (context.userId) {
      parts.push(`[User: ${context.userId}]`);
    }

    if (context.operation) {
      parts.push(`[Op: ${context.operation}]`);
    }

    if (context.resource) {
      parts.push(`[Resource: ${context.resource}]`);
    }

    if (context.requestId) {
      parts.push(`[ReqID: ${context.requestId}]`);
    }

    if (context.metadata && Object.keys(context.metadata).length > 0) {
      const metadataStr = Object.entries(context.metadata)
        .map(([key, value]) => `${key}=${value}`)
        .join(', ');
      parts.push(`[Meta: ${metadataStr}]`);
    }

    return parts.join(' ');
  }

  private enrichErrorMessage(
    message: string,
    context?: ErrorLogContext,
  ): string {
    if (!context) return message;

    const parts: string[] = [message];

    if (context.userId) {
      parts.push(`[User: ${context.userId}]`);
    }

    if (context.errorCode) {
      parts.push(`[Code: ${context.errorCode}]`);
    }

    if (context.statusCode) {
      parts.push(`[Status: ${context.statusCode}]`);
    }

    if (context.method && context.url) {
      parts.push(`[${context.method} ${context.url}]`);
    }

    if (context.ip) {
      parts.push(`[IP: ${context.ip}]`);
    }

    if (context.requestId) {
      parts.push(`[ReqID: ${context.requestId}]`);
    }

    if (context.metadata && Object.keys(context.metadata).length > 0) {
      const metadataStr = Object.entries(context.metadata)
        .map(([key, value]) => `${key}=${value}`)
        .join(', ');
      parts.push(`[Meta: ${metadataStr}]`);
    }

    return parts.join(' ');
  }

  /**
   * Create a child logger with default context
   */
  createChild(defaultContext: LogContext): ChildLogger {
    return new ChildLogger(this, defaultContext);
  }
}

/**
 * Child logger that inherits context from parent
 */
export class ChildLogger {
  constructor(
    private parent: AppLoggerService,
    private defaultContext: LogContext,
  ) {}

  log(message: string, context?: LogContext): void {
    this.parent.log(message, { ...this.defaultContext, ...context });
  }

  error(message: string, context?: ErrorLogContext, trace?: string): void {
    this.parent.error(
      message,
      { ...this.defaultContext, ...context } as ErrorLogContext,
      trace,
    );
  }

  warn(message: string, context?: LogContext): void {
    this.parent.warn(message, { ...this.defaultContext, ...context });
  }

  debug(message: string, context?: LogContext): void {
    this.parent.debug(message, { ...this.defaultContext, ...context });
  }

  verbose(message: string, context?: LogContext): void {
    this.parent.verbose(message, { ...this.defaultContext, ...context });
  }
}
