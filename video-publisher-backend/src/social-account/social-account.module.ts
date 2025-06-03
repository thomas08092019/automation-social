import { Module } from '@nestjs/common';
import { SocialAccountService } from './social-account.service';
import { SocialAccountController } from './social-account.controller';

@Module({
  providers: [SocialAccountService],
  controllers: [SocialAccountController],
  exports: [SocialAccountService],
})
export class SocialAccountModule {}
