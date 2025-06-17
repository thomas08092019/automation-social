import { Module } from '@nestjs/common';
import { SocialAccountService } from './social-account.service';
import { SocialAccountController } from './social-account.controller';
import { AuthModule } from '../auth/auth.module';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [AuthModule, SharedModule],
  providers: [SocialAccountService],
  controllers: [SocialAccountController],
  exports: [SocialAccountService],
})
export class SocialAccountModule {}
