import { Module } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service';
import { WorkerService } from './worker.service';
import { PrismaModule } from '../common/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { YoutubeUploadService } from '../publishing/services/youtube-upload.service';
import { FacebookReelsUploadService } from '../publishing/services/facebook-reels-upload.service';
import { InstagramReelsUploadService } from '../publishing/services/instagram-reels-upload.service';
import { TiktokUploadService } from '../publishing/services/tiktok-upload.service';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [
    RabbitMQService,
    WorkerService,
    YoutubeUploadService,
    FacebookReelsUploadService,
    InstagramReelsUploadService,
    TiktokUploadService,
  ],
  exports: [RabbitMQService, WorkerService],
})
export class QueueModule {}
