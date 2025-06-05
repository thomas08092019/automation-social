import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { VideoStatus } from '@prisma/client';
import { PrismaService } from '../common';
import {
  CreateVideoDto,
  UpdateVideoDto,
  VideoResponseDto,
  VideoUploadResponseDto,
} from './dto/video.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class VideoService {
  constructor(private prisma: PrismaService) {}

  async create(
    userId: string,
    file: Express.Multer.File,
    createDto: CreateVideoDto,
  ): Promise<VideoUploadResponseDto> {
    if (!file) {
      throw new BadRequestException('Video file is required');
    }

    // Validate file type
    const allowedMimeTypes = [
      'video/mp4',
      'video/avi',
      'video/mov',
      'video/wmv',
      'video/flv',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid video file type');
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads', userId);
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExtension}`;
    const filePath = path.join(uploadsDir, uniqueFilename);

    // Save file to disk
    fs.writeFileSync(filePath, file.buffer);

    // Create video record in database
    const video = await this.prisma.video.create({
      data: {
        title: createDto.title,
        description: createDto.description,
        filePath: filePath, // Use correct field name
        status: VideoStatus.PENDING,
        userId,
      },
      select: {
        id: true,
        title: true,
        filePath: true,
        status: true,
      },
    });

    return {
      ...video,
      status: video.status as VideoStatus,
      message: 'Video uploaded successfully and is being processed',
    };
  }

  async findAllByUser(userId: string): Promise<VideoResponseDto[]> {
    const videos = await this.prisma.video.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        description: true,
        filePath: true,
        thumbnailPath: true,
        duration: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Map to response DTO
    return videos.map(video => ({
      ...video,
      status: video.status as VideoStatus,
    }));
  }

  async findById(userId: string, videoId: string): Promise<VideoResponseDto> {
    const video = await this.prisma.video.findFirst({
      where: {
        id: videoId,
        userId,
      },
      select: {
        id: true,
        title: true,
        description: true,
        filePath: true,
        thumbnailPath: true,
        duration: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    // Map to response DTO
    return {
      ...video,
      status: video.status as VideoStatus,
    };
  }

  async update(
    userId: string,
    videoId: string,
    updateDto: UpdateVideoDto,
  ): Promise<VideoResponseDto> {
    // Check if video exists and belongs to user
    await this.findById(userId, videoId);

    const video = await this.prisma.video.update({
      where: { id: videoId },
      data: updateDto,
      select: {
        id: true,
        title: true,
        description: true,
        filePath: true,
        thumbnailPath: true,
        duration: true,
        status: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Map to response DTO
    return {
      ...video,
      status: video.status as VideoStatus,
    };
  }

  async delete(userId: string, videoId: string): Promise<void> {
    // Check if video exists and belongs to user
    const video = await this.prisma.video.findFirst({
      where: {
        id: videoId,
        userId,
      },
      select: {
        filePath: true,
        thumbnailPath: true,
      },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    // Delete physical files
    try {
      if (fs.existsSync(video.filePath)) {
        fs.unlinkSync(video.filePath);
      }
      if (video.thumbnailPath && fs.existsSync(video.thumbnailPath)) {
        fs.unlinkSync(video.thumbnailPath);
      }
    } catch (error) {
      console.error('Error deleting video files:', error);
    }

    // Delete video record from database
    await this.prisma.video.delete({
      where: { id: videoId },
    });
  }

  async updateVideoStatus(videoId: string, status: VideoStatus): Promise<void> {
    await this.prisma.video.update({
      where: { id: videoId },
      data: { status },
    });
  }

  async getVideoPath(userId: string, videoId: string): Promise<string> {
    const video = await this.prisma.video.findFirst({
      where: {
        id: videoId,
        userId,
      },
      select: {
        filePath: true,
      },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    return video.filePath;
  }
}
