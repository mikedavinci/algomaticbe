import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { StripeService } from '../payments/stripe.service';
import { HasuraService } from '../hasura/hasura.service';

interface CreateUserOptions {
  emailVerified?: boolean;
  imageUrl?: string;
  createStripeCustomer?: boolean;
  metadata?: any;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @Inject(forwardRef(() => StripeService))
    private readonly stripeService: StripeService,
    @Inject(forwardRef(() => HasuraService))
    private readonly hasuraService: HasuraService,
  ) {}

  async createUser(
    id: string,
    email: string,
    options: CreateUserOptions = { createStripeCustomer: true }
  ): Promise<User> {
    this.logger.log('Starting user creation:', { id, email, options });

    try {
      // Create Stripe customer if needed
      let stripeCustomerId: string | undefined;
      if (options.createStripeCustomer) {
        try {
          stripeCustomerId = await this.stripeService.createCustomer(id, email);
          this.logger.log('Created Stripe customer:', { stripeCustomerId });
        } catch (stripeError) {
          this.logger.error('Failed to create Stripe customer:', stripeError);
          throw new Error(`Stripe customer creation failed: ${stripeError.message}`);
        }
      }

      // Create user in database
      try {
        const user = this.usersRepository.create({
          id,
          email,
          email_verified: options.emailVerified,
          clerk_image_url: options.imageUrl,
          stripe_customer_id: stripeCustomerId,
          metadata: options.metadata,
        });

        this.logger.log('Created user entity:', user);

        const savedUser = await this.usersRepository.save(user);
        this.logger.log('Saved user to database:', savedUser);

        return savedUser;
      } catch (dbError) {
        // If database save fails and we created a Stripe customer, clean it up
        if (stripeCustomerId) {
          try {
            await this.stripeService.deleteCustomer(stripeCustomerId);
            this.logger.log('Cleaned up Stripe customer after database error');
          } catch (cleanupError) {
            this.logger.error('Failed to clean up Stripe customer:', cleanupError);
          }
        }
        this.logger.error('Failed to save user to database:', dbError);
        throw new Error(`Database save failed: ${dbError.message}`);
      }
    } catch (error) {
      this.logger.error('Failed to create user:', error);
      this.logger.error('Error stack:', error.stack);
      throw error;
    }
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }
}