import { Module, forwardRef } from '@nestjs/common';
import { HasuraService } from './hasura.service';
import { HasuraWebhookController } from './hasura-webhook.controller';
import { HasuraEventProcessor } from './hasura-event.processor';
import { HasuraEventHandlerService } from './hasura-event-handler.service';
import { HasuraActionsController } from './hasura-actions.controller';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({
      name: 'hasura-events',
    }),
    forwardRef(() => UsersModule),
  ],
  controllers: [HasuraWebhookController, HasuraActionsController],
  providers: [HasuraService, HasuraEventProcessor, HasuraEventHandlerService],
  exports: [HasuraService],
})
export class HasuraModule {}