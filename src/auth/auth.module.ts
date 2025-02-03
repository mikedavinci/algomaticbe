import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HasuraModule } from '../hasura/hasura.module';
import { PassportModule } from '@nestjs/passport';
import { ClerkClientProvider } from 'src/providers/clerk-client.provider';

@Module({
  imports: [ConfigModule, HasuraModule, PassportModule],
  providers: [ClerkClientProvider],
  exports: [PassportModule],
})
export class AuthModule {}
