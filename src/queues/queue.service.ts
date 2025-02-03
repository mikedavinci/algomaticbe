import { Injectable } from '@nestjs/common';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('email') private readonly emailQueue: Queue,
    @InjectQueue('stripe') private readonly stripeQueue: Queue,
    @InjectQueue('hasura') private readonly hasuraQueue: Queue,
    @InjectQueue('analytics') private readonly analyticsQueue: Queue,
    @InjectQueue('cleanup') private readonly cleanupQueue: Queue
  ) {}

  async addWelcomeEmail(userId: string, email: string, name: string) {
    await this.emailQueue.add(
      'welcome-email',
      { userId, email, name },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      }
    );
  }

  async addSubscriptionExpiryNotification(
    subscriptionId: string,
    userId: string,
    email: string,
    name: string,
    expiryDate: Date
  ) {
    await this.emailQueue.add(
      'subscription-expiry',
      { subscriptionId, userId, email, name, expiryDate },
      {
        attempts: 3,
        delay: 24 * 60 * 60 * 1000, // 24 hours
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      }
    );
  }

  async addStripeRetry(paymentIntentId: string, customerId: string) {
    await this.stripeQueue.add(
      'retry-payment',
      { paymentIntentId, customerId },
      {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 60000, // Start with 1 minute delay
        },
      }
    );
  }

  async addHasuraSync(operation: string, data: any) {
    await this.hasuraQueue.add(
      'sync-data',
      { operation, data },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      }
    );
  }

  async trackAnalyticsEvent(userId: string, event: string, metadata: any = {}) {
    await this.analyticsQueue.add(
      'track-event',
      { userId, event, metadata },
      {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      }
    );
  }

  async generateAnalyticsReport(
    reportType: string,
    dateRange: any,
    filters: any = {}
  ) {
    await this.analyticsQueue.add(
      'generate-report',
      { reportType, dateRange, filters },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        timeout: 300000, // 5 minutes
      }
    );
  }

  async scheduleDataCleanup(
    table: string,
    olderThan: Date,
    batchSize: number = 1000
  ) {
    await this.cleanupQueue.add(
      'cleanup-old-data',
      { table, olderThan, batchSize },
      {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 10000,
        },
        timeout: 600000, // 10 minutes
      }
    );
  }

  async getQueueMetrics() {
    const queues = [
      this.emailQueue,
      this.stripeQueue,
      this.hasuraQueue,
      this.analyticsQueue,
      this.cleanupQueue,
    ];

    const metrics = await Promise.all(
      queues.map(async (queue) => {
        const [waiting, active, completed, failed] = await Promise.all([
          queue.getWaitingCount(),
          queue.getActiveCount(),
          queue.getCompletedCount(),
          queue.getFailedCount(),
        ]);

        return {
          name: queue.name,
          metrics: {
            waiting,
            active,
            completed,
            failed,
          },
        };
      })
    );

    return metrics;
  }
}
