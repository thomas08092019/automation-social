import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PublishingJobStatus, PublishingTaskStatus } from '@prisma/client';
import { PrismaService } from '../common';
import { VideoService } from '../video/video.service';
import { SocialAccountService } from '../social-account/social-account.service';
import {
  CreatePublishingJobDto,
  CreateBatchPublishingJobDto,
  PublishingJobResponseDto,
  PublishingJobSummaryDto,
} from './dto/publishing.dto';
import { RabbitMQService } from '../queue/rabbitmq.service';

@Injectable()
export class PublishingService {
  constructor(
    private prisma: PrismaService,
    private videoService: VideoService,
    private socialAccountService: SocialAccountService,
    private rabbitmqService: RabbitMQService,
  ) {}

  async createJob(
    userId: string,
    createDto: CreatePublishingJobDto,
  ): Promise<PublishingJobResponseDto> {
    // Validate that all videos exist and belong to user
    for (const task of createDto.tasks) {
      await this.videoService.findById(userId, task.videoId);
      await this.socialAccountService.findById(userId, task.socialAccountId);
    }

    // Create publishing job with tasks
    const job = await this.prisma.publishingJob.create({
      data: {
        title: createDto.title,
        description: createDto.description,
        scheduledAt: createDto.scheduledAt
          ? new Date(createDto.scheduledAt)
          : null,
        userId,
        tasks: {
          create: createDto.tasks.map((task) => ({
            videoId: task.videoId,
            socialAccountId: task.socialAccountId,
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
                accessToken: true,
              },
            },
          },
        },
      },
    });

    return this.mapToJobResponse(job);
  }

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
                  accessToken: true,
                },
              },
            },
          },
        },
      });

      // Queue tasks for processing
      for (const task of job.tasks) {
        await this.rabbitmqService.publishTask({
          publishingTaskId: task.id,
          videoId: task.videoId,
          socialAccountId: task.socialAccountId,
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

  async findAllByUser(userId: string): Promise<PublishingJobSummaryDto[]> {
    const jobs = await this.prisma.publishingJob.findMany({
      where: { userId },
      include: {
        _count: {
          select: { tasks: true },
        },
        tasks: {
          select: { status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return jobs.map((job) => ({
      id: job.id,
      title: job.title,
      description: job.description,
      status: job.status,
      scheduledAt: job.scheduledAt,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      totalTasks: job._count.tasks,
      completedTasks: job.tasks.filter(
        (task) => task.status === PublishingTaskStatus.PUBLISHED,
      ).length,
      failedTasks: job.tasks.filter(
        (task) => task.status === PublishingTaskStatus.FAILED,
      ).length,
    }));
  }

  async findJobById(
    userId: string,
    jobId: string,
  ): Promise<PublishingJobResponseDto> {
    const job = await this.prisma.publishingJob.findFirst({
      where: {
        id: jobId,
        userId,
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
                accessToken: true,
              },
            },
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Publishing job not found');
    }

    return this.mapToJobResponse(job);
  }

  async deleteJob(userId: string, jobId: string): Promise<void> {
    const job = await this.prisma.publishingJob.findFirst({
      where: {
        id: jobId,
        userId,
      },
    });

    if (!job) {
      throw new NotFoundException('Publishing job not found');
    }

    // Check if job is currently processing
    if (job.status === PublishingJobStatus.PROCESSING) {
      throw new BadRequestException(
        'Cannot delete job that is currently processing',
      );
    }

    await this.prisma.publishingJob.delete({
      where: { id: jobId },
    });
  }

  async executeJob(
    userId: string,
    jobId: string,
  ): Promise<PublishingJobResponseDto> {
    const job = await this.findJobById(userId, jobId);

    if (job.status === PublishingJobStatus.PROCESSING) {
      throw new BadRequestException('Job is already processing');
    }

    if (job.status === PublishingJobStatus.COMPLETED) {
      throw new BadRequestException('Job is already completed');
    }

    // Update job status to processing
    await this.prisma.publishingJob.update({
      where: { id: jobId },
      data: { status: PublishingJobStatus.PROCESSING },
    });

    // Add tasks to queue for background processing
    for (const task of job.tasks) {
      const accessToken = await this.socialAccountService.getAccessToken(
        userId,
        task.socialAccount.id,
      );

      await this.rabbitmqService.publishTask({
        publishingTaskId: task.id,
        videoId: task.video.id,
        socialAccountId: task.socialAccount.id,
        attempts: 0,
      });
    }

    return this.findJobById(userId, jobId);
  }

  async retryFailedTasks(
    userId: string,
    jobId: string,
  ): Promise<PublishingJobResponseDto> {
    const job = await this.findJobById(userId, jobId);

    // Reset failed tasks to pending
    await this.prisma.publishingTask.updateMany({
      where: {
        publishingJobId: jobId,
        status: PublishingTaskStatus.FAILED,
      },
      data: {
        status: PublishingTaskStatus.PENDING,
        errorMessage: null,
      },
    });

    // Update job status if needed
    if (
      job.status === PublishingJobStatus.FAILED ||
      job.status === PublishingJobStatus.PARTIALLY_COMPLETED
    ) {
      await this.prisma.publishingJob.update({
        where: { id: jobId },
        data: { status: PublishingJobStatus.PENDING },
      });
    }

    return this.findJobById(userId, jobId);
  }

  async updateTaskStatus(
    taskId: string,
    status: PublishingTaskStatus,
    platformPostId?: string,
    errorMessage?: string,
  ): Promise<void> {
    await this.prisma.publishingTask.update({
      where: { id: taskId },
      data: {
        status,
        platformPostId,
        errorMessage,
        attempts: { increment: 1 },
      },
    });

    // Check if we need to update job status
    const task = await this.prisma.publishingTask.findUnique({
      where: { id: taskId },
      include: {
        job: {
          include: {
            tasks: true,
          },
        },
      },
    });

    if (task) {
      await this.updateJobStatus(task.job.id);
    }
  }

  private async updateJobStatus(jobId: string): Promise<void> {
    const job = await this.prisma.publishingJob.findUnique({
      where: { id: jobId },
      include: { tasks: true },
    });

    if (!job) return;

    const totalTasks = job.tasks.length;
    const completedTasks = job.tasks.filter(
      (task) => task.status === PublishingTaskStatus.PUBLISHED,
    ).length;
    const failedTasks = job.tasks.filter(
      (task) => task.status === PublishingTaskStatus.FAILED,
    ).length;
    const processingTasks = job.tasks.filter(
      (task) =>
        task.status === PublishingTaskStatus.PENDING ||
        task.status === PublishingTaskStatus.UPLOADING ||
        task.status === PublishingTaskStatus.RETRYING,
    ).length;

    let newStatus: PublishingJobStatus;

    if (processingTasks > 0) {
      newStatus = PublishingJobStatus.PROCESSING;
    } else if (completedTasks === totalTasks) {
      newStatus = PublishingJobStatus.COMPLETED;
    } else if (failedTasks === totalTasks) {
      newStatus = PublishingJobStatus.FAILED;
    } else {
      newStatus = PublishingJobStatus.PARTIALLY_COMPLETED;
    }

    if (newStatus !== job.status) {
      await this.prisma.publishingJob.update({
        where: { id: jobId },
        data: { status: newStatus },
      });
    }
  }

  private mapToJobResponse(job: any): PublishingJobResponseDto {
    return {
      id: job.id,
      title: job.title,
      description: job.description,
      status: job.status,
      scheduledAt: job.scheduledAt,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      tasks: job.tasks.map((task: any) => ({
        id: task.id,
        status: task.status,
        platformPostId: task.platformPostId,
        errorMessage: task.errorMessage,
        attempts: task.attempts,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        video: task.video,
        socialAccount: {
          id: task.socialAccount.id,
          platform: task.socialAccount.platform,
          username: task.socialAccount.username,
        },
      })),
    };
  }
}
