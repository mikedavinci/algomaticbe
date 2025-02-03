import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HasuraModule } from '../hasura/hasura.module';
import { ClerkService } from './clerk.service';
import { ClerkAuthGuard } from './auth.guard';
import { ClerkWebhookController } from './clerk-webhook.controller';
import { ClerkWebhookService } from './clerk-webhook.service';

@Module({
  imports: [ConfigModule, HasuraModule],
  controllers: [ClerkWebhookController],
  providers: [ClerkService, ClerkAuthGuard, ClerkWebhookService],
  exports: [ClerkService, ClerkAuthGuard],
})
export class AuthModule {}