import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule, UserContextInterceptor } from './common';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { SocialAccountModule } from './social-account/social-account.module';
import { VideoModule } from './video/video.module';
import { PublishingModule } from './publishing/publishing.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    PrismaModule,
    UserModule,
    SocialAccountModule,
    VideoModule,
    PublishingModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: UserContextInterceptor,
    },
  ],
})
export class AppModule {}
