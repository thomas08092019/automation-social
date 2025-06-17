import { Global, Module } from '@nestjs/common';
import { PrismaService } from './database/prisma.service';
import { UserContextService } from './services/user-context.service';
import { UserContextInterceptor } from './interceptors/user-context.interceptor';
import { PaginationService } from './services/pagination.service';
import { EmailService } from './services/email.service';
import { PlatformAdapterFactory } from './adapters/platform-adapter.factory';
import { PlatformIntegrationService } from './services/platform-integration.service';
import { PlatformManagementService } from './services/platform-management.service';
import { ContentOptimizationService } from './services/content-optimization.service';
import { SocialAccountMapper } from './mappers/social-account.mapper';
import { UserMapper } from './mappers/user.mapper';
import { ApiResponseMapper } from './mappers/api-response.mapper';
import { PlatformConfigMapper } from './mappers/platform-config.mapper';
// Phase 5: Error Handling Middleware
import { AppLoggerService } from './services/logger.service';
import { RequestContextInterceptor } from './interceptors/request-context.interceptor';

@Global()
@Module({  providers: [
    PrismaService,
    UserContextService,
    UserContextInterceptor,
    PaginationService,
    EmailService,
    PlatformAdapterFactory,
    PlatformIntegrationService,
    PlatformManagementService,
    ContentOptimizationService,
    // Mappers
    SocialAccountMapper,
    UserMapper,
    ApiResponseMapper,
    PlatformConfigMapper,
    // Phase 5: Error Handling Middleware
    AppLoggerService,
    RequestContextInterceptor,
  ],  exports: [
    PrismaService,
    UserContextService,
    UserContextInterceptor,
    PaginationService,
    EmailService,
    PlatformAdapterFactory,
    PlatformIntegrationService,
    PlatformManagementService,
    ContentOptimizationService,
    // Mappers
    SocialAccountMapper,
    UserMapper,
    ApiResponseMapper,
    PlatformConfigMapper,
    // Phase 5: Error Handling Middleware
    AppLoggerService,
    RequestContextInterceptor,
  ],
})
export class SharedModule {}
