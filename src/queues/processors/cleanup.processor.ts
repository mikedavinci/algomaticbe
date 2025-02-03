import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { HasuraService } from '../../hasura/hasura.service';

@Processor('cleanup')
export class CleanupProcessor {
  private readonly logger = new Logger(CleanupProcessor.name);

  constructor(private readonly hasuraService: HasuraService) {}

  @Process('cleanup-old-data')
  async handleDataCleanup(job: Job) {
    try {
      const { table, olderThan, batchSize = 1000 } = job.data;
      this.logger.log(`Starting cleanup for ${table}`);

      await job.progress(0);

      const query = `
        query GetOldRecords($olderThan: timestamptz!, $limit: Int!) {
          ${table}(
            where: { created_at: { _lt: $olderThan } }
            limit: $limit
          ) {
            id
          }
        }
      `;

      const records = await this.hasuraService.executeQuery(query, {
        olderThan,
        limit: batchSize,
      });

      await job.progress(50);

      if (records[table].length > 0) {
        const mutation = `
          mutation DeleteOldRecords($ids: [uuid!]!) {
            delete_${table}(where: { id: { _in: $ids } }) {
              affected_rows
            }
          }
        `;

        const ids = records[table].map((r: any) => r.id);
        await this.hasuraService.executeQuery(mutation, { ids });
      }

      await job.progress(100);

      return {
        success: true,
        deletedCount: records[table].length,
      };
    } catch (error) {
      this.logger.error(`Failed to cleanup old data: ${error.message}`);
      throw error;
    }
  }
}