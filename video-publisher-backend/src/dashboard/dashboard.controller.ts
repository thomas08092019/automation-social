import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  async getStats(@Request() req) {
    const userId = req.user.id;
    if (!userId) {
      throw new Error('User ID not found in request');
    }
    return this.dashboardService.getUserStats(userId);
  }
}
