import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { StripeService } from '../payments/stripe.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly stripeService: StripeService,
  ) {}

  async createUser(id: string, email: string): Promise<User> {
    console.log('Starting user creation process:', { id, email });

    try {
      // Create Stripe customer
      console.log('Creating Stripe customer...');
      const stripeCustomerId = await this.stripeService.createCustomer(id, email);
      console.log('Stripe customer created:', { stripeCustomerId });

      // Create user with Stripe customer ID
      console.log('Creating user in database...');
      const user = this.usersRepository.create({
        id,
        email,
        stripe_customer_id: stripeCustomerId,
      });

      console.log('Saving user to database:', user);
      const savedUser = await this.usersRepository.save(user);
      console.log('User saved successfully:', savedUser);

      return savedUser;
    } catch (error) {
      console.error('Error in createUser:', {
        error: error.message,
        stack: error.stack,
        id,
        email
      });
      throw error;
    }
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async updateMetadata(id: string, metadata: Record<string, any>): Promise<User> {
    await this.usersRepository.update(id, { metadata });
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }
}