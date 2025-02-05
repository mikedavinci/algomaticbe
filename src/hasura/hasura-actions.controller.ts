import { Body, Controller, Post, Inject, forwardRef } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { Public } from '../decorators/public.decorator';
import { User } from '../entities/user.entity';

interface CreateUserActionPayload {
  input: {
    id: string;
    email: string;
    emailVerified?: boolean;
    clerkImageUrl?: string;
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
    try {
      const { id, email, emailVerified, clerkImageUrl, metadata } = payload.input;

      const user = await this.usersService.createUser(id, email, {
        emailVerified,
        imageUrl: clerkImageUrl,
        metadata,
      });

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

      return response;
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error; // Let Hasura handle the error response
    }
  }
}
