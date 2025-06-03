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
import { SocialPlatform } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SocialAccountService } from './social-account.service';
import {
  CreateSocialAccountDto,
  UpdateSocialAccountDto,
  SocialAccountResponseDto,
} from './dto/social-account.dto';

@Controller('social-accounts')
@UseGuards(JwtAuthGuard)
export class SocialAccountController {
  constructor(private socialAccountService: SocialAccountService) {}

  @Post()
  async create(
    @Request() req,
    @Body() createDto: CreateSocialAccountDto,
  ): Promise<SocialAccountResponseDto> {
    return this.socialAccountService.create(req.user.id, createDto);
  }

  @Get()
  async findAll(
    @Request() req,
    @Query('platform') platform?: SocialPlatform,
  ): Promise<SocialAccountResponseDto[]> {
    if (platform) {
      return this.socialAccountService.findByPlatform(req.user.id, platform);
    }
    return this.socialAccountService.findAllByUser(req.user.id);
  }

  @Get(':id')
  async findOne(
    @Request() req,
    @Param('id') id: string,
  ): Promise<SocialAccountResponseDto> {
    return this.socialAccountService.findById(req.user.id, id);
  }

  @Put(':id')
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateSocialAccountDto,
  ): Promise<SocialAccountResponseDto> {
    return this.socialAccountService.update(req.user.id, id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Request() req, @Param('id') id: string): Promise<void> {
    return this.socialAccountService.delete(req.user.id, id);
  }
}
