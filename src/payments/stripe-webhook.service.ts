import { Injectable, Logger } from '@nestjs/common';
import { HasuraService } from '../hasura/hasura.service';
import Stripe from 'stripe';

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);

  constructor(private readonly hasuraService: HasuraService) {}

  async handleSubscriptionCreated(subscription: Stripe.Subscription) {
    try {
      const { customer, status, items } = subscription;
      const priceId = items.data[0]?.price.id;

      const createSubscriptionMutation = `
        mutation CreateSubscription($subscription: subscriptions_insert_input!) {
          insert_subscriptions_one(object: $subscription) {
            id
          }
        }
      `;

      await this.hasuraService.executeQuery(createSubscriptionMutation, {
        subscription: {
          stripe_subscription_id: subscription.id,
          stripe_customer_id: typeof customer === 'string' ? customer : customer.id,
          status,
          price_id: priceId,
        },
      });

      this.logger.log(`Subscription created: ${subscription.id}`);
      return { status: 'success', type: 'subscription.created' };
    } catch (error) {
      this.logger.error(
        `Error handling subscription creation: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    try {
      const { status } = subscription;

      const updateSubscriptionMutation = `
        mutation UpdateSubscription($id: String!, $status: String!) {
          update_subscriptions(
            where: { stripe_subscription_id: { _eq: $id } }
            _set: { status: $status }
          ) {
            affected_rows
          }
        }
      `;

      await this.hasuraService.executeQuery(updateSubscriptionMutation, {
        id: subscription.id,
        status,
      });

      this.logger.log(`Subscription updated: ${subscription.id}`);
      return { status: 'success', type: 'subscription.updated' };
    } catch (error) {
      this.logger.error(
        `Error handling subscription update: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    try {
      const updateSubscriptionMutation = `
        mutation UpdateSubscription($id: String!) {
          update_subscriptions(
            where: { stripe_subscription_id: { _eq: $id } }
            _set: { status: "canceled" }
          ) {
            affected_rows
          }
        }
      `;

      await this.hasuraService.executeQuery(updateSubscriptionMutation, {
        id: subscription.id,
      });

      this.logger.log(`Subscription deleted: ${subscription.id}`);
      return { status: 'success', type: 'subscription.deleted' };
    } catch (error) {
      this.logger.error(
        `Error handling subscription deletion: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    try {
      const updatePaymentMutation = `
        mutation UpdatePayment($id: String!) {
          update_payments(
            where: { stripe_payment_intent_id: { _eq: $id } }
            _set: { status: "succeeded" }
          ) {
            affected_rows
          }
        }
      `;

      await this.hasuraService.executeQuery(updatePaymentMutation, {
        id: paymentIntent.id,
      });

      this.logger.log(`Payment succeeded: ${paymentIntent.id}`);
      return { status: 'success', type: 'payment.succeeded' };
    } catch (error) {
      this.logger.error(
        `Error handling payment success: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    try {
      const updatePaymentMutation = `
        mutation UpdatePayment($id: String!) {
          update_payments(
            where: { stripe_payment_intent_id: { _eq: $id } }
            _set: { status: "failed" }
          ) {
            affected_rows
          }
        }
      `;

      await this.hasuraService.executeQuery(updatePaymentMutation, {
        id: paymentIntent.id,
      });

      this.logger.log(`Payment failed: ${paymentIntent.id}`);
      return { status: 'success', type: 'payment.failed' };
    } catch (error) {
      this.logger.error(
        `Error handling payment failure: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}