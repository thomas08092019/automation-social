import { Injectable, Scope } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

// Global AsyncLocalStorage for user context
export const userContextStorage = new AsyncLocalStorage<{ userId: string }>();

@Injectable({ scope: Scope.REQUEST })
export class UserContextService {
  private userId: string | null = null;
  setUserId(userId: string): void {
    this.userId = userId;
  }

  getUserId(): string | null {
    return this.userId;
  }

  hasUser(): boolean {
    return this.userId !== null;
  }

  // Static method to get user ID from AsyncLocalStorage
  static getCurrentUserId(): string | null {
    const context = userContextStorage.getStore();
    return context?.userId || null;
  }

  // Static method to set user context in AsyncLocalStorage
  static setCurrentUserId(userId: string): void {
    const context = userContextStorage.getStore();
    if (context) {
      context.userId = userId;
    }
  }
}
