import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { UserContextService } from '../services/user-context.service';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    this.setupAuditTrailMiddleware();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
  private setupAuditTrailMiddleware() {
    // Middleware for CREATE operations
    this.$use(async (params, next) => {
      if (params.action === 'create' || params.action === 'createMany') {
        const userId = UserContextService.getCurrentUserId();

        if (userId) {
          if (params.action === 'create' && params.args.data) {
            params.args.data.createdBy = userId;
            params.args.data.updatedBy = userId;
          } else if (params.action === 'createMany' && params.args.data) {
            params.args.data = params.args.data.map((item: any) => ({
              ...item,
              createdBy: userId,
              updatedBy: userId,
            }));
          }
        }
      }
      return next(params);
    }); // Middleware for UPDATE operations
    this.$use(async (params, next) => {
      if (params.action === 'update' || params.action === 'updateMany') {
        const userId = UserContextService.getCurrentUserId();
        if (userId) {
          if (params.args.data) {
            params.args.data.updatedBy = userId;
          }
        }
      }
      return next(params);
    });

    // Middleware for UPSERT operations
    this.$use(async (params, next) => {
      if (params.action === 'upsert') {
        const userId = UserContextService.getCurrentUserId();
        if (userId) {
          if (params.args.create) {
            params.args.create.createdBy = userId;
            params.args.create.updatedBy = userId;
          }
          if (params.args.update) {
            params.args.update.updatedBy = userId;
          }
        }
      }
      return next(params);
    }); // Middleware for soft DELETE operations
    this.$use(async (params, next) => {
      if (params.action === 'delete') {
        const userId = UserContextService.getCurrentUserId();
        // Convert DELETE to UPDATE with soft delete
        params.action = 'update';
        params.args.data = {
          deletedAt: new Date(),
          deletedBy: userId,
        };
      }

      if (params.action === 'deleteMany') {
        const userId = UserContextService.getCurrentUserId();
        // Convert DELETE to UPDATE with soft delete
        params.action = 'updateMany';
        params.args.data = {
          deletedAt: new Date(),
          deletedBy: userId,
        };
      }

      return next(params);
    });

    // Middleware for filtering soft-deleted records in READ operations
    this.$use(async (params, next) => {
      // List of models that support soft delete (have deletedAt field)
      const softDeleteModels = ['user', 'socialAccount'];

      // Check if this operation is on a model that supports soft delete
      const isSoftDeleteModel = softDeleteModels.includes(
        params.model?.toLowerCase() || '',
      );

      if (isSoftDeleteModel) {
        if (params.action === 'findUnique' || params.action === 'findFirst') {
          // Only add filter if deletedAt is not explicitly specified
          if (!params.args.where?.hasOwnProperty('deletedAt')) {
            params.args.where = {
              ...params.args.where,
              deletedAt: null,
            };
          }
        }

        if (params.action === 'findMany') {
          // Add deletedAt filter to where clause
          if (params.args.where) {
            // Only add filter if deletedAt is not explicitly specified
            if (!params.args.where.hasOwnProperty('deletedAt')) {
              params.args.where.deletedAt = null;
            }
          } else {
            params.args.where = { deletedAt: null };
          }
        }

        if (params.action === 'count') {
          // Add deletedAt filter to count
          if (params.args.where) {
            // Only add filter if deletedAt is not explicitly specified
            if (!params.args.where.hasOwnProperty('deletedAt')) {
              params.args.where.deletedAt = null;
            }
          } else {
            params.args.where = { deletedAt: null };
          }
        }

        if (params.action === 'aggregate' || params.action === 'groupBy') {
          // Add deletedAt filter to aggregation operations
          if (params.args.where) {
            if (!params.args.where.hasOwnProperty('deletedAt')) {
              params.args.where.deletedAt = null;
            }
          } else {
            params.args.where = { deletedAt: null };
          }
        }
      }

      return next(params);
    });
  }

  // Method to force delete (bypass soft delete)
  async forceDelete(model: string, where: any) {
    return (this as any)[model].delete({ where });
  } // Method to restore soft-deleted records
  async restore(model: string, where: any) {
    const userId = UserContextService.getCurrentUserId();
    return (this as any)[model].update({
      where: { ...where, deletedAt: { not: null } },
      data: {
        deletedAt: null,
        deletedBy: null,
        updatedBy: userId,
      },
    });
  }

  // Method to find soft-deleted records
  async findDeleted(model: string, args: any = {}) {
    return (this as any)[model].findMany({
      ...args,
      where: {
        ...args.where,
        deletedAt: { not: null },
      },
    });
  }

  // Method to find all records (including soft-deleted)
  async findAll(model: string, args: any = {}) {
    return (this as any)[model].findMany(args);
  }
}
