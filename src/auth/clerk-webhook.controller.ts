import { Controller, Post, Headers, Body, UnauthorizedException } from '@nestjs/common';
import { ClerkWebhookService } from './clerk-webhook.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Controller('webhooks/clerk')
export class ClerkWebhookController {
  constructor(
    private readonly webhookService: ClerkWebhookService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  async handleWebhook(
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
    @Body() payload: any,
  ) {
    // Verify webhook signature
    const isValid = this.verifyWebhookSignature(
      svixId,
      svixTimestamp,
      svixSignature,
      payload,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const { type, data } = payload;

    switch (type) {
      case 'user.created':
        return this.webhookService.handleUserCreated(data);
      case 'user.updated':
        return this.webhookService.handleUserUpdated(data);
      case 'user.deleted':
        return this.webhookService.handleUserDeleted(data);
      default:
        return { status: 'ignored', type };
    }
  }

  private verifyWebhookSignature(
    svixId: string,
    svixTimestamp: string,
    svixSignature: string,
    payload: any,
  ): boolean {
    const webhookSecret = this.configService.get<string>('CLERK_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new Error('CLERK_WEBHOOK_SECRET is not configured');
    }

    const payloadString = JSON.stringify(payload);
    const timestamp = parseInt(svixTimestamp);

    // Construct the signature payload
    const signaturePayload = `${svixId}.${timestamp}.${payloadString}`;

    // Get the signature from the header
    const signatures = svixSignature.split(' ');
    const providedSignature = signatures[signatures.length - 1];

    // Calculate expected signature
    const hmac = crypto.createHmac('sha256', webhookSecret);
    hmac.update(signaturePayload);
    const expectedSignature = hmac.digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(providedSignature),
      Buffer.from(expectedSignature),
    );
  }
}