import {
  Controller,
  Post,
  Headers,
  HttpException,
  HttpStatus,
  Req,
  Body,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { ConfigService } from '@nestjs/config';
import { Webhook } from 'svix';
import { Public } from 'src/decorators/public.decorator';
import { OtpService } from './otp.service';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

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
    verification: {
      status: string;
      strategy: string;
    };
  }>;
  primary_email_address_id: string;
  image_url: string;
  profile_image_url: string;
  first_name: string;
  last_name: string;
  created_at: number;
  updated_at: number;
  private_metadata: Record<string, any>;
  public_metadata: Record<string, any>;
  unsafe_metadata: Record<string, any>;
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
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
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

    // Log ALL incoming webhook events for debugging
    console.log('Webhook event received:', {
      type: payload.type,
      object: payload.object,
      timestamp: new Date(payload.timestamp * 1000).toISOString()
    });

    // Log the raw payload for debugging
    console.log('Raw webhook payload:', JSON.stringify(payload, null, 2));

    console.log('Full webhook payload:', JSON.stringify({
      type: payload.type,
      data: payload.data,
      timestamp: payload.timestamp,
      object: payload.object
    }, null, 2));

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
      console.log('Received user.created webhook:', {
        type: payload.type,
        rawData: JSON.stringify(payload.data, null, 2)
      });

      try {
        const userData = payload.data as ClerkUserData;
        console.log('Processing user data:', {
          id: userData.id,
          emailAddresses: userData.email_addresses,
          primaryEmailId: userData.primary_email_address_id,
          firstName: userData.first_name,
          lastName: userData.last_name
        });

        const primaryEmail = userData.email_addresses?.find(
          email => email.id === userData.primary_email_address_id
        );

        if (!primaryEmail) {
          console.error('No primary email found:', {
            emailAddresses: userData.email_addresses,
            primaryEmailId: userData.primary_email_address_id
          });
          throw new Error('No primary email found for user');
        }

        // Check if email is verified
        const isEmailVerified = primaryEmail.verification?.status === 'verified';

        console.log('Calling UsersService.createUser with:', {
          id: userData.id,
          email: primaryEmail.email_address,
          isEmailVerified
        });

        const newUser = await this.usersService.createUser(
          userData.id,
          primaryEmail.email_address
        );

        // Update additional user fields
        await this.usersRepository.update(userData.id, {
          email_verified: isEmailVerified,
          clerk_image_url: userData.image_url || userData.profile_image_url
        });

        console.log('User creation completed:', {
          userId: newUser.id,
          email: newUser.email,
          stripeCustomerId: newUser.stripe_customer_id,
          isEmailVerified
        });

        return { 
          success: true,
          message: `Successfully created user ${newUser.id}`,
          user: newUser
        };
      } catch (error) {
        console.error('Failed to create user:', {
          error: error.message,
          stack: error.stack,
          data: JSON.stringify(payload.data, null, 2)
        });
        throw new HttpException(
          'Failed to create user: ' + error.message,
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
