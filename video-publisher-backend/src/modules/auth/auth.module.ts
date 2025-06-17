import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../users/user.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { SocialConnectService } from './social-connect.service';
import { OAuthService } from './oauth.service';
import { OAuthConfigService } from './oauth-config.service';
import { UserInfoService } from './user-info.service';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [
    UserModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    SharedModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '1d',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    SocialConnectService,
    OAuthService,
    OAuthConfigService,
    UserInfoService,
  ],
  controllers: [AuthController],
  exports: [
    AuthService,
    JwtStrategy,
    SocialConnectService,
    OAuthService,
    OAuthConfigService,
    UserInfoService,
  ],
})
export class AuthModule {}
