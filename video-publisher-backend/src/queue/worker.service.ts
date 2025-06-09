import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { RabbitMQService, PublishingTaskMessage } from './rabbitmq.service';
import { YoutubeUploadService } from '../publishing/services/youtube-upload.service';
import { FacebookReelsUploadService } from '../publishing/services/facebook-reels-upload.service';
import { InstagramReelsUploadService } from '../publishing/services/instagram-reels-upload.service';
import { TiktokUploadService } from '../publishing/services/tiktok-upload.service';
import { UploadContext } from '../publishing/services/base-platform-upload.service';
import { PublishingTaskStatus, PublishingJobStatus } from '@prisma/client';

@Injectable()
export class WorkerService implements OnModuleInit {
  private readonly logger = new Logger(WorkerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitmq: RabbitMQService,
    private readonly youtubeUpload: YoutubeUploadService,
    private readonly facebookReelsUpload: FacebookReelsUploadService,
    private readonly instagramReelsUpload: InstagramReelsUploadService,
    private readonly tiktokUpload: TiktokUploadService,
  ) {}

  async onModuleInit() {
    try {
      // Wait for RabbitMQ to be ready
      this.logger.log('Waiting for RabbitMQ service to be ready...');
      await this.rabbitmq.waitForReady(15000); // Wait up to 15 seconds

      // Start consuming messages from RabbitMQ
      await this.rabbitmq.startConsumer(this.handleTask.bind(this));
      this.logger.log('Worker service initialized and listening for tasks');
    } catch (error) {
      this.logger.error('Failed to initialize worker service:', error);
      // Don't throw error to prevent app crash, retry will happen
    }
  }

  async handleTask(message: PublishingTaskMessage): Promise<void> {
    const { publishingTaskId, customTitle, customDescription } = message;

    try {
      // Get task details from database
      const task = await this.prisma.publishingTask.findUnique({
        where: { id: publishingTaskId },
        include: {
          video: true,
          socialAccount: true,
        },
      });

      if (!task) {
        throw new Error(`Publishing task not found: ${publishingTaskId}`);
      }

      if (task.status !== PublishingTaskStatus.PENDING) {
        this.logger.warn(
          `Task ${publishingTaskId} is not in PENDING status: ${task.status}`,
        );
        return;
      }

      // Update task status to UPLOADING
      await this.prisma.publishingTask.update({
        where: { id: publishingTaskId },
        data: {
          status: PublishingTaskStatus.UPLOADING,
        },
      });

      // Prepare upload context
      const context: UploadContext = {
        task,
        video: task.video,
        socialAccount: task.socialAccount,
        customTitle,
        customDescription,
      };

      // Select appropriate upload service based on platform
      const uploadService = this.getUploadService(task.socialAccount.platform);

      // Perform the upload
      const result = await uploadService.uploadVideo(context);

      if (result.success) {
        // Update task as successful
        await this.prisma.publishingTask.update({
          where: { id: publishingTaskId },
          data: {
            status: PublishingTaskStatus.PUBLISHED,
            updatedAt: new Date(),
          },
        });

        this.logger.log(`Task ${publishingTaskId} completed successfully`);
      } else {
        // Handle failed upload
        await this.handleTaskFailure(
          task.id,
          result.errorMessage,
          0, // No attempts tracking in schema
        );
      }

      // Update job status if all tasks are completed
      await this.updateJobStatus(task.jobId);
    } catch (error) {
      this.logger.error(`Error processing task ${publishingTaskId}:`, error);
      await this.handleTaskFailure(
        publishingTaskId,
        error.message,
        0, // No attempts tracking in schema
      );
    }
  }

  private getUploadService(platform: string) {
    switch (platform) {
      case 'YOUTUBE':
        return this.youtubeUpload;
      case 'FACEBOOK':
        return this.facebookReelsUpload;
      case 'INSTAGRAM':
        return this.instagramReelsUpload;
      case 'TIKTOK':
        return this.tiktokUpload;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  private async handleTaskFailure(
    taskId: string,
    error: string,
    attempts: number,
  ): Promise<void> {
    const maxRetries = 3;

    if (attempts < maxRetries) {
      // Update task for retry
      await this.prisma.publishingTask.update({
        where: { id: taskId },
        data: {
          status: PublishingTaskStatus.RETRYING,
          error,
          updatedAt: new Date(),
        },
      });

      // Send to retry queue
      await this.rabbitmq.retryTask({
        publishingTaskId: taskId,
        videoId: '', // Will be populated by retry handler
        socialAccountId: '', // Will be populated by retry handler
        attempts,
      });

      this.logger.log(
        `Task ${taskId} scheduled for retry (attempt ${attempts}/${maxRetries})`,
      );
    } else {
      // Mark as failed
      await this.prisma.publishingTask.update({
        where: { id: taskId },
        data: {
          status: PublishingTaskStatus.FAILED,
          error,
          updatedAt: new Date(),
        },
      });

      this.logger.error(
        `Task ${taskId} failed after ${maxRetries} attempts: ${error}`,
      );
    }
  }

  private async updateJobStatus(jobId: string): Promise<void> {
    // Get all tasks for this job
    const tasks = await this.prisma.publishingTask.findMany({
      where: { jobId: jobId },
    });

    const totalTasks = tasks.length;
    const publishedTasks = tasks.filter(
      (t) => t.status === PublishingTaskStatus.PUBLISHED,
    ).length;
    const failedTasks = tasks.filter(
      (t) => t.status === PublishingTaskStatus.FAILED,
    ).length;
    const pendingTasks = tasks.filter(
      (t) =>
        t.status === PublishingTaskStatus.PENDING ||
        t.status === PublishingTaskStatus.UPLOADING ||
        t.status === PublishingTaskStatus.RETRYING,
    ).length;

    let jobStatus: PublishingJobStatus;
    if (pendingTasks > 0) {
      // Still has pending tasks
      jobStatus = PublishingJobStatus.PROCESSING;
    } else if (publishedTasks === totalTasks) {
      // All tasks completed successfully
      jobStatus = PublishingJobStatus.COMPLETED;
    } else if (failedTasks === totalTasks) {
      // All tasks failed
      jobStatus = PublishingJobStatus.FAILED;
    } else {
      // Some succeeded, some failed
      jobStatus = PublishingJobStatus.PARTIALLY_COMPLETED;
    }

    await this.prisma.publishingJob.update({
      where: { id: jobId },
      data: {
        status: jobStatus,
        updatedAt: new Date(),
      },
    });

    this.logger.log(
      `Job ${jobId} status updated to ${jobStatus} (${publishedTasks}/${totalTasks} tasks completed)`,
    );
  }
}
