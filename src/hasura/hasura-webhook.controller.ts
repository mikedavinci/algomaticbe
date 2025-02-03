import { Controller, Post, Body, Headers } from '@nestjs/common';
import { HasuraEventHandlerService } from './hasura-event-handler.service';

@Controller('webhooks/hasura')
export class HasuraWebhookController {
  constructor(private readonly eventHandler: HasuraEventHandlerService) {}

  @Post('events')
  async handleEvent(
    @Headers('x-hasura-event-id') eventId: string,
    @Headers('x-hasura-delivery-id') deliveryId: string,
    @Body() payload: any,
  ) {
    return this.eventHandler.handleEvent(eventId, deliveryId, payload);
  }
}