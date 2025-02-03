import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { HasuraService } from '../../hasura/hasura.service';

@Processor('analytics')
export class AnalyticsProcessor {
  private readonly logger = new Logger(AnalyticsProcessor.name);

  constructor(private readonly hasuraService: HasuraService) {}

  @Process('track-event')
  async handleEventTracking(job: Job) {
    try {
      const { userId, event, metadata } = job.data;
      this.logger.log(`Processing analytics event: ${event} for user ${userId}`);

      // Update job progress
      await job.progress(25);

      const mutation = `
        mutation TrackEvent($event: analytics_events_insert_input!) {
          insert_analytics_events_one(object: $event) {
            id
          }
        }
      `;

      await job.progress(50);

      await this.hasuraService.executeQuery(mutation, {
        event: {
          user_id: userId,
          event_type: event,
          metadata,
          created_at: new Date().toISOString(),
        },
      });

      await job.progress(100);
      
      this.logger.log(`Analytics event tracked: ${event}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to track analytics event: ${error.message}`);
      throw error;
    }
  }

  @Process('generate-report')
  async handleReportGeneration(job: Job) {
    try {
      const { reportType, dateRange, filters } = job.data;
      this.logger.log(`Generating ${reportType} report`);

      await job.progress(10);

      // Query data based on report type
      const query = `
        query GetReportData($dateRange: daterange!, $filters: jsonb) {
          analytics_events(
            where: {
              created_at: { _contained_in: $dateRange },
              _and: { metadata: { _contains: $filters } }
            }
          ) {
            id
            event_type
            metadata
            created_at
          }
        }
      `;

      await job.progress(40);

      const data = await this.hasuraService.executeQuery(query, {
        dateRange,
        filters,
      });

      await job.progress(70);

      // Process and aggregate data
      const report = this.aggregateReportData(data, reportType);

      await job.progress(100);

      return { success: true, report };
    } catch (error) {
      this.logger.error(`Failed to generate report: ${error.message}`);
      throw error;
    }
  }

  private aggregateReportData(data: any, reportType: string) {
    // Implement report aggregation logic based on reportType
    return {
      type: reportType,
      data: data,
      generatedAt: new Date().toISOString(),
    };
  }
}