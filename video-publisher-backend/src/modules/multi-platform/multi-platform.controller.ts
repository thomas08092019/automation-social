import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { SocialPlatform } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  PlatformManagementService,
  BatchPostRequest,
} from '../../shared/services/platform-management.service';
import { ContentOptimizationService } from '../../shared/services/content-optimization.service';
import { PlatformAdapterFactory } from '../../shared/adapters/platform-adapter.factory';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';

class CreateMultiPlatformPostDto {
  platforms: SocialPlatform[];
  content: {
    text?: string;
    mediaUrls?: string[];
    mediaType?: 'image' | 'video';
    scheduledTime?: Date;
  };
  options?: {
    skipValidation?: boolean;
    continueOnError?: boolean;
    optimizeContent?: boolean;
  };
  preferences?: {
    preserveHashtags?: boolean;
    maxHashtags?: number;
    tone?: 'professional' | 'casual' | 'friendly';
    includeEmojis?: boolean;
  };
}

class OptimizeContentDto {
  platforms: SocialPlatform[];
  content: {
    text?: string;
    mediaUrls?: string[];
    mediaType?: 'image' | 'video';
    hashtags?: string[];
  };
  preferences?: {
    preserveHashtags?: boolean;
    maxHashtags?: number;
    tone?: 'professional' | 'casual' | 'friendly';
    includeEmojis?: boolean;
  };
}

class ValidateContentDto {
  platforms: SocialPlatform[];
  content: {
    text?: string;
    mediaUrls?: string[];
    mediaType?: 'image' | 'video';
  };
}

