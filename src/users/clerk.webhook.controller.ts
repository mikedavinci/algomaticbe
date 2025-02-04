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

interface ClerkEmailData {
  body: string;
  body_plain: string;
  data: {
    app: {
      domain_name: string;
      logo_image_url: string;
      logo_url: string | null;
      name: string;
      url: string;
    };
    otp_code: string;
    requested_at: string;
    requested_by: string;
    requested_from: string;
    theme: {
      button_text_color: string;
      primary_color: string;
      show_clerk_branding: boolean;
    };
    user: {
      public_metadata: any;
      public_metadata_fallback: string;
    };
  };
  delivered_by_clerk: boolean;
  email_address_id: string;
  from_email_name: string;
  id: string;
  object: 'email';
  reply_to_email_name: string | null;
  slug: string;
  status: string;
  subject: string;
  to_email_address: string;
  user_id: string | null;
}

interface ClerkUserData {
  id: string;
  email_addresses: Array<{
    id: string;
    email_address: string;
    verified: boolean;
  }>;
  primary_email_address_id: string;
  image_url: string | null;
}

interface ClerkWebhookEvent {
  data: ClerkEmailData | ClerkUserData;
  event_attributes: {
    http_request: {
      client_ip: string;
      user_agent: string;
    };
  };
  http_request: {
    client_ip: string;
    user_agent: string;
  };
  client_ip: string;
  user_agent: string;
  object: 'event';
  timestamp: number;
  type: string;
}

@Controller('webhooks')
export class ClerkWebhookController {
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly otpService: OtpService,
  ) {}

  @Public()
  @Post('clerk')
  async handleWebhook(
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
    @Headers('content-type') contentType: string,
    @Body() payload: ClerkWebhookEvent,
    @Req() request: any,
  ) {
    console.log('Received webhook request:', {
      headers: {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
        'content-type': contentType
      }
    });

    if (!payload) {
      console.error('No payload received in webhook request');
      throw new HttpException(
        'No payload received',
        HttpStatus.BAD_REQUEST,
      );
    }

    console.log('Received webhook payload:', {
      type: payload.type,
      emailId: (payload.data as ClerkEmailData)?.id,
      to: (payload.data as ClerkEmailData)?.to_email_address,
      subject: (payload.data as ClerkEmailData)?.subject
    });

    // Verify webhook signature
    const webhookSecret = this.configService.get<string>(
      'CLERK_WEBHOOK_SECRET',
    );
    if (!webhookSecret) {
      throw new Error('CLERK_WEBHOOK_SECRET is not configured');
    }

    console.log('Webhook verification attempt:', {
      secret: `${webhookSecret.substring(0, 5)}...`,
      headers: {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }
    });

    const wh = new Webhook(webhookSecret);
    try {
      // Use the raw body buffer for verification
      const rawBody = request.rawBody;
      if (!rawBody) {
        throw new Error('No raw body available for verification');
      }

      wh.verify(rawBody.toString(), {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      });
    } catch (err) {
      console.error('Webhook verification failed:', {
        error: err.message,
        stack: err.stack,
        timestamp: new Date(parseInt(svixTimestamp) * 1000).toISOString(),
      });
      
      throw new HttpException(
        'Invalid webhook signature',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Handle different event types
    if (payload.type === 'user.created') {
      console.log('Received user.created event:', {
        type: payload.type,
        data: payload.data
      });

      try {
        const userData = payload.data as ClerkUserData;
        const primaryEmail = userData.email_addresses.find(
          email => email.id === userData.primary_email_address_id
        );

        if (!primaryEmail) {
          throw new Error('No primary email found for user');
        }

        const newUser = await this.usersService.createUser(
          userData.id,
          primaryEmail.email_address
        );

        console.log('Successfully created user:', {
          userId: newUser.id,
          email: newUser.email,
          stripeCustomerId: newUser.stripe_customer_id
        });

        return { success: true };
      } catch (error) {
        console.error('Failed to create user:', {
          error: error.message,
          stack: error.stack,
          data: payload.data
        });
        throw new HttpException(
          'Failed to create user',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }

    // Handle email.created events
    if (payload.type === 'email.created') {
      const emailData = payload.data as ClerkEmailData;
      console.log('Processing email event:', {
        type: 'email.created',
        emailId: emailData.id,
        to: emailData.to_email_address,
        status: emailData.status,
        otp: emailData.data.otp_code
      });

      // Store the OTP code in Redis
      await this.otpService.storeOtp(
        emailData.id,
        emailData.data.otp_code
      );

      return { 
        success: true,
        message: `Successfully stored OTP for email ${emailData.id}`
      };
    } else {
      console.log('Ignoring non-email.created event:', payload.type);
      return { success: true };
    }
  }
}
