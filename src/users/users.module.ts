import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { UsersService } from './users.service';
import { ClerkWebhookController } from './clerk.webhook.controller';
import { OtpService } from './otp.service';
import { StripeService } from '../payments/stripe.service';
import { ConfigModule } from '@nestjs/config';
import { HasuraModule } from '../hasura/hasura.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), ConfigModule, HasuraModule, RedisModule],
  providers: [UsersService, StripeService, OtpService],
  exports: [UsersService, OtpService],
  controllers: [ClerkWebhookController],
})
export class UsersModule {}