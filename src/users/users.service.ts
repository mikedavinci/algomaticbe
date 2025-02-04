import { Injectable, NotFoundException } from '@nestjs/common';
import { StripeService } from '../payments/stripe.service';
import { HasuraService } from '../hasura/hasura.service';
import { User } from '../entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    private readonly stripeService: StripeService,
    private readonly hasuraService: HasuraService,
  ) {}

  async createUser(
    id: string, 
    email: string, 
    options: { 
      emailVerified?: boolean;
      imageUrl?: string;
      createStripeCustomer?: boolean;
    } = { createStripeCustomer: true }
  ): Promise<User> {
    console.log('Starting user creation in UsersService:', { id, email, options });

    try {
      let stripeCustomerId: string | undefined;
      // note

      // Create Stripe customer if needed
      if (options.createStripeCustomer) {
        console.log('Creating Stripe customer...');
        stripeCustomerId = await this.stripeService.createCustomer(id, email);
        console.log('Stripe customer created successfully:', {
          stripeCustomerId,
        });
      }

      // Create user with all fields at once
      const mutation = `
        mutation CreateUser(
          $id: uuid!, 
          $email: String!, 
          $emailVerified: Boolean,
          $imageUrl: String,
          $stripeCustomerId: String
        ) {
          insert_users_one(object: {
            id: $id,
            email: $email,
            email_verified: $emailVerified,
            clerk_image_url: $imageUrl,
            stripe_customer_id: $stripeCustomerId
          }) {
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

      const result = await this.hasuraService.executeQuery(mutation, {
        id,
        email,
        emailVerified: options.emailVerified ?? false,
        imageUrl: options.imageUrl,
        stripeCustomerId,
      });

      if (!result?.insert_users_one) {
        throw new Error('Failed to create user in database');
      }

      console.log('User created successfully:', result.insert_users_one);
      return result.insert_users_one;
    } catch (error) {
      console.error('Error in createUser:', {
        error: error.message,
        stack: error.stack,
      });
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

      console.log('Successfully updated user stripe customer ID:', result.update_users.returning[0]);
    } catch (error) {
      console.error('Error updating user stripe customer ID:', error);
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
      console.error('Error finding user by ID:', error);
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
      console.error('Error updating user metadata:', error);
      throw error;
    }
  }
}