import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

export interface DashboardStats {
  totalVideos: number;
  totalSocialAccounts: number;
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  recentActivity: {
    date: string;
    jobsCompleted: number;
    jobsFailed: number;
  }[];
}

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getUserStats(userId: string): Promise<DashboardStats> {
    // Get basic counts
    const [
      totalVideos,
      totalSocialAccounts,
      totalJobs,
      activeJobs,
      completedJobs,
      failedJobs,
    ] = await Promise.all([
      this.prisma.video.count({
        where: { userId },
      }),
      this.prisma.socialAccount.count({
        where: { userId },
      }),
      this.prisma.publishingJob.count({
        where: { userId },
      }),
      this.prisma.publishingJob.count({
        where: {
          userId,
          status: { in: ['PENDING', 'PROCESSING'] },
        },
      }),
      this.prisma.publishingJob.count({
        where: {
          userId,
          status: 'COMPLETED',
        },
      }),
      this.prisma.publishingJob.count({
        where: {
          userId,
          status: 'FAILED',
        },
      }),
    ]);

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentJobs = await this.prisma.publishingJob.findMany({
      where: {
        userId,
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
      select: {
        status: true,
        createdAt: true,
      },
    });

    // Process recent activity data
    const activityMap = new Map<
      string,
      { completed: number; failed: number }
    >();

    recentJobs.forEach((job) => {
      const date = job.createdAt.toISOString().split('T')[0];
      if (!activityMap.has(date)) {
        activityMap.set(date, { completed: 0, failed: 0 });
      }

      const activity = activityMap.get(date)!;
      if (job.status === 'COMPLETED') {
        activity.completed++;
      } else if (job.status === 'FAILED') {
        activity.failed++;
      }
    });

    const recentActivity = Array.from(activityMap.entries())
      .map(([date, stats]) => ({
        date,
        jobsCompleted: stats.completed,
        jobsFailed: stats.failed,
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 7);

    return {
      totalVideos,
      totalSocialAccounts,
      totalJobs,
      activeJobs,
      completedJobs,
      failedJobs,
      recentActivity,
    };
  }
}
