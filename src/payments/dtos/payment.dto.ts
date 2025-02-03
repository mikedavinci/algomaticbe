import { IsString, IsNumber, IsOptional, Min, IsEnum } from 'class-validator';

export enum Currency {
  USD = 'usd',
  EUR = 'eur',
  GBP = 'gbp',
}

export class CreateCheckoutSessionDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsEnum(Currency)
  currency: Currency;

  @IsString()
  successUrl: string;

  @IsString()
  cancelUrl: string;

  @IsOptional()
  @IsString()
  customerId?: string;
}

export class CreatePaymentIntentDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsEnum(Currency)
  currency: Currency;

  @IsString()
  customerId: string;
}

export class RefundPaymentDto {
  @IsString()
  paymentIntentId: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  amount?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}