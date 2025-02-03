import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from '../entities/subscription.entity';
import { StripeService } from '../payments/stripe.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionsRepository: Repository<Subscription>,
    private readonly stripeService: StripeService,
    private readonly usersService: UsersService,
  ) {}

  async createSubscription(userId: string, priceId: string): Promise<Subscription> {
    // Get user
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create Stripe subscription
    const stripeSubscription = await this.stripeService.createSubscription(
      user.stripe_customer_id,
      priceId,
    );

    // Create subscription record
    const subscription = this.subscriptionsRepository.create({
      user_id: userId,
      stripe_subscription_id: stripeSubscription.id,
      stripe_price_id: priceId,
      status: stripeSubscription.status,
      current_period_end: new Date(stripeSubscription.current_period_end * 1000),
    });

    return this.subscriptionsRepository.save(subscription);
  }

  async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    return this.subscriptionsRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
  }

  async updateSubscriptionStatus(
    stripeSubscriptionId: string,
    status: string,
  ): Promise<void> {
    await this.subscriptionsRepository.update(
      { stripe_subscription_id: stripeSubscriptionId },
      { status },
    );
  }
}