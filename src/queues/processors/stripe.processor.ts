import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { StripeService } from '../../payments/stripe.service';

@Processor('stripe')
export class StripeProcessor {
  private readonly logger = new Logger(StripeProcessor.name);

  constructor(private readonly stripeService: StripeService) {}

  @Process('retry-payment')
  async handlePaymentRetry(job: Job) {
    try {
      const { paymentIntentId, customerId } = job.data;
      this.logger.log(`Retrying payment for intent ${paymentIntentId}`);

      const paymentIntent = await this.stripeService.retrievePaymentIntent(paymentIntentId);

      if (paymentIntent.status === 'requires_payment_method') {
        // Attempt to charge using customer's default payment method
        await this.stripeService.confirmPaymentIntent(paymentIntentId, {
          payment_method: await this.getDefaultPaymentMethod(customerId),
        });
      }

      this.logger.log(`Payment retry processed for ${paymentIntentId}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to retry payment: ${error.message}`);
      throw error;
    }
  }

  private async getDefaultPaymentMethod(customerId: string): Promise<string | undefined> {
    const customer = await this.stripeService.retrieveCustomer(customerId);
    if (typeof customer === 'string' || customer.deleted) {
      return undefined;
    }
    return customer.default_source?.toString();
  }
}