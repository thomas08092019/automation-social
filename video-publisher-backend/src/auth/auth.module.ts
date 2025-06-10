import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TokenManagerService } from './token-manager.service';
import { SocialAppService } from './social-app.service';
import { EnhancedSocialAppService } from './enhanced-social-app.service';
import { OAuthAuthorizationService } from './oauth-authorization.service';
import { PlatformUserInfoService } from './platform-user-info.service';
import { SocialAppsController } from './social-apps.controller';
import { PrismaModule } from '../common/prisma.module';
import { OAuthService } from 'src/common/services/oauth.service';
import { EmailService } from 'src/common/services/email.service';

@Module({
  imports: [
    UserModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    TokenManagerService,
    SocialAppService,
    EnhancedSocialAppService,
    OAuthAuthorizationService,
    PlatformUserInfoService,
    OAuthService,
    EmailService,
  ],
  controllers: [AuthController, SocialAppsController],
  exports: [
    AuthService,
    JwtStrategy,
    TokenManagerService,
    SocialAppService,
    EnhancedSocialAppService,
    OAuthAuthorizationService,
    PlatformUserInfoService,
    OAuthService,
    EmailService,
  ],
})
export class AuthModule {}
