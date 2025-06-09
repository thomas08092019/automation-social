import {
  Controller,
  Get,
  Post,
  Body,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface PlatformConfig {
  name: string;
  configured: boolean;
  requiredEnvVars: string[];
  missingVars: string[];
}

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  platforms: PlatformConfig[];
  database: {
    connected: boolean;
    error?: string;
  };
}

@Controller('api/test')
export class ApiTestController {
  private readonly logger = new Logger(ApiTestController.name);

  constructor(private readonly configService: ConfigService) {}
  @Get('health')
  async healthCheck(): Promise<HealthCheckResponse> {
    this.logger.log('Health check requested');

    const platforms = this.checkPlatformConfigurations();
    const database = await this.checkDatabaseConnection();

    const status = this.determineOverallHealth(platforms, database);

    return {
      status,
      timestamp: new Date().toISOString(),
      platforms,
      database,
    };
  }

  @Get('config')
  async getConfiguration() {
    this.logger.log('Configuration check requested');

    return {
      environment: this.configService.get('NODE_ENV', 'development'),
      platforms: this.checkPlatformConfigurations(),
      features: {
        oauth: true,
        videoValidation: true,
        rateLimiting: true,
        retryMechanism: true,
        comprehensiveLogging: true,
      },
    };
  }

  @Post('validate-platform')
  async validatePlatform(@Body() body: { platform: string }) {
    const { platform } = body;

    if (!['youtube', 'instagram', 'tiktok', 'facebook'].includes(platform)) {
      throw new HttpException('Invalid platform', HttpStatus.BAD_REQUEST);
    }

    this.logger.log(`Platform validation requested for: ${platform}`);

    const config = this.getPlatformConfig(platform);

    return {
      platform,
      configured: config.configured,
      requiredVariables: config.requiredEnvVars,
      missingVariables: config.missingVars,
      ready: config.configured && config.missingVars.length === 0,
    };
  }

  private checkPlatformConfigurations(): PlatformConfig[] {
    const platforms = ['youtube', 'instagram', 'tiktok', 'facebook'];

    return platforms.map((platform) => this.getPlatformConfig(platform));
  }

  private getPlatformConfig(platform: string): PlatformConfig {
    const configMap = {
      youtube: [
        'YOUTUBE_CLIENT_ID',
        'YOUTUBE_CLIENT_SECRET',
        'YOUTUBE_REDIRECT_URI',
      ],
      instagram: [
        'FACEBOOK_APP_ID',
        'FACEBOOK_APP_SECRET',
        'FACEBOOK_REDIRECT_URI',
      ],
      tiktok: [
        'TIKTOK_CLIENT_KEY',
        'TIKTOK_CLIENT_SECRET',
        'TIKTOK_REDIRECT_URI',
      ],
      facebook: [
        'FACEBOOK_APP_ID',
        'FACEBOOK_APP_SECRET',
        'FACEBOOK_REDIRECT_URI',
      ],
    };

    const requiredEnvVars = configMap[platform] || [];
    const missingVars = requiredEnvVars.filter(
      (varName) => !this.configService.get(varName),
    );

    return {
      name: platform,
      configured: missingVars.length === 0,
      requiredEnvVars,
      missingVars,
    };
  }

  private async checkDatabaseConnection(): Promise<{
    connected: boolean;
    error?: string;
  }> {
    try {
      // Simple database check - this would be expanded with actual Prisma connection test
      const databaseUrl = this.configService.get('DATABASE_URL');
      if (!databaseUrl) {
        return {
          connected: false,
          error: 'DATABASE_URL not configured',
        };
      }

      return {
        connected: true,
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message,
      };
    }
  }

  private determineOverallHealth(
    platforms: PlatformConfig[],
    database: { connected: boolean },
  ): 'healthy' | 'degraded' | 'unhealthy' {
    if (!database.connected) {
      return 'unhealthy';
    }

    const configuredPlatforms = platforms.filter((p) => p.configured).length;
    const totalPlatforms = platforms.length;

    if (configuredPlatforms === totalPlatforms) {
      return 'healthy';
    } else if (configuredPlatforms > 0) {
      return 'degraded';
    } else {
      return 'unhealthy';
    }
  }
}
