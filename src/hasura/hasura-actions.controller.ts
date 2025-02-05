import { Body, Controller, Post, Inject, forwardRef } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { Public } from '../decorators/public.decorator';
import { User } from '../entities/user.entity';

interface CreateUserActionPayload {
  input: {
    id: string;
    email: string;
    email_verified?: boolean;
    clerk_image_url?: string;
    metadata?: any;
  };
  action: {
    name: string;
  };
}

interface UserResponse {
  id: string;
  email: string;
  email_verified: boolean;
  clerk_image_url?: string;
  stripe_customer_id?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

@Controller('hasura/actions')
export class HasuraActionsController {
  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService
  ) {}

  @Public()
  @Post('create-user')
  async createUser(@Body() payload: CreateUserActionPayload) {
    console.log('Received create user request:', JSON.stringify(payload, null, 2));
    
    try {
      const { id, email, email_verified, clerk_image_url, metadata } = payload.input;

      console.log('Creating user with:', {
        id,
        email,
        email_verified,
        clerk_image_url,
        metadata
      });

      // Create user with TypeORM
      const user = await this.usersService.createUser(id, email, {
        emailVerified: email_verified,
        imageUrl: clerk_image_url,
        metadata,
        createStripeCustomer: true,
      });

      console.log('User created successfully:', user);

      // Format response to match Hasura custom type
      const response: UserResponse = {
        id: user.id,
        email: user.email,
        email_verified: user.email_verified,
        clerk_image_url: user.clerk_image_url,
        stripe_customer_id: user.stripe_customer_id,
        metadata: user.metadata,
        created_at: user.created_at.toISOString(),
        updated_at: user.updated_at.toISOString(),
      };

      console.log('Sending response:', response);
      return response;
    } catch (error) {
      console.error('Failed to create user:', error);
      console.error('Error stack:', error.stack);
      // Rethrow with more context
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }
}
