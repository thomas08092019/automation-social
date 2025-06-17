import { Injectable, UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid or missing token');
    }

    // Set user context on request for middleware compatibility
    const request = context.switchToHttp().getRequest();
    request.currentUserId = user.id || user.userId;

    return user;
  }
}
