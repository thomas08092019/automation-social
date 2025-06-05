import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { EnhancedSocialAppService, CreateSocialAppDto } from './enhanced-social-app.service';
import { SocialPlatform } from '@prisma/client';

interface CreateAppRequest extends CreateSocialAppDto {}

interface LinkAccountRequest {
  socialAccountId: string;
  socialAppId: string;
}

interface ImportDefaultsRequest {
  platforms: SocialPlatform[];
}

@Controller('api/social-apps')
@UseGuards(JwtAuthGuard)
export class SocialAppsController {
  constructor(private enhancedSocialAppService: EnhancedSocialAppService) {}

  /**
   * GET /api/social-apps
   * Lấy danh sách app configurations của user
   */  @Get()
  async getUserApps(
    @Request() req,
    @Query('platform') platform?: SocialPlatform,
  ) {
    return this.enhancedSocialAppService.getUserApps(req.user.id, platform);
  }

  /**
   * POST /api/social-apps
   * Tạo app configuration mới
   */  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createApp(
    @Request() req,
    @Body() createAppDto: CreateAppRequest,
  ) {
    return this.enhancedSocialAppService.createApp(req.user.id, createAppDto);
  }

  /**
   * PUT /api/social-apps/:appId
   * Cập nhật app configuration
   */  @Put(':appId')
  async updateApp(
    @Request() req,
    @Param('appId') appId: string,
    @Body() updateData: Partial<CreateAppRequest>,
  ) {
    return this.enhancedSocialAppService.updateApp(req.user.id, appId, updateData);
  }

  /**
   * DELETE /api/social-apps/:appId
   * Xóa app configuration
   */  @Delete(':appId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteApp(
    @Request() req,
    @Param('appId') appId: string,
  ) {
    await this.enhancedSocialAppService.deleteApp(req.user.id, appId);
  }
  /**
   * POST /api/social-apps/validate
   * Validate app credentials
   */
  @Post('validate')
  async validateApp(
    @Body() data: { appId: string; appSecret: string; platform: SocialPlatform; redirectUri?: string },
  ) {
    return this.enhancedSocialAppService.validateAppConfig(
      data.appId,
      data.appSecret,
      data.platform,
    );
  }

  /**
   * POST /api/social-apps/link-account
   * Liên kết social account với app
   */  @Post('link-account')
  async linkAccount(
    @Request() req,
    @Body() linkData: LinkAccountRequest,
  ) {
    return this.enhancedSocialAppService.linkAccountToApp(
      linkData.socialAccountId,
      linkData.socialAppId,
      req.user.id,
    );
  }

  /**
   * POST /api/social-apps/unlink-account/:accountId
   * Bỏ liên kết social account khỏi app
   */  @Post('unlink-account/:accountId')
  async unlinkAccount(
    @Request() req,
    @Param('accountId') accountId: string,
  ) {
    return this.enhancedSocialAppService.unlinkAccountFromApp(
      accountId,
      req.user.id,
    );
  }

  /**
   * POST /api/social-apps/import-defaults
   * Nhập app configurations từ system defaults
   */  @Post('import-defaults')
  async importDefaults(
    @Request() req,
    @Body() importData: ImportDefaultsRequest,
  ) {
    return this.enhancedSocialAppService.importSystemDefaults(
      req.user.id,
      importData.platforms,
    );
  }

  /**
   * GET /api/social-apps/stats
   * Lấy thống kê apps của user
   */  @Get('stats')
  async getUserStats(@Request() req) {
    return this.enhancedSocialAppService.getUserAppStats(req.user.id);
  }

  /**
   * GET /api/social-apps/health-check
   * Kiểm tra health của tất cả apps
   */  @Get('health-check')
  async checkAppsHealth(@Request() req) {
    return this.enhancedSocialAppService.checkUserAppsHealth(req.user.id);
  }

  /**
   * GET /api/social-apps/:appId/health
   * Kiểm tra health của một app cụ thể
   */  @Get(':appId/health')
  async checkAppHealth(
    @Request() req,
    @Param('appId') appId: string,
  ) {
    return this.enhancedSocialAppService.checkAppHealth(req.user.id, appId);
  }

  /**
   * PUT /api/social-apps/:appId/default
   * Set app as default for its platform
   */  @Put(':appId/default')
  async setDefaultApp(
    @Request() req,
    @Param('appId') appId: string,
  ) {
    return this.enhancedSocialAppService.setDefaultApp(req.user.id, appId);
  }

  /**
   * GET /api/social-apps/:appId/config
   * Lấy app config cho specific use case
   */  @Get(':appId/config')
  async getAppConfig(
    @Request() req,
    @Param('appId') appId: string,
    @Query('platform') platform: SocialPlatform,
    @Query('socialAccountId') socialAccountId?: string,
  ) {
    return this.enhancedSocialAppService.getAppConfig({
      userId: req.user.id,
      platform,
      preferredAppId: appId,
      socialAccountId,
    });
  }
}
