import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PublishingTaskStatus } from '@prisma/client';
import { PrismaService } from '../common';
import { VideoService } from '../video/video.service';
import { SocialAccountService } from '../social-account/social-account.service';
import { RabbitMQService } from '../queue/rabbitmq.service';
import {
  CreateBatchPublishingJobDto,
  PublishingJobResponseDto,
} from './dto/publishing.dto';

@Injectable()
export class BatchPublishingService {
  constructor(
    private prisma: PrismaService,
    private videoService: VideoService,
    private socialAccountService: SocialAccountService,
    private rabbitmq: RabbitMQService,
  ) {}

  /**
   * Create batch publishing jobs with multiple videos and targets
   * Supports the new payload structure: { jobs: [{ videoId, targets: [{ socialAccountId }] }] }
   */
  async createBatchJob(
    userId: string,
    createDto: CreateBatchPublishingJobDto,
  ): Promise<PublishingJobResponseDto[]> {
    const results: PublishingJobResponseDto[] = [];

    // Process each job in the batch
    for (let i = 0; i < createDto.jobs.length; i++) {
      const jobItem = createDto.jobs[i];

      // Validate video exists and belongs to user
      const video = await this.videoService.findById(userId, jobItem.videoId);

      // Validate all target social accounts
      for (const target of jobItem.targets) {
        await this.socialAccountService.findById(
          userId,
          target.socialAccountId,
        );
      }

      // Create individual publishing job for this video
      const jobTitle = createDto.batchTitle
        ? `${createDto.batchTitle} - Video ${i + 1}`
        : `${video.title} - Batch Job`;

      const job = await this.prisma.publishingJob.create({
        data: {
          title: jobTitle,
          description: `Batch publishing job for video: ${video.title}`,
          scheduledAt: createDto.scheduledAt
            ? new Date(createDto.scheduledAt)
            : null,
          userId,
          tasks: {
            create: jobItem.targets.map((target) => ({
              videoId: jobItem.videoId,
              socialAccountId: target.socialAccountId,
              status: PublishingTaskStatus.PENDING,
              attempts: 0,
            })),
          },
        },
        include: {
          tasks: {
            include: {
              video: {
                select: {
                  id: true,
                  title: true,
                  originalFileName: true,
                },
              },
              socialAccount: {
                select: {
                  id: true,
                  platform: true,
                  username: true,
                },
              },
            },
          },
        },
      });

      // Queue tasks for processing
      for (const task of job.tasks) {
        await this.rabbitmq.publishTask({
          publishingTaskId: task.id,
          videoId: task.videoId,
          socialAccountId: task.socialAccountId,
          customTitle: jobItem.customTitle,
          customDescription: jobItem.customDescription,
          attempts: 0,
        });
      }

      results.push({
        id: job.id,
        title: job.title,
        description: job.description,
        status: job.status,
        scheduledAt: job.scheduledAt,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        tasks: job.tasks.map((task) => ({
          id: task.id,
          status: task.status,
          platformPostId: task.platformPostId,
          errorMessage: task.errorMessage,
          attempts: task.attempts,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
          video: task.video,
          socialAccount: task.socialAccount,
        })),
      });
    }

    return results;
  }
}
