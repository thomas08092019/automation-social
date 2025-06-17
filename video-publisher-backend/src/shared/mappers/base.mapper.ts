/**
 * Base mapper class providing common mapping utilities
 */
export abstract class BaseMapper<TEntity, TDto> {
  /**
   * Map single entity to DTO
   */
  abstract mapToDto(entity: TEntity): TDto;

  /**
   * Map array of entities to DTOs
   */
  mapToDtoArray(entities: TEntity[]): TDto[] {
    return entities.map(entity => this.mapToDto(entity));
  }

  /**
   * Map entity with optional properties safely
   */
  protected mapOptional<T>(value: T | null | undefined): T | null {
    return value ?? null;
  }

  /**
   * Map date to ISO string or null
   */
  protected mapDate(date: Date | null | undefined): string | null {
    return date ? date.toISOString() : null;
  }

  /**
   * Map boolean with default value
   */
  protected mapBoolean(value: boolean | null | undefined, defaultValue: boolean = false): boolean {
    return value ?? defaultValue;
  }

  /**
   * Map metadata object safely
   */
  protected mapMetadata(metadata: any): Record<string, any> {
    if (!metadata) return {};
    if (typeof metadata === 'string') {
      try {
        return JSON.parse(metadata);
      } catch {
        return {};
      }
    }
    return metadata || {};
  }

  /**
   * Calculate expiration status
   */
  protected calculateExpirationStatus(expiresAt: Date | null): {
    isExpired: boolean;
    daysUntilExpiry: number | null;
  } {
    if (!expiresAt) {
      return {
        isExpired: false,
        daysUntilExpiry: null,
      };
    }

    const now = new Date();
    const expiration = new Date(expiresAt);
    const isExpired = now > expiration;
    const daysUntilExpiry = Math.max(0, Math.ceil((expiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      isExpired,
      daysUntilExpiry: isExpired ? 0 : daysUntilExpiry,
    };
  }
}
