import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Scope,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { UserContextService, userContextStorage } from '../services/user-context.service';

@Injectable({ scope: Scope.REQUEST })
export class UserContextInterceptor implements NestInterceptor {
  constructor(private readonly userContextService: UserContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // Extract user ID from JWT payload (set by JwtStrategy)
    try {
      if (request.user) {
        // Handle both string userId and object with id property
        const userId =
          typeof request.user === 'string'
            ? request.user
            : request.user.id || request.user.userId;
        if (userId && this.userContextService) {
          this.userContextService.setUserId(userId);

          // Run the request within AsyncLocalStorage context
          return userContextStorage.run({ userId }, () => {
            return next.handle();
          });
        }
      }
    } catch (error) {
      // Don't throw error - just continue without setting user context
    }

    return next.handle();
  }
}
