import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

export interface QueueEvent {
  type: 'job.completed' | 'job.failed' | 'job.stuck' | 'queue.paused' | 'queue.resumed' | 'error';
  queue: string;
  jobId?: string;
  message: string;
  timestamp: Date;
  data?: any;
}

@Injectable()
export class QueueEventEmitter {
  private eventSubject = new Subject<QueueEvent>();

  emit(event: QueueEvent) {
    this.eventSubject.next(event);
  }

  subscribe(callback: (event: QueueEvent) => void) {
    return this.eventSubject.subscribe(callback);
  }
}