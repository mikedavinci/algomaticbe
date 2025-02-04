import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HasuraModule } from '../hasura/hasura.module';
import { PassportModule } from '@nestjs/passport';
import { ClerkClientProvider } from 'src/providers/clerk-client.provider';
import { ClerkStrategy } from './clerk.strategy';

@Module({
  imports: [ConfigModule, HasuraModule, PassportModule],
  providers: [ClerkClientProvider, ClerkStrategy],
  exports: [PassportModule],
})
export class AuthModule {}
