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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SocialAccountService } from './social-account.service';
import {
  CreateSocialAccountDto,
  UpdateSocialAccountDto,
  SocialAccountResponseDto,
  SocialAccountQueryDto,
  SocialAccountsResponseDto,
} from './dto/social-account.dto';

@Controller('social-accounts')
export class SocialAccountController {
  constructor(private socialAccountService: SocialAccountService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Request() req,
    @Body() createDto: CreateSocialAccountDto,
  ): Promise<SocialAccountResponseDto> {
    return this.socialAccountService.create(req.user.id, createDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Request() req,
    @Query() query: SocialAccountQueryDto,
  ): Promise<SocialAccountsResponseDto> {
    return this.socialAccountService.findAll(req.user.id, query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(
    @Request() req,
    @Param('id') id: string,
  ): Promise<SocialAccountResponseDto> {
    return this.socialAccountService.findById(req.user.id, id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateSocialAccountDto,
  ): Promise<SocialAccountResponseDto> {
    return this.socialAccountService.update(req.user.id, id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Request() req, @Param('id') id: string): Promise<void> {
    return this.socialAccountService.delete(req.user.id, id);
  }

  @Delete('bulk/delete')
  @UseGuards(JwtAuthGuard)
  async removeBulk(
    @Request() req,
    @Body() body: { accountIds: string[] },
  ): Promise<void> {
    return this.socialAccountService.deleteBulk(req.user.id, body.accountIds);
  }

  @Post('bulk/refresh')
  @UseGuards(JwtAuthGuard)
  async refreshTokensBulk(
    @Request() req,
    @Body() body: { accountIds: string[] },
  ) {
    try {
      const result = await this.socialAccountService.refreshTokensBulk(
        req.user.id,
        body.accountIds,
      );

      return {
        success: true,
        data: result,
        message: `Refreshed ${result.successful.length} out of ${body.accountIds.length} accounts`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to refresh tokens: ${error.message}`,
      };
    }
  }

  @Post(':id/refresh')
  @UseGuards(JwtAuthGuard)
  async refreshToken(@Request() req, @Param('id') id: string) {
    try {
      const refreshedAccount = await this.socialAccountService.refreshToken(
        req.user.id,
        id,
      );

      return {
        success: true,
        data: refreshedAccount,
        message: 'Token refreshed successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to refresh token: ${error.message}`,
      };
    }
  }
}
