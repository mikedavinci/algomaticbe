import { Module, OnModuleInit, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { UsersService } from './users.service';
import { ClerkWebhookController } from './clerk.webhook.controller';
import { ConfigModule } from '@nestjs/config';
import { OtpService } from './otp.service';
import { StripeService } from '../payments/stripe.service';
import { RedisModule } from '../redis/redis.module';
import { HasuraModule } from '../hasura/hasura.module';
import { HasuraService } from '../hasura/hasura.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]), 
    ConfigModule,
    RedisModule,
    forwardRef(() => HasuraModule),
  ],
  providers: [UsersService, OtpService, StripeService],
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