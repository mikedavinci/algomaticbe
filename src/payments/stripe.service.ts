import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { HasuraService } from '../hasura/hasura.service';

import { CreateCheckoutSessionDto } from './dtos/payment.dto';
import { UpdateSubscriptionDto } from './dtos/subscription.dto';

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);

  async createCheckoutSession(
    userId: string,
    checkoutDto: CreateCheckoutSessionDto,
  ): Promise<Stripe.Checkout.Session> {
    try {
      return await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: checkoutDto.currency,
              product_data: {
                name: 'Payment',
              },
              unit_amount: checkoutDto.amount,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: checkoutDto.successUrl,
        cancel_url: checkoutDto.cancelUrl,
        customer: checkoutDto.customerId,
        metadata: {
          userId,
        },
      });
    } catch (error) {
      this.logger.error(`Error creating checkout session: ${error.message}`);
      throw error;
    }
  }

  async refundPayment(
    paymentIntentId: string,
    amount?: number,
    reason?: string,
  ): Promise<Stripe.Refund> {
    try {
      return await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount,
        reason: reason as Stripe.RefundCreateParams.Reason,
      });
    } catch (error) {
      this.logger.error(`Error refunding payment: ${error.message}`);
      throw error;
    }
  }

  async updateSubscription(
    subscriptionId: string,
    updateDto: UpdateSubscriptionDto,
  ): Promise<Stripe.Subscription> {
    try {
      const updateParams: Stripe.SubscriptionUpdateParams = {};

      if (updateDto.priceId) {
        updateParams.items = [
          {
            id: subscriptionId,
            price: updateDto.priceId,
          },
        ];
      }

      if (typeof updateDto.cancelAtPeriodEnd === 'boolean') {
        updateParams.cancel_at_period_end = updateDto.cancelAtPeriodEnd;
      }

      return await this.stripe.subscriptions.update(subscriptionId, updateParams);
    } catch (error) {
      this.logger.error(`Error updating subscription: ${error.message}`);
      throw error;
    }
  }

  async pauseSubscription(
    subscriptionId: string,
    resumeAt?: string,
  ): Promise<Stripe.Subscription> {
    try {
      return await this.stripe.subscriptions.update(subscriptionId, {
        pause_collection: {
          behavior: 'mark_uncollectible',
          resumes_at: resumeAt ? Math.floor(new Date(resumeAt).getTime() / 1000) : undefined,
        },
      });
    } catch (error) {
      this.logger.error(`Error pausing subscription: ${error.message}`);
      throw error;
    }
  }

  async resumeSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      return await this.stripe.subscriptions.update(subscriptionId, {
        pause_collection: null,
      });
    } catch (error) {
      this.logger.error(`Error resuming subscription: ${error.message}`);
      throw error;
    }
  }

  constructor(
    private readonly configService: ConfigService,
    private readonly hasuraService: HasuraService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-01-27.acacia',
    });
  }

  async createCustomer(userId: string, email: string): Promise<string> {
    try {
      const customer = await this.stripe.customers.create({
        email,
        metadata: {
          userId,
        },
      });

      const updateUserMutation = `
        mutation UpdateUserStripeCustomer($userId: String!, $customerId: String!) {
          update_users(
            where: { id: { _eq: $userId } }
            _set: { stripe_customer_id: $customerId }
          ) {
            affected_rows
          }
        }
      `;

      await this.hasuraService.executeQuery(updateUserMutation, {
        userId,
        customerId: customer.id,
      });

      return customer.id;
    } catch (error) {
      this.logger.error(`Error creating Stripe customer: ${error.message}`);
      throw error;
    }
  }

  async createSubscription(
    customerId: string,
    priceId: string,
  ): Promise<Stripe.Subscription> {
    try {
      return await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });
    } catch (error) {
      this.logger.error(`Error creating subscription: ${error.message}`);
      throw error;
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      return await this.stripe.subscriptions.cancel(subscriptionId);
    } catch (error) {
      this.logger.error(`Error canceling subscription: ${error.message}`);
      throw error;
    }
  }

  async createPaymentIntent(
    amount: number,
    currency: string,
    customerId: string,
  ): Promise<Stripe.PaymentIntent> {
    try {
      return await this.stripe.paymentIntents.create({
        amount,
        currency,
        customer: customerId,
        automatic_payment_methods: {
          enabled: true,
        },
      });
    } catch (error) {
      this.logger.error(`Error creating payment intent: ${error.message}`);
      throw error;
    }
  }

  async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.retrieve(paymentIntentId);
  }

  async confirmPaymentIntent(paymentIntentId: string, options: Stripe.PaymentIntentConfirmParams): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.confirm(paymentIntentId, options);
  }

  async retrieveCustomer(customerId: string): Promise<Stripe.Response<Stripe.Customer | Stripe.DeletedCustomer>> {
    return this.stripe.customers.retrieve(customerId);
  }

  async constructEventFromPayload(
    payload: string | Buffer,
    signature: string,
  ): Promise<Stripe.Event> {
    try {
      const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
      if (!webhookSecret) {
        throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
      }
      return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      this.logger.error(`Error constructing Stripe event: ${error.message}`);
      throw error;
    }
  }
}