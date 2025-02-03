import {
  Controller,
  Post,
  Body,
  Headers,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { ConfigService } from '@nestjs/config';
import { Webhook } from 'svix';
import { Public } from 'src/decorators/public.decorator';

interface ClerkUserCreatedEvent {
  data: {
    id: string;
    email_addresses: Array<{
      email_address: string;
      id: string;
      verification: {
        status: string;
      };
    }>;
    primary_email_address_id: string;
    image_url: string;
  };
  type: string;
}

@Controller('webhooks')
export class ClerkWebhookController {
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('clerk')
  async handleWebhook(
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
    @Body() payload: ClerkUserCreatedEvent,
  ) {
    // Verify webhook signature
    const webhookSecret = this.configService.get<string>(
      'CLERK_WEBHOOK_SECRET',
    );
    if (!webhookSecret) {
      throw new Error('CLERK_WEBHOOK_SECRET is not configured');
    }

    const wh = new Webhook(webhookSecret);
    try {
      wh.verify(JSON.stringify(payload), {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      });
    } catch (err) {
      throw new HttpException(
        'Invalid webhook signature',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Only handle user.created events
    if (payload.type !== 'user.created') {
      return { success: true };
    }

    // Find primary email
    const primaryEmail = payload.data.email_addresses.find(
      (email) => email.id === payload.data.primary_email_address_id,
    );

    if (!primaryEmail) {
      throw new HttpException('No primary email found', HttpStatus.BAD_REQUEST);
    }

    // Create user in our database with additional Clerk data
    try {
      const user = await this.usersService.createUser(
        payload.data.id,
        primaryEmail.email_address,
      );

      // Update additional user data
      await this.usersService.updateMetadata(payload.data.id, {
        clerk_image_url: payload.data.image_url,
        email_verified: primaryEmail.verification?.status === 'verified',
      });

      return { success: true, user };
    } catch (error) {
      throw new HttpException(
        'Failed to create user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
