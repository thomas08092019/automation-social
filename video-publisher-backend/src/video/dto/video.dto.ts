import { IsString, IsOptional, IsArray, IsInt, Min } from 'class-validator';
import { VideoStatus } from '@prisma/client';

export class CreateVideoDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateVideoDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class VideoResponseDto {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  originalFileName: string;
  thumbnailPath?: string;
  duration?: number;
  size: number;
  mimeType: string;
  status: VideoStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class VideoUploadResponseDto {
  id: string;
  title: string;
  originalFileName: string;
  size: number;
  mimeType: string;
  status: VideoStatus;
  message: string;
}
