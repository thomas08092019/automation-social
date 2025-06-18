import { Injectable } from '@nestjs/common';
import {
  PaginationQueryDto,
  PaginationMetaDto,
  PaginatedResponseDto,
} from '../dto/pagination.dto';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResult<T> {
  data: T[];
  meta: PaginationMetaDto;
}

@Injectable()
export class PaginationService {
  /**
   * Paginate database query with Prisma
   */
  async paginate<T>({
    model,
    where = {},
    orderBy = {},
    page = 1,
    limit = 10,
    select = undefined,
    include = undefined,
  }: {
    model: any;
    where?: any;
    orderBy?: any;
    page?: number;
    limit?: number;
    select?: any;
    include?: any;
  }): Promise<{
    data: T[];
    pagination: PaginationMetaDto;
  }> {
    const validPage = Math.max(1, page);
    const validLimit = Math.max(1, Math.min(100, limit));

    const skip = (validPage - 1) * validLimit;
    const take = validLimit;

    // Get total count
    const total = await model.count({ where });

    // Get paginated data
    const data = await model.findMany({
      where,
      orderBy,
      skip,
      take,
      ...(select && { select }),
      ...(include && { include }),
    });

    const totalPages = Math.ceil(total / validLimit);
    const hasNext = validPage < totalPages;
    const hasPrev = validPage > 1;

    const pagination: PaginationMetaDto = {
      page: validPage,
      limit: validLimit,
      total,
      totalPages,
      hasNext,
      hasPrev,
      nextPage: hasNext ? validPage + 1 : undefined,
      prevPage: hasPrev ? validPage - 1 : undefined,
    };

    return { data, pagination };
  }

  /**
   * Apply pagination to data array
   * @param data - Array of data to paginate
   * @param options - Pagination options
   * @returns Paginated result with metadata
   */
  static paginate<T>(
    data: T[],
    options: PaginationOptions,
  ): PaginatedResponseDto<T> {
    const { page = 1, limit = 10 } = options;

    // Ensure page and limit are positive numbers
    const validPage = Math.max(1, page);
    const validLimit = Math.max(1, Math.min(100, limit)); // Max 100 items per page

    const total = data.length;
    const totalPages = Math.ceil(total / validLimit);
    const startIndex = (validPage - 1) * validLimit;
    const endIndex = startIndex + validLimit;

    const paginatedData = data.slice(startIndex, endIndex);

    const hasNextPage = validPage < totalPages;
    const hasPrevPage = validPage > 1;
    const meta: PaginationMetaDto = {
      page: validPage,
      limit: validLimit,
      total,
      totalPages,
      hasNext: hasNextPage,
      hasPrev: hasPrevPage,
      nextPage: hasNextPage ? validPage + 1 : undefined,
      prevPage: hasPrevPage ? validPage - 1 : undefined,
    };

    return new PaginatedResponseDto(paginatedData, meta);
  }

  /**
   * Apply pagination to database query results
   * @param data - Array of data from database
   * @param totalCount - Total count from database
   * @param options - Pagination options
   * @returns Paginated result with metadata
   */
  static paginateFromQuery<T>(
    data: T[],
    totalCount: number,
    options: PaginationOptions,
  ): PaginatedResponseDto<T> {
    const { page = 1, limit = 10 } = options;

    const validPage = Math.max(1, page);
    const validLimit = Math.max(1, Math.min(100, limit));

    const totalPages = Math.ceil(totalCount / validLimit);
    const hasNextPage = validPage < totalPages;
    const hasPrevPage = validPage > 1;
    const meta: PaginationMetaDto = {
      page: validPage,
      limit: validLimit,
      total: totalCount,
      totalPages,
      hasNext: hasNextPage,
      hasPrev: hasPrevPage,
      nextPage: hasNextPage ? validPage + 1 : undefined,
      prevPage: hasPrevPage ? validPage - 1 : undefined,
    };

    return new PaginatedResponseDto(data, meta);
  }

  /**
   * Calculate skip and take values for database queries
   * @param options - Pagination options
   * @returns Object with skip and take values
   */
  static getPaginationParams(options: PaginationOptions): {
    skip: number;
    take: number;
  } {
    const { page = 1, limit = 10 } = options;

    const validPage = Math.max(1, page);
    const validLimit = Math.max(1, Math.min(100, limit));

    return {
      skip: (validPage - 1) * validLimit,
      take: validLimit,
    };
  }

  /**
   * Generate order by clause for database queries
   * @param options - Pagination options
   * @returns Prisma order by object
   */
  static getOrderBy(
    options: PaginationOptions,
  ): Record<string, 'asc' | 'desc'> {
    const { sortBy = 'createdAt', sortOrder = 'desc' } = options;

    return {
      [sortBy]: sortOrder,
    };
  }
}
