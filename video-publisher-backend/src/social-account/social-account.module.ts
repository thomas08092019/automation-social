import { Module } from '@nestjs/common';
import { SocialAccountService } from './social-account.service';
import { SocialAccountController } from './social-account.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [SocialAccountService],
  controllers: [SocialAccountController],
  exports: [SocialAccountService],
})
export class SocialAccountModule {}