@ApiTags('Multi-Platform Content')
@Controller('multi-platform')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class MultiPlatformController {
  constructor(
    private readonly platformManagementService: PlatformManagementService,
    private readonly contentOptimizationService: ContentOptimizationService,
    private readonly platformAdapterFactory: PlatformAdapterFactory,
  ) {}

  @Post('post')
  @ApiOperation({ summary: 'Create post across multiple platforms' })
  @ApiBody({ type: CreateMultiPlatformPostDto })
  @ApiResponse({ status: 201, description: 'Posts created successfully' })
  async createMultiPlatformPost(@Body() dto: CreateMultiPlatformPostDto) {
    const { platforms, content, options = {} } = dto;

    // Optimize content if requested
    let optimizedContent = content;
    if (options.optimizeContent) {
      const optimization =
        await this.contentOptimizationService.optimizeForMultiplePlatforms(
          platforms,
          content,
          dto.preferences,
        );

      // Use the first platform's optimization as base, or implement smarter logic
      const firstPlatform = platforms[0];
      if (optimization.optimizedContent[firstPlatform]) {
        optimizedContent = {
          ...content,
          text:
            optimization.optimizedContent[firstPlatform].optimizedText ||
            content.text,
        };
      }
    }

    const batchRequest: BatchPostRequest = {
      platforms,
      content: optimizedContent,
      options: {
        skipValidation: options.skipValidation,
        continueOnError: options.continueOnError,
      },
    };

    const result = await this.platformManagementService.batchPost(batchRequest);

    return {
      success: result.success,
      results: result.results,
      summary: result.summary,
      message: result.success
        ? 'Posts created successfully across all platforms'
        : 'Some posts failed to create',
    };
  }

  @Post('optimize')
  @ApiOperation({ summary: 'Optimize content for multiple platforms' })
  @ApiBody({ type: OptimizeContentDto })
  @ApiResponse({ status: 200, description: 'Content optimized successfully' })
  async optimizeContent(@Body() dto: OptimizeContentDto) {
    const { platforms, content, preferences } = dto;

    const optimization =
      await this.contentOptimizationService.optimizeForMultiplePlatforms(
        platforms,
        content,
        preferences,
      );

    return {
      success: true,
      originalContent: optimization.originalContent,
      optimizedContent: optimization.optimizedContent,
      summary: optimization.summary,
      message: 'Content optimized successfully for all platforms',
    };
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate content against platform requirements' })
  @ApiBody({ type: ValidateContentDto })
  @ApiResponse({ status: 200, description: 'Content validated successfully' })
  async validateContent(@Body() dto: ValidateContentDto) {
    const { platforms, content } = dto;

    const validations =
      await this.platformManagementService.validateContentForPlatforms(
        platforms,
        content,
      );

    const summary = {
      total: validations.length,
      valid: validations.filter((v) => v.valid).length,
      invalid: validations.filter((v) => !v.valid).length,
    };

    return {
      success: summary.invalid === 0,
      validations,
      summary,
      message:
        summary.invalid === 0
          ? 'Content is valid for all platforms'
          : `Content has validation issues for ${summary.invalid} platform(s)`,
    };
  }

  @Get('capabilities')
  @ApiOperation({ summary: 'Get platform capabilities overview' })
  @ApiResponse({
    status: 200,
    description: 'Platform capabilities retrieved successfully',
  })
  async getPlatformCapabilities() {
    const capabilities = this.platformAdapterFactory.getPlatformCapabilities();

    return {
      success: true,
      capabilities,
      message: 'Platform capabilities retrieved successfully',
    };
  }

  @Get('strategy')
  @ApiOperation({ summary: 'Get optimal posting strategy for platforms' })
  @ApiResponse({
    status: 200,
    description: 'Posting strategy retrieved successfully',
  })
  async getPostingStrategy(@Query('platforms') platformsQuery: string) {
    const platforms = platformsQuery.split(',') as SocialPlatform[];

    const strategy =
      this.platformManagementService.getOptimalPostingStrategy(platforms);

    return {
      success: true,
      strategy: strategy.recommendations,
      message: 'Posting strategy retrieved successfully',
    };
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get platform analytics summary' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getPlatformAnalytics(
    @Query('platforms') platformsQuery: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const platforms = platformsQuery.split(',') as SocialPlatform[];
    const dateRange = {
      start: new Date(startDate),
      end: new Date(endDate),
    };

    const analytics = await this.platformManagementService.getPlatformAnalytics(
      platforms,
      dateRange,
    );

    return {
      success: true,
      analytics,
      dateRange,
      message: 'Platform analytics retrieved successfully',
    };
  }

  @Get('supported-formats')
  @ApiOperation({ summary: 'Get supported formats for platforms' })
  @ApiResponse({
    status: 200,
    description: 'Supported formats retrieved successfully',
  })
  async getSupportedFormats(
    @Query('platform') platform: SocialPlatform,
    @Query('mediaType') mediaType: 'video' | 'image',
  ) {
    const formats = this.platformAdapterFactory.getSupportedFormats(
      platform,
      mediaType,
    );

    return {
      success: true,
      platform,
      mediaType,
      supportedFormats: formats,
      message: `Supported ${mediaType} formats for ${platform} retrieved successfully`,
    };
  }

  @Post('content-variations')
  @ApiOperation({ summary: 'Generate content variations for A/B testing' })
  @ApiResponse({
    status: 200,
    description: 'Content variations generated successfully',
  })
  async generateContentVariations(
    @Body()
    dto: {
      platform: SocialPlatform;
      content: any;
      variationCount?: number;
    },
  ) {
    const { platform, content, variationCount = 3 } = dto;

    const variations =
      await this.contentOptimizationService.generateContentVariations(
        platform,
        content,
        variationCount,
      );

    return {
      success: true,
      platform,
      originalContent: content,
      variations,
      message: `${variations.length} content variations generated successfully`,
    };
  }

  @Get('platforms-by-capability')
  @ApiOperation({ summary: 'Get platforms that support specific capability' })
  @ApiResponse({ status: 200, description: 'Platforms retrieved successfully' })
  async getPlatformsByCapability(@Query('capability') capability: string) {
    const adapters = this.platformAdapterFactory.getAdaptersByCapability(
      capability as any,
    );
    const platforms = adapters
      .map((adapter) => {
        // Find platform for this adapter
        const allAdapters = this.platformAdapterFactory.getAllAdapters();
        for (const [platform, adapterInstance] of allAdapters.entries()) {
          if (adapterInstance === adapter) {
            return platform;
          }
        }
        return null;
      })
      .filter(Boolean);

    return {
      success: true,
      capability,
      supportedPlatforms: platforms,
      count: platforms.length,
      message: `Found ${platforms.length} platform(s) supporting ${capability}`,
    };
  }

  @Get('platforms-by-media')
  @ApiOperation({ summary: 'Get platforms that support specific media type' })
  @ApiResponse({ status: 200, description: 'Platforms retrieved successfully' })
  async getPlatformsByMediaSupport(
    @Query('mediaType') mediaType: 'text' | 'images' | 'videos',
  ) {
    const platforms =
      this.platformAdapterFactory.getPlatformsByMediaSupport(mediaType);

    return {
      success: true,
      mediaType,
      supportedPlatforms: platforms,
      count: platforms.length,
      message: `Found ${platforms.length} platform(s) supporting ${mediaType}`,
    };
  }
}
