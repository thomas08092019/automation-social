import { Injectable } from '@nestjs/common';
import { PaginatedResponseDto } from '../dto/pagination.dto';

@Injectable()
export class ApiResponseMapper {
  
  /**
   * Create success response
   */
  success<T>(data: T, message?: string): {
    success: boolean;
    data: T;
    message?: string;
  } {
    return {
      success: true,
      data,
      ...(message && { message }),
    };
  }

  /**
   * Create error response
   */
  error(message: string, errors?: any[]): {
    success: boolean;
    message: string;
    errors?: any[];
  } {
    return {
      success: false,
      message,
      ...(errors && { errors }),
    };
  }
  /**
   * Create paginated response  
   */
  paginated<T>(
    data: T[],
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    },
    message?: string
  ): {
    success: boolean;
    data: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    message?: string;
  } {
    return {
      success: true,
      data,
      pagination,
      ...(message && { message }),
    };
  }

  /**
   * Create validation error response
   */
  validationError(errors: Array<{
    field: string;
    message: string;
    value?: any;
  }>): {
    success: boolean;
    message: string;
    validationErrors: Array<{
      field: string;
      message: string;
      value?: any;
    }>;
  } {
    return {
      success: false,
      message: 'Validation failed',
      validationErrors: errors,
    };
  }

  /**
   * Create not found response
   */
  notFound(resource: string, id?: string): {
    success: boolean;
    message: string;
    resource: string;
  } {
    return {
      success: false,
      message: id ? `${resource} with ID ${id} not found` : `${resource} not found`,
      resource,
    };
  }

  /**
   * Create unauthorized response
   */
  unauthorized(message: string = 'Unauthorized access'): {
    success: boolean;
    message: string;
  } {
    return {
      success: false,
      message,
    };
  }

  /**
   * Create forbidden response
   */
  forbidden(message: string = 'Access forbidden'): {
    success: boolean;
    message: string;
  } {
    return {
      success: false,
      message,
    };
  }

  /**
   * Create conflict response
   */
  conflict(message: string, conflictingField?: string): {
    success: boolean;
    message: string;
    conflictingField?: string;
  } {
    return {
      success: false,
      message,
      ...(conflictingField && { conflictingField }),
    };
  }

  /**
   * Create operation result response
   */
  operationResult(
    success: boolean,
    operation: string,
    data?: any,
    message?: string
  ): {
    success: boolean;
    operation: string;
    data?: any;
    message?: string;
  } {
    return {
      success,
      operation,
      ...(data && { data }),
      message: message || (success ? `${operation} completed successfully` : `${operation} failed`),
    };
  }

  /**
   * Create batch operation response
   */
  batchResult<T>(
    results: Array<{
      success: boolean;
      data?: T;
      error?: string;
    }>,
    operation: string
  ): {
    success: boolean;
    operation: string;
    results: Array<{
      success: boolean;
      data?: T;
      error?: string;
    }>;
    summary: {
      total: number;
      successful: number;
      failed: number;
    };
  } {
    const summary = {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    };

    return {
      success: summary.failed === 0,
      operation,
      results,
      summary,
    };
  }

  /**
   * Create analytics response
   */
  analytics<T>(
    data: T,
    period: {
      start: Date;
      end: Date;
    },
    metrics: string[]
  ): {
    success: boolean;
    data: T;
    period: {
      start: string;
      end: string;
    };
    metrics: string[];
    generatedAt: string;
  } {
    return {
      success: true,
      data,
      period: {
        start: period.start.toISOString(),
        end: period.end.toISOString(),
      },
      metrics,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Create connection status response
   */
  connectionStatus(
    platform: string,
    connected: boolean,
    accountInfo?: {
      accountId: string;
      accountName: string;
      lastSync?: Date;
    }
  ): {
    success: boolean;
    platform: string;
    connected: boolean;
    accountInfo?: {
      accountId: string;
      accountName: string;
      lastSync?: string;
    };
  } {
    return {
      success: true,
      platform,
      connected,
      ...(accountInfo && {
        accountInfo: {
          ...accountInfo,
          lastSync: accountInfo.lastSync?.toISOString(),
        }
      }),
    };
  }
}
