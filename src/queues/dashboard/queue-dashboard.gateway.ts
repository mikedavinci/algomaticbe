import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { QueueService } from '../queue.service';
import { QueueEventEmitter, QueueEvent } from '../notifications/queue-event.emitter';

@WebSocketGateway({
  namespace: 'queue-dashboard',
  cors: true,
})
export class QueueDashboardGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private interval: ReturnType<typeof setInterval> | undefined;
  private eventSubscription: any;

  constructor(
    private readonly queueService: QueueService,
    private readonly eventEmitter: QueueEventEmitter,
  ) {}

  async handleConnection() {
    // Start sending metrics updates when a client connects
    if (!this.interval) {
      this.interval = setInterval(async () => {
        const metrics = await this.queueService.getQueueMetrics();
        this.server.emit('metrics', metrics);
      }, 5000); // Update every 5 seconds

      // Subscribe to queue events
      this.eventSubscription = this.eventEmitter.subscribe((event: QueueEvent) => {
        this.server.emit('queueEvent', {
          ...event,
          timestamp: event.timestamp.toISOString(),
        });
      });
    }
  }

  handleDisconnect() {
    // If no clients are connected, stop sending updates
    if (this.server.engine.clientsCount === 0 && this.interval) {
      clearInterval(this.interval);
      if (this.eventSubscription) {
        this.eventSubscription.unsubscribe();
        this.eventSubscription = null;
      }
      this.interval = undefined;
    }
  }
}