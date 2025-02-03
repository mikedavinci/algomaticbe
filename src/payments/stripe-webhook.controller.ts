import { Controller, Post, Headers, Body, RawBodyRequest, Req } from '@nestjs/common';
import { Request } from 'express';
import { StripeWebhookService } from './stripe-webhook.service';
import { StripeService } from './stripe.service';

@Controller('webhooks/stripe')
export class StripeWebhookController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly webhookService: StripeWebhookService,
  ) {}

  @Post()
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: RawBodyRequest<Request> & { rawBody: Buffer },
  ) {
    const payload = request.rawBody;

    const event = await this.stripeService.constructEventFromPayload(
      payload,
      signature,
    );

    switch (event.type) {
      case 'customer.subscription.created':
        return this.webhookService.handleSubscriptionCreated(event.data.object);
      case 'customer.subscription.updated':
        return this.webhookService.handleSubscriptionUpdated(event.data.object);
      case 'customer.subscription.deleted':
        return this.webhookService.handleSubscriptionDeleted(event.data.object);
      case 'payment_intent.succeeded':
        return this.webhookService.handlePaymentSucceeded(event.data.object);
      case 'payment_intent.payment_failed':
        return this.webhookService.handlePaymentFailed(event.data.object);
      default:
        return { status: 'ignored', type: event.type };
    }
  }
}