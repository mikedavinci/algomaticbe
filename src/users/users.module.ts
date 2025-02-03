import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { UsersService } from './users.service';
import { StripeService } from '../payments/stripe.service';
import { ConfigModule } from '@nestjs/config';
import { HasuraModule } from '../hasura/hasura.module';
import { ClerkWebhookController } from './clerk.webhook.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User]), ConfigModule, HasuraModule],
  providers: [UsersService, StripeService],
  exports: [UsersService],
  controllers: [ClerkWebhookController],
})
export class UsersModule {}