import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HasuraModule } from '../hasura/hasura.module';
import { PaymentsModule } from '../payments/payments.module';
import { EmailProcessor } from './processors/email.processor';
import { StripeProcessor } from './processors/stripe.processor';
import { HasuraProcessor } from './processors/hasura.processor';
import { AnalyticsProcessor } from './processors/analytics.processor';
import { CleanupProcessor } from './processors/cleanup.processor';
import { QueueService } from './queue.service';
import { QueueEventEmitter } from './notifications/queue-event.emitter';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
          password: configService.get('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    HasuraModule,
    PaymentsModule,
    BullModule.registerQueue(
      {
        name: 'email',
      },
      {
        name: 'stripe',
      },
      {
        name: 'hasura',
      },
      {
        name: 'analytics',
      },
      {
        name: 'cleanup',
      },
    ),
  ],
  providers: [
    QueueService,
    EmailProcessor,
    StripeProcessor,
    HasuraProcessor,
    AnalyticsProcessor,
    CleanupProcessor,
    QueueEventEmitter,
  ],
  exports: [QueueService, QueueEventEmitter],
})
export class QueueModule {}