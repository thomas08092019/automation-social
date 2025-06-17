import { Global, Module } from '@nestjs/common';
import { PrismaService } from './database/prisma.service';
import { UserContextService } from './services/user-context.service';
import { UserContextInterceptor } from './interceptors/user-context.interceptor';
import { PaginationService } from './services/pagination.service';
import { EmailService } from './services/email.service';

@Global()
@Module({
  providers: [
    PrismaService,
    UserContextService,
    UserContextInterceptor,
    PaginationService,
    EmailService,
  ],
  exports: [
    PrismaService,
    UserContextService,
    UserContextInterceptor,
    PaginationService,
    EmailService,
  ],
})
export class SharedModule {}
