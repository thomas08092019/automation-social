import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PublishingJobStatus, PublishingTaskStatus } from '@prisma/client';

export class CreatePublishingTargetDto {
  @IsUUID()
  socialAccountId: string;
}

export class CreatePublishingJobItemDto {
  @IsUUID()
  videoId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePublishingTargetDto)
  targets: CreatePublishingTargetDto[];

  @IsOptional()
  @IsString()
  customTitle?: string;

  @IsOptional()
  @IsString()
  customDescription?: string;
}

export class CreateBatchPublishingJobDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePublishingJobItemDto)
  jobs: CreatePublishingJobItemDto[];

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  batchTitle?: string;
}

// Legacy DTO for backward compatibility
export class CreatePublishingTaskDto {
  @IsUUID()
  videoId: string;

  @IsUUID()
  socialAccountId: string;
}

export class CreatePublishingJobDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePublishingTaskDto)
  tasks: CreatePublishingTaskDto[];
}

export class PublishingTaskResponseDto {
  id: string;
  status: PublishingTaskStatus;
  platformPostId?: string;
  errorMessage?: string;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
  video: {
    id: string;
    title: string;
  };
  socialAccount: {
    id: string;
    platform: string;
    username: string;
  };
}

export class PublishingJobResponseDto {
  id: string;
  title: string;
  description?: string;
  status: PublishingJobStatus;
  scheduledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  tasks: PublishingTaskResponseDto[];
}

export class PublishingJobSummaryDto {
  id: string;
  title: string;
  description?: string;
  status: PublishingJobStatus;
  scheduledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
}
