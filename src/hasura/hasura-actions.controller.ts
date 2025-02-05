import { Body, Controller, Post, Inject, forwardRef } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { Public } from '../decorators/public.decorator';
import { User } from '../entities/user.entity';

interface CreateUserActionPayload {
  input: {
    id: string;
    email: string;
    emailVerified?: boolean;
    imageUrl?: string;
    createStripeCustomer?: boolean;
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
    try {
      const { id, email, emailVerified, imageUrl, createStripeCustomer } = payload.input;

      const user = await this.usersService.createUser(id, email, {
        emailVerified,
        imageUrl,
        createStripeCustomer,
      });

      // Format response to match Hasura custom type
      const response: UserResponse = {
        id: user.id,
        email: user.email,
        email_verified: user.email_verified,
        clerk_image_url: user.clerk_image_url,
        stripe_customer_id: user.stripe_customer_id,
        created_at: user.created_at.toISOString(),
        updated_at: user.updated_at.toISOString(),
      };

      return response;
    } catch (error) {
      console.error('Error in create user action:', error);
      throw error; // Let Hasura handle the error response
    }
  }
}
