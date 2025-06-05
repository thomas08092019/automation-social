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
  filePath: string;
  thumbnailPath?: string;
  duration?: number;
  status: VideoStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class VideoUploadResponseDto {
  id: string;
  title: string;
  filePath: string;
  status: VideoStatus;
  message: string;
}
