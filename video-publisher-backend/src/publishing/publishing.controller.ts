import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PublishingService } from './publishing.service';
import {
  CreatePublishingJobDto,
  CreateBatchPublishingJobDto,
  PublishingJobResponseDto,
  PublishingJobSummaryDto,
} from './dto/publishing.dto';
import { BatchPublishingService } from './batch-publishing.service';
import { RabbitMQService } from '../queue/rabbitmq.service';

@Controller('publishing')
@UseGuards(JwtAuthGuard)
export class PublishingController {
  constructor(
    private publishingService: PublishingService,
    private batchPublishingService: BatchPublishingService,
    private rabbitmq: RabbitMQService,
  ) {}

  @Post('jobs')
  async createJob(
    @Request() req,
    @Body() createDto: CreatePublishingJobDto,
  ): Promise<PublishingJobResponseDto> {
    return this.publishingService.createJob(req.user.id, createDto);
  }

  @Post('batch-jobs')
  async createBatchJob(
    @Request() req,
    @Body() createDto: CreateBatchPublishingJobDto,
  ): Promise<PublishingJobResponseDto[]> {
    return this.batchPublishingService.createBatchJob(req.user.id, createDto);
  }

  @Get('jobs')
  async findAllJobs(@Request() req): Promise<PublishingJobSummaryDto[]> {
    return this.publishingService.findAllByUser(req.user.id);
  }

  @Get('jobs/:id')
  async findJob(
    @Request() req,
    @Param('id') id: string,
  ): Promise<PublishingJobResponseDto> {
    return this.publishingService.findJobById(req.user.id, id);
  }

  @Post('jobs/:id/execute')
  async executeJob(
    @Request() req,
    @Param('id') id: string,
  ): Promise<PublishingJobResponseDto> {
    return this.publishingService.executeJob(req.user.id, id);
  }

  @Post('jobs/:id/retry')
  async retryFailedTasks(
    @Request() req,
    @Param('id') id: string,
  ): Promise<PublishingJobResponseDto> {
    return this.publishingService.retryFailedTasks(req.user.id, id);
  }

  @Delete('jobs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteJob(@Request() req, @Param('id') id: string): Promise<void> {
    return this.publishingService.deleteJob(req.user.id, id);
  }

  @Get('queue/status')
  async getQueueStatus() {
    const rabbitmqStatus = await this.rabbitmq.getQueueStats();

    return {
      rabbitmq: rabbitmqStatus,
    };
  }
}
