import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { UserContextService } from './user-context.service';
import { UserContextInterceptor } from './user-context.interceptor';

@Global()
@Module({
  providers: [PrismaService, UserContextService, UserContextInterceptor],
  exports: [PrismaService, UserContextService, UserContextInterceptor],
})
export class PrismaModule {}
