import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString } from 'class-validator';

export class BaseDto {
  @ApiProperty({ description: 'Unique identifier', example: 'uuid-string' })
  id: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiProperty({ description: 'Deletion timestamp', required: false })
  @IsOptional()
  @IsDateString()
  deletedAt?: Date;

  @ApiProperty({ description: 'Created by user ID', required: false })
  @IsOptional()
  @IsString()
  createdBy?: string;

  @ApiProperty({ description: 'Updated by user ID', required: false })
  @IsOptional()
  @IsString()
  updatedBy?: string;

  @ApiProperty({ description: 'Deleted by user ID', required: false })
  @IsOptional()
  @IsString()
  deletedBy?: string;
}
