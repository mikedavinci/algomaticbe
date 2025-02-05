import { Body, Controller, Post } from '@nestjs/common';
import { UsersService } from '../users/users.service';

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

@Controller('hasura/actions')
export class HasuraActionsController {
  constructor(private readonly usersService: UsersService) {}

  @Post('create-user')
  async createUser(@Body() payload: CreateUserActionPayload) {
    try {
      const { id, email, emailVerified, imageUrl, createStripeCustomer } = payload.input;

      const user = await this.usersService.createUser(id, email, {
        emailVerified,
        imageUrl,
        createStripeCustomer,
      });

      return { user };
    } catch (error) {
      console.error('Error in create user action:', error);
      return {
        error: {
          message: error.message,
        },
      };
    }
  }
}
