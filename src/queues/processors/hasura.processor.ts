import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { HasuraService } from '../../hasura/hasura.service';

@Processor('hasura')
export class HasuraProcessor {
  private readonly logger = new Logger(HasuraProcessor.name);

  constructor(private readonly hasuraService: HasuraService) {}

  @Process('sync-data')
  async handleDataSync(job: Job) {
    try {
      const { operation, data } = job.data;
      this.logger.log(`Processing Hasura sync operation: ${operation}`);

      switch (operation) {
        case 'sync_subscription':
          await this.syncSubscription(data);
          break;
        case 'sync_payment':
          await this.syncPayment(data);
          break;
        default:
          this.logger.warn(`Unknown sync operation: ${operation}`);
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to sync data with Hasura: ${error.message}`);
      throw error;
    }
  }

  private async syncSubscription(data: any) {
    const mutation = `
      mutation SyncSubscription($id: uuid!, $status: String!, $customerId: String!) {
        insert_subscriptions_one(
          object: {
            id: $id,
            status: $status,
            customer_id: $customerId
          },
          on_conflict: {
            constraint: subscriptions_pkey,
            update_columns: [status]
          }
        ) {
          id
        }
      }
    `;

    await this.hasuraService.executeQuery(mutation, data);
  }

  private async syncPayment(data: any) {
    const mutation = `
      mutation SyncPayment($id: uuid!, $status: String!, $amount: Int!) {
        insert_payments_one(
          object: {
            id: $id,
            status: $status,
            amount: $amount
          },
          on_conflict: {
            constraint: payments_pkey,
            update_columns: [status]
          }
        ) {
          id
        }
      }
    `;

    await this.hasuraService.executeQuery(mutation, data);
  }
}