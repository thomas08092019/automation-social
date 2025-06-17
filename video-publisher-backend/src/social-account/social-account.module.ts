import { Module } from '@nestjs/common';
import { SocialAccountService } from './social-account.service';
import { SocialAccountController } from './social-account.controller';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../common/prisma.module';

@Module({
  imports: [AuthModule, PrismaModule],
  providers: [SocialAccountService],
  controllers: [SocialAccountController],
  exports: [SocialAccountService],
})
export class SocialAccountModule {}
