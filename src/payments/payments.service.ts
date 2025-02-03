import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '../entities/payment.entity';
import { StripeService } from './stripe.service';
import { UsersService } from '../users/users.service';
import { Currency } from './dtos/payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    private readonly stripeService: StripeService,
    private readonly usersService: UsersService,
  ) {}

  async createPayment(
    userId: string,
    amount: number,
    currency: Currency,
  ): Promise<Payment> {
    // Get user
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create Stripe payment intent
    const paymentIntent = await this.stripeService.createPaymentIntent(
      amount,
      currency,
      user.stripe_customer_id,
    );

    // Create payment record
    const payment = this.paymentsRepository.create({
      user_id: userId,
      stripe_payment_intent_id: paymentIntent.id,
      amount,
      currency,
      status: paymentIntent.status,
    });

    return this.paymentsRepository.save(payment);
  }

  async getUserPayments(userId: string): Promise<Payment[]> {
    return this.paymentsRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
  }

  async updatePaymentStatus(
    paymentIntentId: string,
    status: string,
  ): Promise<void> {
    await this.paymentsRepository.update(
      { stripe_payment_intent_id: paymentIntentId },
      { status },
    );
  }
}