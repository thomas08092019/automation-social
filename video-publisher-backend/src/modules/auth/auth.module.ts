import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../users/user.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { OAuthService } from './oauth.service';
import { OAuthConfigService } from './oauth-config.service';
import { UserInfoService } from './user-info.service';
import { TokenService } from './token.service';
import { PasswordService } from './password.service';
import { FirebaseAuthService } from './firebase-auth.service';
import { FirebaseConfig } from '../../config/firebase.config';
import { SharedModule } from '../../shared/shared.module';
import { OAuthCallbackExceptionFilter } from '../../shared/filters/oauth-callback.filter';

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
    TokenService,
    PasswordService,
    OAuthService,
    OAuthConfigService,
    UserInfoService,
    FirebaseAuthService,
    FirebaseConfig,
    {
      provide: APP_FILTER,
      useClass: OAuthCallbackExceptionFilter,
    },
  ],
  controllers: [AuthController],
  exports: [
    AuthService,
    JwtStrategy,
    TokenService,
    PasswordService,
    OAuthService,
    OAuthConfigService,
    UserInfoService,
    FirebaseAuthService,
    FirebaseConfig,
  ],
})
export class AuthModule {}
