import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HasuraService } from './hasura.service';
import { HasuraWebhookController } from './hasura-webhook.controller';
import { HasuraEventHandlerService } from './hasura-event-handler.service';
import { BullModule } from '@nestjs/bull';
import { HasuraActionsController } from './hasura-actions.controller';

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({
      name: 'hasura-events',
    }),
  ],
  controllers: [HasuraWebhookController, HasuraActionsController],
  providers: [HasuraService, HasuraEventHandlerService],
  exports: [HasuraService],
})
export class HasuraModule {}