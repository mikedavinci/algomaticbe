import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

@Processor('hasura-events')
export class HasuraEventProcessor {
  private readonly logger = new Logger(HasuraEventProcessor.name);

  @Process('process-event')
  async handleEvent(job: Job) {
    const { eventId, deliveryId, table, event, trigger } = job.data;

    try {
      this.logger.log(
        `Processing Hasura event: ${eventId} for table ${table.name}`,
      );

      // Handle different event types
      switch (table.name) {
        case 'users':
          await this.handleUserEvent(event);
          break;
        case 'subscriptions':
          await this.handleSubscriptionEvent(event);
          break;
        default:
          this.logger.warn(`No handler for table ${table.name}`);
      }

      return { success: true };
    } catch (error) {
      this.logger.error(
        `Error processing event ${eventId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async handleUserEvent(event: any) {
    // Implement user-specific event handling
    const { old_data, new_data } = event.data;
    // Add your user event handling logic here
  }

  private async handleSubscriptionEvent(event: any) {
    // Implement subscription-specific event handling
    const { old_data, new_data } = event.data;
    // Add your subscription event handling logic here
  }
}