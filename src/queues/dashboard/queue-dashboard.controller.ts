import { Controller, Get, Render, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../../auth/auth.guard';
import { QueueService } from '../queue.service';

@Controller('queue-dashboard')
@UseGuards(ClerkAuthGuard)
export class QueueDashboardController {
  constructor(private readonly queueService: QueueService) {}

  @Get()
  @Render('dashboard')
  async getDashboard() {
    const metrics = await this.queueService.getQueueMetrics();
    return { metrics };
  }

  @Get('metrics')
  async getMetrics() {
    return this.queueService.getQueueMetrics();
  }

  @Get('jobs/failed')
  async getFailedJobs() {
    const metrics = await this.queueService.getQueueMetrics();
    const failedJobs = metrics.reduce((acc, queue) => {
      return acc + queue.metrics.failed;
    }, 0);
    return { failedJobs };
  }

  @Get('jobs/active')
  async getActiveJobs() {
    const metrics = await this.queueService.getQueueMetrics();
    const activeJobs = metrics.reduce((acc, queue) => {
      return acc + queue.metrics.active;
    }, 0);
    return { activeJobs };
  }
}