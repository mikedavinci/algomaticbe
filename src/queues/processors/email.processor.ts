import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../../email/email.service';
import { QueueEventEmitter } from '../notifications/queue-event.emitter';

@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly eventEmitter: QueueEventEmitter
  ) {}

  @Process('welcome-email')
  async handleWelcomeEmail(job: Job) {
    try {
      const { userId, email, name } = job.data;
      this.logger.log(`Processing welcome email for user ${userId}`);

      await job.progress(25);
      this.eventEmitter.emit({
        type: 'job.completed',
        queue: 'email',
        jobId: job.id.toString(),
        message: `Processing welcome email for ${email}`,
        timestamp: new Date(),
      });

      await this.emailService.sendWelcomeEmail(email, name);

      await job.progress(100);
      this.eventEmitter.emit({
        type: 'job.completed',
        queue: 'email',
        jobId: job.id.toString(),
        message: `Welcome email sent to ${email}`,
        timestamp: new Date(),
      });

      this.logger.log(`Welcome email sent to ${email}`);
      return { success: true };
    } catch (error) {
      this.eventEmitter.emit({
        type: 'job.failed',
        queue: 'email',
        jobId: job.id.toString(),
        message: `Failed to send welcome email: ${error.message}`,
        timestamp: new Date(),
        data: { error: error.message },
      });
      this.logger.error(`Failed to send welcome email: ${error.message}`);
      throw error;
    }
  }

  @Process('subscription-expiry')
  async handleSubscriptionExpiry(job: Job) {
    try {
      const { subscriptionId, userId, email, name, expiryDate } = job.data;
      this.logger.log(
        `Processing subscription expiry notification for ${subscriptionId}`
      );

      await this.emailService.sendSubscriptionExpiryEmail(
        email,
        name,
        new Date(expiryDate)
      );

      this.logger.log(`Subscription expiry notification sent to ${email}`);
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to send subscription expiry notification: ${error.message}`
      );
      throw error;
    }
  }
}
