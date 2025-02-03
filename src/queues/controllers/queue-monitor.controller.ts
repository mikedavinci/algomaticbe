import { Controller, Get, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../../auth/clerk-auth.guard';
import { QueueService } from '../queue.service';

@Controller('queue-monitor')
@UseGuards(ClerkAuthGuard)
export class QueueMonitorController {
  constructor(private readonly queueService: QueueService) {}

  @Get('metrics')
  async getQueueMetrics() {
    return this.queueService.getQueueMetrics();
  }
}