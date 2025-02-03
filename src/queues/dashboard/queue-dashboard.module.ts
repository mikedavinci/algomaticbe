import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { join } from 'path';
import { QueueModule } from '../queue.module';
import { QueueDashboardController } from './queue-dashboard.controller';
import { QueueDashboardGateway } from './queue-dashboard.gateway';
import { AuthModule } from '../../auth/auth.module';
import * as express from 'express';

@Module({
  imports: [
    QueueModule,
    AuthModule,
  ],
  controllers: [QueueDashboardController],
  providers: [QueueDashboardGateway],
})
export class QueueDashboardModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        express.static(join(__dirname, 'public'), {
          index: false,
        }),
      )
      .forRoutes('/queue-dashboard/*');
  }
}
