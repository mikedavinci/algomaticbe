import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateSubscriptionDto {
  @IsString()
  priceId: string;

  @IsString()
  customerId: string;

  @IsOptional()
  @IsString()
  paymentMethodId?: string;
}

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsString()
  priceId?: string;

  @IsOptional()
  @IsBoolean()
  cancelAtPeriodEnd?: boolean;
}

export class PauseSubscriptionDto {
  @IsString()
  subscriptionId: string;

  @IsOptional()
  @IsString()
  resumeAt?: string;
}