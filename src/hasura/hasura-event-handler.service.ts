import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class HasuraEventHandlerService {
  constructor(
    @InjectQueue('hasura-events') private readonly eventQueue: Queue,
  ) {}

  async handleEvent(eventId: string, deliveryId: string, payload: any) {
    const { table, event, trigger } = payload;

    // Queue the event for processing
    await this.eventQueue.add(
      'process-event',
      {
        eventId,
        deliveryId,
        table,
        event,
        trigger,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );

    return { success: true };
  }
}