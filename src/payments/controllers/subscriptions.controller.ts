import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Param,
  Patch,
} from '@nestjs/common';
import { StripeService } from '../stripe.service';
import { ClerkAuthGuard } from '../../auth/auth.guard';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  PauseSubscriptionDto,
} from '../dtos/subscription.dto';

@Controller('subscriptions')
@UseGuards(ClerkAuthGuard)
export class SubscriptionsController {
  constructor(private readonly stripeService: StripeService) {}

  @Post()
  async createSubscription(
    @Body() subscriptionDto: CreateSubscriptionDto,
    @Req() request: any,
  ) {
    const userId = request.user.id;
    return this.stripeService.createSubscription(
      subscriptionDto.customerId,
      subscriptionDto.priceId,
    );
  }

  @Patch(':id')
  async updateSubscription(
    @Param('id') id: string,
    @Body() updateDto: UpdateSubscriptionDto,
  ) {
    return this.stripeService.updateSubscription(id, updateDto);
  }

  @Post(':id/pause')
  async pauseSubscription(
    @Param('id') id: string,
    @Body() pauseDto: PauseSubscriptionDto,
  ) {
    return this.stripeService.pauseSubscription(id, pauseDto.resumeAt);
  }

  @Post(':id/resume')
  async resumeSubscription(@Param('id') id: string) {
    return this.stripeService.resumeSubscription(id);
  }
}