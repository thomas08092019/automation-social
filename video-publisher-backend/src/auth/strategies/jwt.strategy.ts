import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {  constructor(private configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET');
    
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }
  async validate(payload: any) {
    // Simple validation - just return the payload
    if (!payload.userId) {
      throw new UnauthorizedException('Invalid token - no userId');
    }
    
    return { 
      id: payload.userId, 
      email: payload.email,
      userId: payload.userId 
    };
  }
}
