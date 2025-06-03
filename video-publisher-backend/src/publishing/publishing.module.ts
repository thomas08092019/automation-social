import { Module } from '@nestjs/common';
import { PublishingService } from './publishing.service';
import { BatchPublishingService } from './batch-publishing.service';
import { PublishingController } from './publishing.controller';
import { VideoModule } from '../video/video.module';
import { SocialAccountModule } from '../social-account/social-account.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [VideoModule, SocialAccountModule, QueueModule],
  providers: [PublishingService, BatchPublishingService],
  controllers: [PublishingController],
  exports: [PublishingService, BatchPublishingService],
})
export class PublishingModule {}
