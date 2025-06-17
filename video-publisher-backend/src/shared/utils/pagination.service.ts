import { Injectable } from '@nestjs/common';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface PaginateParams {
  model: any;
  where?: any;
  orderBy?: any;
  page?: number;
  limit?: number;
  select?: any;
  include?: any;
}

@Injectable()
export class PaginationService {
  async paginate<T>(params: PaginateParams): Promise<PaginationResult<T>> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(Math.max(1, params.limit || 10), 100);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      params.model.findMany({
        where: params.where,
        orderBy: params.orderBy,
        skip,
        take: limit,
        select: params.select,
        include: params.include,
      }),
      params.model.count({
        where: params.where,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }
}
