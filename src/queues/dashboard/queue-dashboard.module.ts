import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { QueueModule } from '../queue.module';
import { QueueDashboardController } from './queue-dashboard.controller';
import { QueueDashboardGateway } from './queue-dashboard.gateway';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [
    QueueModule,
    AuthModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, 'public'),
      serveRoot: '/queue-dashboard',
      serveStaticOptions: {
        index: false,
      },
    }),
  ],
  controllers: [QueueDashboardController],
  providers: [QueueDashboardGateway],
})
export class QueueDashboardModule {}
