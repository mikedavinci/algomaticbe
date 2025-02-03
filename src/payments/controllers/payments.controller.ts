import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { StripeService } from '../stripe.service';
import { ClerkAuthGuard } from '../../auth/clerk-auth.guard';
import {
  CreateCheckoutSessionDto,
  CreatePaymentIntentDto,
  RefundPaymentDto,
} from '../dtos/payment.dto';

@Controller('payments')
@UseGuards(ClerkAuthGuard)
export class PaymentsController {
  constructor(private readonly stripeService: StripeService) {}

  @Post('checkout')
  async createCheckoutSession(
    @Body() checkoutDto: CreateCheckoutSessionDto,
    @Req() request: any,
  ) {
    const userId = request.user.id;
    return this.stripeService.createCheckoutSession(userId, checkoutDto);
  }

  @Post('payment-intent')
  async createPaymentIntent(
    @Body() paymentDto: CreatePaymentIntentDto,
    @Req() request: any,
  ) {
    const userId = request.user.id;
    return this.stripeService.createPaymentIntent(
      paymentDto.amount,
      paymentDto.currency,
      paymentDto.customerId,
    );
  }

  @Post('refund')
  async refundPayment(@Body() refundDto: RefundPaymentDto) {
    if (!refundDto.paymentIntentId) {
      throw new BadRequestException('Payment intent ID is required');
    }
    return this.stripeService.refundPayment(
      refundDto.paymentIntentId,
      refundDto.amount,
      refundDto.reason,
    );
  }
}