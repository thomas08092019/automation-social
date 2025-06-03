import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VideoService } from './video.service';
import {
  CreateVideoDto,
  UpdateVideoDto,
  VideoResponseDto,
  VideoUploadResponseDto,
} from './dto/video.dto';

@Controller('videos')
@UseGuards(JwtAuthGuard)
export class VideoController {
  constructor(private videoService: VideoService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('video', {
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit
      },
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = [
          'video/mp4',
          'video/avi',
          'video/mov',
          'video/wmv',
          'video/flv',
        ];
        if (!allowedMimeTypes.includes(file.mimetype)) {
          return callback(
            new BadRequestException('Invalid video file type'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async uploadVideo(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body() createDto: CreateVideoDto,
  ): Promise<VideoUploadResponseDto> {
    return this.videoService.create(req.user.id, file, createDto);
  }

  @Get()
  async findAll(@Request() req): Promise<VideoResponseDto[]> {
    return this.videoService.findAllByUser(req.user.id);
  }

  @Get(':id')
  async findOne(
    @Request() req,
    @Param('id') id: string,
  ): Promise<VideoResponseDto> {
    return this.videoService.findById(req.user.id, id);
  }

  @Put(':id')
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateVideoDto,
  ): Promise<VideoResponseDto> {
    return this.videoService.update(req.user.id, id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Request() req, @Param('id') id: string): Promise<void> {
    return this.videoService.delete(req.user.id, id);
  }
}
