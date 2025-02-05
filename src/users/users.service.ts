import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { StripeService } from '../payments/stripe.service';
import { HasuraService } from '../hasura/hasura.service';
import { User } from '../entities/user.entity';

@Injectable()
export class UsersService {
  private readonly logger: Logger;

  constructor(
    private readonly stripeService: StripeService,
    private readonly hasuraService: HasuraService,
  ) {
    this.logger = new Logger(UsersService.name);
  }

  async createUser(
    id: string, 
    email: string, 
    options: { 
      emailVerified?: boolean;
      imageUrl?: string;
      createStripeCustomer?: boolean;
    } = { createStripeCustomer: true }
  ): Promise<User> {
    this.logger.log('Starting user creation:', { id, email, options });

    let stripeCustomerId: string | undefined;

    try {
      // Create Stripe customer if needed
      if (options.createStripeCustomer) {
        this.logger.log('Creating Stripe customer...', { id, email });
        try {
          stripeCustomerId = await this.stripeService.createCustomer(id, email);
          this.logger.log('Stripe customer created:', { stripeCustomerId });
        } catch (error) {
          this.logger.error('Failed to create Stripe customer:', error);
          throw error;
        }
      }

      // Create user in database
      const createUserMutation = `
        mutation CreateUser($user: users_insert_input!) {
          insert_users_one(object: $user) {
            id
            email
            email_verified
            clerk_image_url
            stripe_customer_id
            created_at
            updated_at
          }
        }
      `;

      const userInput = {
        id,
        email,
        email_verified: options.emailVerified,
        clerk_image_url: options.imageUrl,
        stripe_customer_id: stripeCustomerId,
      };

      const result = await this.hasuraService.executeQuery(createUserMutation, {
        user: userInput,
      });

      const user = result.insert_users_one;
      if (!user) {
        throw new Error('Failed to create user in database');
      }

      this.logger.log('User created successfully:', user);
      return user;
    } catch (error) {
      // If we created a Stripe customer but failed to create the user,
      // we should clean up the Stripe customer
      if (stripeCustomerId) {
        try {
          await this.stripeService.deleteCustomer(stripeCustomerId);
          this.logger.log('Cleaned up Stripe customer after failed user creation');
        } catch (cleanupError) {
          this.logger.error('Failed to clean up Stripe customer:', cleanupError);
        }
      }
      throw error;
    }
  }

  async updateUserStripeCustomerId(userId: string, customerId: string): Promise<void> {
    const mutation = `
      mutation UpdateUserStripeCustomer($userId: uuid!, $customerId: String!) {
        update_users(
          where: { id: { _eq: $userId } }
          _set: { stripe_customer_id: $customerId }
        ) {
          affected_rows
          returning {
            id
            email
            stripe_customer_id
          }
        }
      }
    `;

    try {
      const result = await this.hasuraService.executeQuery(mutation, {
        userId,
        customerId,
      });

      if (!result?.update_users?.affected_rows) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      this.logger.log('Successfully updated user stripe customer ID:', result.update_users.returning[0]);
    } catch (error) {
      this.logger.error('Error updating user stripe customer ID:', error);
      throw error;
    }
  }

  async findById(id: string): Promise<User | null> {
    const query = `
      query GetUserById($id: uuid!) {
        users_by_pk(id: $id) {
          id
          email
          stripe_customer_id
          metadata
          clerk_image_url
          email_verified
          created_at
          updated_at
        }
      }
    `;

    try {
      const result = await this.hasuraService.executeQuery(query, { id });
      return result?.users_by_pk || null;
    } catch (error) {
      this.logger.error('Error finding user by ID:', error);
      throw error;
    }
  }

  async updateMetadata(id: string, metadata: Record<string, any>): Promise<User> {
    const mutation = `
      mutation UpdateUserMetadata($id: uuid!, $metadata: jsonb!) {
        update_users_by_pk(
          pk_columns: { id: $id }
          _set: { metadata: $metadata }
        ) {
          id
          email
          metadata
          stripe_customer_id
          clerk_image_url
          email_verified
          created_at
          updated_at
        }
      }
    `;

    try {
      const result = await this.hasuraService.executeQuery(mutation, {
        id,
        metadata,
      });

      if (!result?.update_users_by_pk) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      return result.update_users_by_pk;
    } catch (error) {
      this.logger.error('Error updating user metadata:', error);
      throw error;
    }
  }
}