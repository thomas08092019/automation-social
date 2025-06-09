import { Module } from '@nestjs/common';
import { PublishingService } from './publishing.service';
import { BatchPublishingService } from './batch-publishing.service';
import { PublishingController } from './publishing.controller';
import { ApiTestController } from './api-test.controller';
import { VideoModule } from '../video/video.module';
import { SocialAccountModule } from '../social-account/social-account.module';
import { QueueModule } from '../queue/queue.module';
import { PrismaModule } from '../common/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { YoutubeUploadService } from './services/youtube-upload.service';
import { FacebookReelsUploadService } from './services/facebook-reels-upload.service';
import { InstagramReelsUploadService } from './services/instagram-reels-upload.service';
import { TiktokUploadService } from './services/tiktok-upload.service';

@Module({
  imports: [
    VideoModule,
    SocialAccountModule,
    QueueModule,
    PrismaModule,
    AuthModule,
  ],
  providers: [
    PublishingService,
    BatchPublishingService,
    YoutubeUploadService,
    FacebookReelsUploadService,
    InstagramReelsUploadService,
    TiktokUploadService,
  ],
  controllers: [PublishingController, ApiTestController],
  exports: [
    PublishingService,
    BatchPublishingService,
    YoutubeUploadService,
    FacebookReelsUploadService,
    InstagramReelsUploadService,
    TiktokUploadService,
  ],
})
export class PublishingModule {}
