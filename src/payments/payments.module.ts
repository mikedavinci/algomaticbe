import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { HasuraModule } from '../hasura/hasura.module';
import { UsersModule } from '../users/users.module';
import { Payment } from '../entities/payment.entity';
import { StripeService } from './stripe.service';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './controllers/payments.controller';
import { SubscriptionsController } from './controllers/subscriptions.controller';
import { StripeWebhookController } from './stripe-webhook.controller';
import { StripeWebhookService } from './stripe-webhook.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment]),
    ConfigModule,
    HasuraModule,
    UsersModule,
  ],
  controllers: [
    PaymentsController,
    SubscriptionsController,
    StripeWebhookController,
  ],
  providers: [
    StripeService,
    PaymentsService,
    StripeWebhookService,
  ],
  exports: [StripeService, PaymentsService],
})
export class PaymentsModule {}