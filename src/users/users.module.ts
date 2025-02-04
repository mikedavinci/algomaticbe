import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { UsersService } from './users.service';
import { ClerkWebhookController } from './clerk.webhook.controller';
import { ConfigModule } from '@nestjs/config';
import { OtpService } from './otp.service';
import { HasuraService } from '../hasura/hasura.service';
import { StripeService } from '../payments/stripe.service';

@Module({
  imports: [TypeOrmModule.forFeature([User]), ConfigModule],
  providers: [UsersService, OtpService, HasuraService, StripeService],
  controllers: [ClerkWebhookController],
  exports: [UsersService],
})
export class UsersModule implements OnModuleInit {
  constructor(private readonly hasuraService: HasuraService) {}

  async onModuleInit() {
    // Track the users table in Hasura
    try {
      await this.hasuraService.trackTable('users');
      console.log('Successfully tracked users table in Hasura');
    } catch (error) {
      console.error('Failed to track users table in Hasura:', error);
    }
  }
}