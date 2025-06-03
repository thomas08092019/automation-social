import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { SocialAccountModule } from './social-account/social-account.module';
import { VideoModule } from './video/video.module';
import { PublishingModule } from './publishing/publishing.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    SocialAccountModule,
    VideoModule,
    PublishingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
