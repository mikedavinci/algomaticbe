import {
  Controller,
  Post,
  Headers,
  HttpException,
  HttpStatus,
  Req,
  Body,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { ConfigService } from '@nestjs/config';
import { Webhook } from 'svix';
import { Public } from 'src/decorators/public.decorator';
import { OtpService } from './otp.service';

interface ClerkUserData {
  id: string;
  email_addresses: Array<{
    id: string;
    email_address: string;
    verification: {
      status: string;
      strategy: string;
    };
  }>;
  primary_email_address_id: string;
  image_url: string;
  profile_image_url: string;
}

interface ClerkEmailData {
  id: string;
  status: string;
  type: string;
  data: {
    otp_code: string;
  };
  email_address_id: string;
}

@Controller('webhook/clerk')
export class ClerkWebhookController {
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly otpService: OtpService,
  ) {}

  @Public()
  @Post()
  async handleWebhook(
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
    @Headers('content-type') contentType: string,
    @Body() payload: any,
    @Req() request: any,
  ) {
    console.log('Received Clerk webhook:', {
      svixId,
      svixTimestamp,
      eventType: payload.type,
      payload,
    });

    if (!svixId || !svixTimestamp || !svixSignature) {
      throw new HttpException(
        'Missing webhook verification headers',
        HttpStatus.BAD_REQUEST,
      );
    }

    const webhookSecret = this.configService.get<string>('CLERK_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new HttpException(
        'Webhook secret not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // Verify webhook signature
    const wh = new Webhook(webhookSecret);
    let evt: any;

    try {
      evt = wh.verify(
        JSON.stringify(payload),
        {
          'svix-id': svixId,
          'svix-timestamp': svixTimestamp,
          'svix-signature': svixSignature,
        },
      );
    } catch (err) {
      console.error('Webhook verification failed:', err);
      throw new HttpException(
        'Invalid webhook signature',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Handle different webhook events
    try {
      switch (payload.type) {
        case 'user.created':
          await this.handleUserCreated(payload.data);
          break;
        case 'email.created':
          await this.handleEmailCreated(payload.data);
          break;
        default:
          console.log('Unhandled webhook event type:', payload.type);
      }

      return { received: true };
    } catch (error) {
      console.error('Error processing webhook:', error);
      throw new HttpException(
        `Failed to process webhook: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async handleUserCreated(data: ClerkUserData) {
    console.log('Processing user.created event:', data);
    try {
      const primaryEmail = data.email_addresses?.find(
        (email) => email.id === data.primary_email_address_id,
      );

      if (!primaryEmail) {
        throw new Error('No primary email found for user');
      }

      const isEmailVerified = primaryEmail.verification?.status === 'verified';
      const imageUrl = data.image_url || data.profile_image_url;

      console.log('Creating user with:', {
        id: data.id,
        email: primaryEmail.email_address,
        isEmailVerified,
        imageUrl,
      });

      // Create user with all fields using UsersService
      const user = await this.usersService.createUser(
        data.id,
        primaryEmail.email_address,
        {
          emailVerified: isEmailVerified,
          imageUrl: imageUrl,
          createStripeCustomer: true,
        }
      );

      console.log('User creation completed:', user);

      return {
        success: true,
        message: `Successfully created user ${data.id}`,
        user,
      };
    } catch (error) {
      console.error('Failed to create user:', error);
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  private async handleEmailCreated(data: ClerkEmailData) {
    console.log('Processing email.created event:', data);
    try {
      if (data.status === 'delivered' && data.type === 'email_verification') {
        const otp = data.data?.otp_code;
        const emailId = data.email_address_id;

        if (otp && emailId) {
          await this.otpService.storeOtp(emailId, otp);
          console.log('Stored OTP for email verification');
        }
      }
    } catch (error) {
      console.error('Failed to process email event:', error);
      throw new Error(`Failed to process email event: ${error.message}`);
    }
  }
}
