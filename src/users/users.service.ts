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
        stripeCustomerId = await this.stripeService.createCustomer(id, email);
        this.logger.log('Created Stripe customer:', { stripeCustomerId });
      }

      // Create user in database
      const user = this.usersRepository.create({
        id,
        email,
        email_verified: options.emailVerified,
        clerk_image_url: options.imageUrl,
        stripe_customer_id: stripeCustomerId,
        metadata: options.metadata,
      });

      await this.usersRepository.save(user);
      this.logger.log('Saved user to database:', { userId: user.id });

      return user;
    } catch (error) {
      this.logger.error('Failed to create user:', error);
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